// Prints the assistant's answer to a fixed set of questions, straight from the API handler.
// Use it after editing src/data/knowledge.md to check nothing regressed: npm run test:answers
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { POST } = await import(pathToFileURL(resolve(root, ".dev/api/chat.js")).href);

const questions = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "What did she own on T20 Predictor?",
      "How does this assistant work?",
      "What was the hardest production bug she fixed?",
      "What testing and CI/CD has she set up?",
      "When is she available to start?",
      "Does she know Kubernetes?",
      "Where did she study and what is her GPA?",
      "Has she led or mentored other engineers?",
      "What did she do at Savart?",
      "Does she need visa sponsorship?",
      "What is her favorite pizza topping?",
    ];

let i = 0;
for (const q of questions) {
  i += 1;
  const res = await POST(new Request("http://local/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `test-${i}` },
    body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
  }));
  const raw = await res.text();
  let text = "", meta = null;
  for (const evt of raw.split("\n\n")) {
    if (!evt.startsWith("data:")) continue;
    const p = JSON.parse(evt.slice(5));
    if (p.type === "meta") meta = p;
    if (p.type === "text") text += p.text;
    if (p.type === "error") text += `[error: ${p.error}]`;
  }
  const cites = meta?.sources?.map((s) => s.title.split(":")[0]).filter((v, j, a) => a.indexOf(v) === j).join(", ") || "none";
  console.log(`\nQ: ${q}\nA: ${text}\n   [mode=${meta?.mode} · cites: ${cites}]`);
}
