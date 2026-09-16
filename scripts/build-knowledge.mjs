// Splits src/data/knowledge.md into sections and writes api/_knowledge.json.
// Each "# Heading" starts a chunk. Long sections are further split by paragraph
// so retrieval stays precise. Runs with plain Node, no dependencies.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../src/data/knowledge.md");
const out = resolve(here, "../api/_knowledge.json");

const MAX_CHARS = 900;

const md = readFileSync(src, "utf8");
const sections = md.split(/^# /m).filter((s) => s.trim().length > 0);

const chunks = [];
for (const section of sections) {
  const [titleLine, ...rest] = section.split("\n");
  const title = titleLine.trim();
  const body = rest.join("\n").trim();
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  let buffer = "";
  let part = 1;
  const flush = () => {
    if (!buffer.trim()) return;
    chunks.push({ id: `${slug(title)}-${part}`, title, text: buffer.trim() });
    part += 1;
    buffer = "";
  };
  for (const p of paragraphs) {
    if ((buffer + "\n\n" + p).length > MAX_CHARS && buffer) flush();
    buffer = buffer ? buffer + "\n\n" + p : p;
  }
  flush();
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ builtAt: new Date().toISOString(), chunks }, null, 2));
console.log(`knowledge: ${chunks.length} chunks from ${sections.length} sections -> ${out}`);
