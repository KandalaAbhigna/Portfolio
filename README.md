# Abhigna Kandala — Portfolio

Personal site with a retrieval-augmented AI concierge. Live at the Vercel deployment for this repo.

## What is in here

| Path | What it does |
| --- | --- |
| `public/` | The static site: `index.html`, `css/site.css`, `assets/`. Compiled JS lands in `public/js/` (git-ignored). |
| `src/ts/` | Front-end TypeScript. `data.ts` holds all content (projects, AI apps, jobs, skills). `render.ts` builds the DOM. `chat.ts` is the concierge client. `hero.ts` is the background canvas. |
| `src/data/knowledge.md` | The concierge's knowledge base. Plain markdown; every `# Heading` becomes a retrievable chunk. |
| `scripts/build-knowledge.mjs` | Splits `knowledge.md` into `api/_knowledge.ts` at build time. |
| `api/chat.ts` | Vercel Function. BM25 retrieval over the chunks → Anthropic Messages API → server-sent events back to the browser. |
| `api/_retrieval.ts` | BM25 ranking written from scratch, with a small synonym map and stop-word list. |
| `legacy/` | The previous single-file site, kept for reference. |

No runtime dependencies. The only dev dependency is TypeScript.

## How the concierge works

1. `npm run build` chunks `knowledge.md` and compiles the TypeScript.
2. A visitor asks a question. The browser POSTs the last 8 turns to `/api/chat`.
3. The function tokenizes the question (plus the previous user turn for context), scores every chunk with BM25, and keeps the top 5.
4. Those chunks go to Claude as `CONTEXT`, with a system prompt that forbids answering outside the context and refuses personal or salary questions.
5. The answer streams back as SSE. The retrieved section titles are sent first so the UI can show them as citations.

Guardrails: 600-character message cap, 8-turn history cap, 20 requests per IP per 10 minutes (in-memory, per function instance), `temperature: 0.2`, `max_tokens: 500`.

## Local development

```bash
npm install
npm run build        # builds knowledge index + compiles src/ts -> public/js
npx serve public     # static preview; /api/chat needs Vercel
```

To run the API locally, use `vercel dev` with `ANTHROPIC_API_KEY` in `.env.local`.

## Deploying on Vercel

1. Import this repo in Vercel. Framework preset: **Other**. Build command and output directory are already set in `vercel.json`.
2. In Project Settings → Environment Variables add:
   - `ANTHROPIC_API_KEY` — required.
   - `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-4-5`.
3. Deploy. The function lives at `/api/chat`.

## Updating content

- **Projects, AI apps, experience, skills:** edit `src/ts/data.ts`. A project with no `href` renders as a disabled pill rather than a broken link.
- **What the concierge knows:** edit `src/data/knowledge.md`. Keep one topic per `# Heading`; the chunker splits long sections at paragraph breaks around 900 characters.
- **Resume PDF:** replace `public/assets/Abhigna_Kandala_Resume.pdf`.

## Checks

```bash
npm run check   # typechecks the front end and the API
```
