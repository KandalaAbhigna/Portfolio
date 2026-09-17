import { suggestedQuestions } from "./data.js";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface Source {
  id: string;
  title: string;
  score: number;
}

const WELCOME =
  "Hi. I answer questions about Abhigna's projects, skills, and experience using only an approved knowledge base, and I cite the sections I used. If the material does not cover something, I will say so. What would you like to know?";

const MARKUP = `
<button class="chat-fab" type="button" data-open-chat aria-label="Open Ask Abhigna AI">
  <span class="chat-fab-pulse" aria-hidden="true"></span>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>
</button>
<div class="chat-backdrop" data-close-chat hidden></div>
<aside class="chat" id="chat" role="dialog" aria-modal="true" aria-labelledby="chat-title" hidden>
  <header class="chat-head">
    <div>
      <p id="chat-title" class="chat-title">Ask Abhigna AI</p>
      <p class="chat-sub">Retrieval-augmented · no paid AI API · answers only from the approved knowledge base</p>
    </div>
    <button class="icon-btn" type="button" data-close-chat aria-label="Close">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  </header>
  <div class="chat-log" id="chat-log" aria-live="polite" aria-busy="false"></div>
  <div class="chat-suggest" id="chat-suggest"></div>
  <form class="chat-form" id="chat-form">
    <label class="sr-only" for="chat-input">Your question</label>
    <textarea id="chat-input" rows="1" maxlength="600" placeholder="Ask about her AWS work, testing, or what she owned on T20…" required></textarea>
    <button class="btn btn-accent" type="submit" id="chat-send" aria-label="Send">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 5l7 7-7 7"/></svg>
    </button>
  </form>
  <p class="chat-foot">Answers come only from Abhigna's knowledge base. Confirm anything important with her directly.</p>
</aside>`;

export function initChat(): void {
  if (!document.getElementById("chat")) {
    const host = document.createElement("div");
    host.innerHTML = MARKUP;
    document.body.append(...Array.from(host.children));
  }
  const panelEl = document.getElementById("chat") as HTMLElement | null;
  const backdropEl = document.querySelector<HTMLElement>(".chat-backdrop");
  const logEl = document.getElementById("chat-log") as HTMLElement | null;
  const formEl = document.getElementById("chat-form") as HTMLFormElement | null;
  const inputEl = document.getElementById("chat-input") as HTMLTextAreaElement | null;
  const sendEl = document.getElementById("chat-send") as HTMLButtonElement | null;
  const suggestEl = document.getElementById("chat-suggest") as HTMLElement | null;
  if (!panelEl || !backdropEl || !logEl || !formEl || !inputEl || !sendEl || !suggestEl) return;
  const panel: HTMLElement = panelEl;
  const backdrop: HTMLElement = backdropEl;
  const log: HTMLElement = logEl;
  const form: HTMLFormElement = formEl;
  const input: HTMLTextAreaElement = inputEl;
  const send: HTMLButtonElement = sendEl;
  const suggest: HTMLElement = suggestEl;

  const history: Turn[] = [];
  let busy = false;
  let lastFocus: HTMLElement | null = null;

  const addMsg = (cls: string, text = ""): HTMLDivElement => {
    const div = document.createElement("div");
    div.className = `msg ${cls}`;
    div.textContent = text;
    log.append(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };

  const addSources = (sources: Source[], mode: string): void => {
    if (sources.length === 0) return;
    const wrap = document.createElement("div");
    wrap.className = "msg-sources";
    const lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = mode.startsWith("ollama") ? `local model (${mode.slice(7)}) · sources:` : "quoted from:";
    wrap.append(lbl);
    const seen = new Set<string>();
    for (const s of sources) {
      if (seen.has(s.title)) continue;
      seen.add(s.title);
      const chip = document.createElement("span");
      chip.textContent = s.title;
      chip.title = `BM25 score ${s.score}`;
      wrap.append(chip);
    }
    log.append(wrap);
    log.scrollTop = log.scrollHeight;
  };

  const renderSuggestions = (): void => {
    suggest.replaceChildren();
    for (const q of suggestedQuestions) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", () => {
        input.value = q;
        void ask();
      });
      suggest.append(b);
    }
  };

  const open = (): void => {
    lastFocus = document.activeElement as HTMLElement | null;
    panel.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("chat-open");
    if (log.childElementCount === 0) {
      addMsg("msg-bot", WELCOME);
      renderSuggestions();
    }
    setTimeout(() => input.focus(), 50);
  };

  const close = (): void => {
    panel.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove("chat-open");
    lastFocus?.focus();
  };

  document.querySelectorAll<HTMLElement>("[data-open-chat]").forEach((b) => {
    b.addEventListener("click", open);
    b.addEventListener("keydown", (e) => {
      if (b.tagName !== "BUTTON" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        open();
      }
    });
  });
  document.querySelectorAll<HTMLElement>("[data-close-chat]").forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  const autoGrow = (): void => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  };
  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask();
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void ask();
  });

  async function ask(): Promise<void> {
    const q = input.value.trim();
    if (!q || busy) return;
    busy = true;
    send.disabled = true;
    input.value = "";
    autoGrow();
    suggest.replaceChildren();

    addMsg("msg-user", q);
    history.push({ role: "user", content: q });

    const bot = addMsg("msg-bot");
    bot.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    log.setAttribute("aria-busy", "true");

    let answer = "";
    let sources: Source[] = [];
    let mode = "extractive";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-8) }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim()) as
            | { type: "meta"; mode: string; sources: Source[] }
            | { type: "text"; text: string }
            | { type: "error"; error: string }
            | { type: "done" };
          if (payload.type === "meta") { sources = payload.sources; mode = payload.mode; }
          else if (payload.type === "text") {
            if (!answer) bot.textContent = "";
            answer += payload.text;
            bot.textContent = answer;
            log.scrollTop = log.scrollHeight;
          } else if (payload.type === "error") throw new Error(payload.error);
        }
      }
      if (!answer) throw new Error("No answer was returned.");
      history.push({ role: "assistant", content: answer });
      addSources(sources, mode);
    } catch (err) {
      bot.classList.add("is-error");
      bot.textContent = err instanceof Error ? err.message : "Something went wrong.";
      history.pop();
    } finally {
      busy = false;
      send.disabled = false;
      log.setAttribute("aria-busy", "false");
      input.focus();
    }
  }
}
