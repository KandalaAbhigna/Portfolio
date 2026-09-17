// POST /api/chat
// Ask Abhigna AI: BM25 retrieval over the knowledge base, then an answer that needs no API key.
//   - Deployed (default): extractive answer quoted from the retrieved sections.
//   - Local with Ollama:   set OLLAMA_URL (e.g. http://localhost:11434) to use a local model.
// Named POST export = Vercel's Web-standard handler signature (Request in, Response out).
import knowledge from "./_knowledge.js";
import { retrieve } from "./_retrieval.js";
import { composeExtractive, isPersonal, MIN_TOP_SCORE, streamOllama } from "./_answer.js";

export const maxDuration = 30;

const MAX_TURNS = 8;
const MAX_MESSAGE_CHARS = 600;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const buckets = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (buckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  buckets.set(ip, hits);
  return hits.length > RATE_MAX;
}

const sse = (obj: unknown): string => `data: ${JSON.stringify(obj)}\n\n`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function GET(): Promise<Response> {
  const mode = process.env.OLLAMA_URL ? `ollama:${process.env.OLLAMA_MODEL ?? "llama3.2"}` : "extractive";
  return json(200, { ok: true, mode, sections: knowledge.chunks.length, builtAt: knowledge.builtAt });
}

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return json(429, { error: "Too many requests. Please try again in a few minutes." });

  let body: { messages?: Turn[] };
  try {
    body = (await req.json()) as { messages?: Turn[] };
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_TURNS);

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return json(400, { error: "The last message must be from the user." });
  }
  const question = last.content.trim();

  // Short follow-ups ("what about testing?") borrow context from the previous question.
  const prevUser = [...messages].reverse().find((m, i) => i > 0 && m.role === "user");
  const query = prevUser && question.split(/\s+/).length < 6 ? `${question} ${prevUser.content}` : question;
  const hits = retrieve(knowledge.chunks, query, 5);
  const grounded = hits.length > 0 && hits[0].score >= MIN_TOP_SCORE && !isPersonal(question);

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3.2";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(sse(obj)));
      let mode = "extractive";
      try {
        if (ollamaUrl && grounded) {
          try {
            mode = `ollama:${ollamaModel}`;
            const context = hits.filter((h) => !h.title.startsWith("Visa, salary") && h.score >= hits[0].score * 0.5);
            const firstPiece = streamOllama(ollamaUrl, ollamaModel, question, context);
            const first = await firstPiece.next(); // fail fast (and fall back) before sending anything
            send({ type: "meta", mode, sources: context.filter((h, i, all) => all.findIndex((x) => x.title === h.title) === i).map((h) => ({ id: h.id, title: h.title, score: Number(h.score.toFixed(2)) })) });
            if (!first.done) send({ type: "text", text: first.value });
            for await (const piece of firstPiece) send({ type: "text", text: piece });
            send({ type: "done" });
            return;
          } catch (err) {
            console.warn(`Ollama unavailable at ${ollamaUrl} (${err instanceof Error ? err.message : err}); using extractive mode.`);
            mode = "extractive";
          }
        }

        const { text: answer, titles } = composeExtractive(question, hits);
        const cited = hits.filter((h, i, all) => titles.includes(h.title) && all.findIndex((x) => x.title === h.title) === i);
        send({ type: "meta", mode, sources: cited.map((h) => ({ id: h.id, title: h.title, score: Number(h.score.toFixed(2)) })) });
        // Emit in word groups so the client renders progressively, same as a model stream.
        const words = answer.split(/(?<= )/);
        for (let i = 0; i < words.length; i += 6) send({ type: "text", text: words.slice(i, i + 6).join("") });
        send({ type: "done" });
      } catch (err) {
        console.error("chat error", err);
        send({ type: "error", error: "Something went wrong. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
