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
  "Hi. I answer questions about Abhigna's projects, skills, and experience using only her knowledge base, and I show which sections I used. What would you like to know?";

export function initChat(): void {
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

  const addSources = (sources: Source[]): void => {
    if (sources.length === 0) return;
    const wrap = document.createElement("div");
    wrap.className = "msg-sources";
    const lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = "retrieved:";
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
            | { type: "sources"; sources: Source[] }
            | { type: "text"; text: string }
            | { type: "error"; error: string }
            | { type: "done" };
          if (payload.type === "sources") sources = payload.sources;
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
      addSources(sources);
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
