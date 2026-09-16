// POST /api/chat
// Retrieval-augmented concierge: BM25 over Abhigna's knowledge base -> Claude -> SSE stream.
// The Anthropic key is read from the ANTHROPIC_API_KEY environment variable on Vercel.
import knowledge from "./_knowledge.json" with { type: "json" };
import { retrieve, type Chunk } from "./_retrieval.js";

export const config = { runtime: "nodejs" };

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
const MAX_TURNS = 8;
const MAX_MESSAGE_CHARS = 600;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;

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

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are the AI concierge on Abhigna Kandala's portfolio website. You answer questions from recruiters, hiring managers, and engineers about Abhigna's background, projects, skills, and experience.

Rules:
- Answer ONLY from the CONTEXT sections provided. If the context does not contain the answer, say you do not have that detail and suggest emailing Abhigna at k.abhigna2@gmail.com. Never invent employers, dates, metrics, or technologies.
- Do not answer questions about work authorization, visa status, salary, age, or other personal matters; direct those to Abhigna by email.
- Refer to Abhigna as "Abhigna" or "she". You are not Abhigna; do not speak in the first person as her.
- Be concise: two to five sentences, or a short list when comparing several things. Plain language, no hype, no exclamation marks.
- If the visitor asks something unrelated to Abhigna or hiring her, politely steer back.
- When useful, end with one short follow-up question the visitor might want to ask next.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: "Concierge is not configured (missing API key)." });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
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

  // Retrieval: use the latest question plus the previous user turn for context.
  const prevUser = [...messages].reverse().find((m, i) => i > 0 && m.role === "user");
  const query = prevUser ? `${last.content} ${prevUser.content}` : last.content;
  const chunks = knowledge.chunks as Chunk[];
  const hits = retrieve(chunks, query, 5);
  const context = hits.map((h) => `## ${h.title}\n${h.text}`).join("\n\n");

  const userTurn = `CONTEXT:\n${context || "(no matching sections)"}\n\nQUESTION: ${last.content}`;
  const anthropicMessages = [
    ...messages.slice(0, -1),
    { role: "user" as const, content: userTurn },
  ];

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("anthropic error", upstream.status, detail.slice(0, 300));
    return json(502, { error: "The concierge could not reach its model. Please try again." });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          sse({
            type: "sources",
            sources: hits.map((h) => ({ id: h.id, title: h.title, score: Number(h.score.toFixed(2)) })),
          }),
        ),
      );
      let buffer = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const line = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim());
              if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
                controller.enqueue(encoder.encode(sse({ type: "text", text: payload.delta.text })));
              } else if (payload.type === "error") {
                controller.enqueue(encoder.encode(sse({ type: "error", error: "Model error" })));
              }
            } catch {
              /* ignore malformed event */
            }
          }
        }
        controller.enqueue(encoder.encode(sse({ type: "done" })));
      } catch (err) {
        console.error("stream error", err);
        controller.enqueue(encoder.encode(sse({ type: "error", error: "Stream interrupted" })));
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
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
