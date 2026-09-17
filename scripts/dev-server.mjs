// Local development server: serves public/ and runs api/chat.ts exactly as Vercel would
// (Web-standard Request/Response). No Vercel account, no API key.
//
//   npm run dev                      -> extractive answers (same as the deployed site)
//   OLLAMA_URL=http://localhost:11434 npm run dev
//                                    -> answers written by a local model through Ollama
//   OLLAMA_MODEL=qwen2.5:3b ...       -> choose the local model (default llama3.2)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const port = Number(process.env.PORT ?? 5173);

const chat = await import(pathToFileURL(join(root, ".dev/api/chat.js")).href);

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".pdf": "application/pdf", ".json": "application/json", ".png": "image/png",
};

async function handleApi(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
  });
  const handler = chat[req.method];
  const response = handler ? await handler(request) : new Response("Method not allowed", { status: 405 });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  const reader = response.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

async function handleStatic(req, res) {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(pub, path));
  if (!file.startsWith(pub)) { res.writeHead(403); return res.end(); }
  try {
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(302, { location: path + "/" }); return res.end(); }
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    if (path.startsWith("/_vercel/")) { res.writeHead(204); return res.end(); }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
}

http
  .createServer((req, res) => {
    const run = req.url.startsWith("/api/chat") ? handleApi : handleStatic;
    run(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end("Server error");
    });
  })
  .listen(port, () => {
    const mode = process.env.OLLAMA_URL ? `local model via Ollama (${process.env.OLLAMA_MODEL ?? "llama3.2"})` : "extractive (no model)";
    console.log(`\n  Portfolio running at http://localhost:${port}\n  Ask Abhigna AI mode: ${mode}\n`);
  });
