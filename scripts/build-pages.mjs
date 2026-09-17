// Renders the sub-pages (case studies, lab) from scripts/pages/*.mjs into public/.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, "../public");

const pages = [
  ["case-studies/t20-predictor.html", "./pages/t20-predictor.mjs"],
  ["case-studies/terrapin-events.html", "./pages/terrapin-events.mjs"],
  ["lab.html", "./pages/lab.mjs"],
];

for (const [out, mod] of pages) {
  const { default: html } = await import(mod);
  const target = resolve(pub, out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
  console.log(`pages: wrote ${out} (${html.length} bytes)`);
}
