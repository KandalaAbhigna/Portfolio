// BM25 retrieval over the knowledge chunks. Written from scratch so the whole
// RAG loop is readable in one file: tokenize -> score -> pick top-k.

export interface Chunk {
  id: string;
  title: string;
  text: string;
}

export interface ScoredChunk extends Chunk {
  score: number;
}

const STOP = new Set(
  (
    "a an and are as at be by for from has have he her his how i in is it its of on or she that the their they this to was were what when where which who why will with you your about does did do can tell me abhigna abhigna's kandala questions question this these those there them"
  ).split(" "),
);

// Small synonym map so recruiter phrasing lands on the right chunks.
const SYNONYMS: Record<string, string[]> = {
  aws: ["amazon", "cloud"],
  cloud: ["aws"],
  job: ["role", "roles", "hire", "hiring"],
  hire: ["contact", "email", "reach"],
  contact: ["email", "reach", "linkedin"],
  school: ["university", "education", "degree"],
  degree: ["education", "university", "m.eng", "b.tech"],
  masters: ["m.eng", "master"],
  gpa: ["education"],
  experience: ["intern", "internship"],
  internship: ["intern"],
  led: ["supervised", "code", "review"],
  lead: ["supervised", "review"],
  mentor: ["supervised", "interns"],
  mentored: ["supervised", "interns"],
  reviewed: ["review", "reviews"],
  manage: ["supervised"],
  rag: ["retrieval", "concierge", "assistant"],
  concierge: ["retrieval", "assistant", "rag", "portfolio"],
  chatbot: ["concierge", "assistant", "rag"],
  ai: ["claude", "llm", "concierge", "machine", "learning"],
  ml: ["machine", "learning", "lightgbm", "model"],
  stock: ["t20", "siddhantha", "ticker"],
  t20: ["siddhantha", "stock"],
  kubernetes: ["k8s", "terrapin"],
  k8s: ["kubernetes"],
  react: ["frontend", "front", "typescript"],
  frontend: ["react", "ui"],
  backend: ["api", "rest", "flask", "fastapi", "node"],
  test: ["tests", "testing", "pytest", "vitest"],
  testing: ["tests", "pytest", "vitest"],
  visa: ["authorization", "sponsorship", "personal"],
  sponsorship: ["authorization", "visa", "personal"],
  salary: ["personal", "compensation"],
  compensation: ["salary", "personal"],
  hobbies: ["outside", "fitness", "gaming"],
  fun: ["outside", "fitness", "gaming", "hobbies"],
  location: ["college", "park", "maryland", "relocation"],
  where: ["location", "based", "college", "park"],
  graduate: ["graduates", "graduation", "december", "2026"],
  graduation: ["december", "2026"],
};

export function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9.+#\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
  const out: string[] = [];
  for (const t of raw) {
    out.push(t);
    const syn = SYNONYMS[t];
    if (syn) out.push(...syn);
  }
  return out;
}

interface Index {
  chunks: Chunk[];
  docTokens: string[][];
  docLen: number[];
  avgLen: number;
  df: Map<string, number>;
}

let cached: Index | null = null;

export function buildIndex(chunks: Chunk[]): Index {
  if (cached && cached.chunks === chunks) return cached;
  const docTokens = chunks.map((c) => tokenize(`${c.title} ${c.title} ${c.text}`));
  const docLen = docTokens.map((t) => t.length);
  const avgLen = docLen.reduce((a, b) => a + b, 0) / Math.max(1, docLen.length);
  const df = new Map<string, number>();
  for (const toks of docTokens) {
    for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  cached = { chunks, docTokens, docLen, avgLen, df };
  return cached;
}

export function retrieve(chunks: Chunk[], query: string, k = 5): ScoredChunk[] {
  const idx = buildIndex(chunks);
  const q = tokenize(query);
  if (q.length === 0) return [];
  const N = idx.chunks.length;
  const k1 = 1.4;
  const b = 0.5;

  const scored: ScoredChunk[] = idx.chunks.map((chunk, i) => {
    const toks = idx.docTokens[i];
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const term of new Set(q)) {
      const f = tf.get(term);
      if (!f) continue;
      const n = idx.df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = f + k1 * (1 - b + (b * idx.docLen[i]) / idx.avgLen);
      score += idf * ((f * (k1 + 1)) / denom);
    }
    return { ...chunk, score };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}
