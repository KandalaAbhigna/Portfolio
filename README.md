# Abhigna Kandala — Portfolio

Live: https://abhigna-kandala.vercel.app

A zero-dependency TypeScript site with engineering case studies, a system-design lab, and **Ask Abhigna AI**, a retrieval-augmented assistant that runs **without any paid AI API key**.

## Run it locally

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/KandalaAbhigna/Portfolio.git
cd Portfolio
npm install
npm run dev
```

Open http://localhost:5173. The assistant works immediately in **extractive mode** (no model, no key): it retrieves the best-matching sections of the knowledge base and answers with the most relevant sentences, quoted verbatim, with citations.

### Optional: a local AI model with Ollama

If you want fluent, model-written answers on your own machine, still free and fully offline:

```bash
# 1. Install Ollama from https://ollama.com, then pull a small model
ollama pull llama3.2

# 2. Start the site pointed at your local Ollama
OLLAMA_URL=http://localhost:11434 npm run dev

# Optional: pick a different model
OLLAMA_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5:3b npm run dev
```

The model only sees the retrieved sections and is instructed not to invent anything. If Ollama is not running, the assistant falls back to extractive mode automatically.

The deployed site on Vercel always uses extractive mode. A cloud function cannot reach a model running on your laptop, and that keeps hosting free.

## How the assistant works

1. `src/data/knowledge.md` is the only source of truth. Every `# Heading` becomes a retrievable section; long sections are split at paragraph breaks.
2. `npm run build` chunks it into `api/_knowledge.ts`.
3. A question hits `POST /api/chat`. `api/_retrieval.ts` ranks sections with BM25 (written from scratch, with a small synonym map).
4. `api/_answer.ts` either composes an extractive answer from the top sections, or streams one from Ollama when `OLLAMA_URL` is set.
5. The answer streams back over server-sent events, with the cited sections listed first.

Guardrails: personal topics (visa, salary, age) are refused with a pointer to email; weak retrieval returns an honest "not covered" message; messages are capped at 600 characters; 30 requests per IP per 10 minutes.

Check answer quality after editing the knowledge base:

```bash
npm run test:answers
npm run test:answers -- "Does she know Kubernetes?"
```

## Project layout

| Path | Purpose |
| --- | --- |
| `public/` | Static site: `index.html`, `css/`, `assets/` (resume PDF, favicon). Build output goes to `public/js/`, `public/case-studies/`, and `public/lab.html`. |
| `src/ts/` | Front end. `data.ts` holds featured work, engineering depth, and experience. `render.ts` builds the DOM. `chat.ts` is the assistant UI. |
| `scripts/pages/` | Case study and lab page content, rendered to HTML by `scripts/build-pages.mjs`. |
| `src/data/knowledge.md` | The assistant's knowledge base. |
| `api/chat.ts` | Vercel Function (`GET` for status, `POST` for answers). |
| `api/_retrieval.ts`, `api/_answer.ts` | BM25 retrieval; extractive and Ollama answer composition. |
| `scripts/dev-server.mjs` | Local server that runs the same API handler as Vercel. |
| `legacy/` | The previous single-file site. |

## Deploy

Vercel imports this repo with the **Other** preset; `vercel.json` sets the build command and output directory. **No environment variables are required.** Every push to `main` redeploys.

## Updating content

- **Projects, depth areas, experience:** `src/ts/data.ts`
- **Case studies and lab:** `scripts/pages/*.mjs`
- **What the assistant knows:** `src/data/knowledge.md`, then `npm run test:answers`
- **Resume:** replace `public/assets/Abhigna_Kandala_Resume.pdf`
