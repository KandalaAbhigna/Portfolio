// Key-free answer composition.
//
// Default ("extractive"): pick the sentences from the retrieved sections that best
// match the question and return them verbatim. No model, no API key, nothing can be
// invented because every sentence is quoted from the knowledge base.
//
// Optional ("ollama"): when OLLAMA_URL is set (local development on your own machine),
// hand the same retrieved sections to a local open-weight model for a fluent answer.

import { tokenize, type ScoredChunk } from "./_retrieval.js";

export const MIN_TOP_SCORE = 2.0;

const PERSONAL = new Set([
  "visa", "sponsorship", "sponsor", "authorization", "opt", "h1b", "h-1b", "citizen", "citizenship",
  "salary", "compensation", "pay", "age", "old", "married", "religion", "green",
]);

export function isPersonal(question: string): boolean {
  return question
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .some((t) => PERSONAL.has(t));
}

export const PERSONAL_REPLY =
  "That is a personal topic this assistant does not cover. For questions about work authorization, salary, or anything personal, please email Abhigna directly at k.abhigna2@gmail.com.";

export const NO_MATCH_REPLY =
  "The knowledge base does not cover that, so I would rather not guess. Try asking about T20 Predictor, Terrapin Events, her internships, testing and CI/CD, or how this assistant works, or email Abhigna at k.abhigna2@gmail.com.";

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

interface Candidate {
  text: string;
  title: string;
  group: number;
  part: number;
  position: number;
  score: number;
}

const CONNECTOR = /^(Either way|Also|However|Instead|Otherwise|In the deployed site|When Abhigna runs)\b/;
const PERSONAL_SECTION = /^Visa, salary/;

export interface Composed {
  text: string;
  titles: string[];
}

export function composeExtractive(question: string, hits: ScoredChunk[], maxSentences = 3): Composed {
  if (isPersonal(question)) return { text: PERSONAL_REPLY, titles: [] };
  const pool = hits.filter((h) => !PERSONAL_SECTION.test(h.title));
  if (pool.length === 0 || pool[0].score < MIN_TOP_SCORE) return { text: NO_MATCH_REPLY, titles: [] };

  const qTerms = new Set(tokenize(question));
  const topScore = pool[0].score;
  const groupOf = new Map<string, number>();
  const candidates: Candidate[] = [];

  pool.slice(0, 4).forEach((hit) => {
    if (hit.score < topScore * 0.5) return;
    if (!groupOf.has(hit.title)) groupOf.set(hit.title, groupOf.size);
    const group = groupOf.get(hit.title) ?? 0;
    const part = Number(hit.id.split("-").pop()) || 1;
    // Section titles carry names ("Savart", "Terrapin Events") that body sentences omit.
    const titleTerms = new Set(tokenize(hit.title, false));
    splitSentences(hit.text).forEach((sentence, position) => {
      if (CONNECTOR.test(sentence)) return;
      const sTerms = new Set([...tokenize(sentence, false), ...titleTerms]);
      let overlap = 0;
      for (const t of qTerms) if (sTerms.has(t)) overlap += 1;
      if (overlap === 0) return;
      const words = sentence.split(" ").length;
      const lengthPenalty = words > 60 ? 0.8 : words < 8 ? 0.7 : 1;
      const labelPenalty = /^(Stack|Dates):/.test(sentence) ? 0.8 : 1;
      const score =
        (overlap / Math.sqrt(qTerms.size)) * lengthPenalty * labelPenalty + (hit.score / topScore) * 0.6 - position * 0.02;
      candidates.push({ text: sentence, title: hit.title, group, part, position, score });
    });
  });

  if (candidates.length === 0) return { text: NO_MATCH_REPLY, titles: [] };

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0].score;
  const perGroup = new Map<number, number>();
  const chosen: Candidate[] = [];
  for (const c of candidates) {
    if (c.score < best * 0.6) break;
    const used = perGroup.get(c.group) ?? 0;
    if (used >= 3) continue;
    chosen.push(c);
    perGroup.set(c.group, used + 1);
    if (chosen.length >= maxSentences) break;
  }

  // Read in document order: most relevant section first, then original part and sentence order.
  chosen.sort((a, b) => a.group - b.group || a.part - b.part || a.position - b.position);

  const sentences = chosen.map((c) => c.text);
  sentences[0] = sentences[0].replace(/^She\b/, "Abhigna").replace(/^Her\b/, "Abhigna's");
  return { text: sentences.join(" "), titles: [...new Set(chosen.map((c) => c.title))] };
}

export const OLLAMA_SYSTEM = `You answer questions about Abhigna Kandala, a software engineer, for recruiters and engineers visiting her portfolio.
Rules:
- Use ONLY the CONTEXT. If the context does not answer the question, say you do not have that detail and suggest emailing k.abhigna2@gmail.com.
- Never invent employers, dates, metrics, or technologies.
- Do not discuss visa, work authorization, salary, age, or other personal matters.
- Refer to her as "Abhigna" or "she". Two to four plain sentences. No exclamation marks.`;

export async function* streamOllama(
  baseUrl: string,
  model: string,
  question: string,
  hits: ScoredChunk[],
): AsyncGenerator<string> {
  const context = hits.map((h) => `## ${h.title}\n${h.text}`).join("\n\n");
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      options: { temperature: 0.2 },
      messages: [
        { role: "system", content: OLLAMA_SYSTEM },
        { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
      ],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama returned ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
      if (msg.message?.content) yield msg.message.content;
      if (msg.done) return;
    }
  }
}
