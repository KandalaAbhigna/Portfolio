import { renderAi, renderProjects, renderSkills, renderTimeline } from "./render.js";
import { initChat } from "./chat.js";
import { initHero } from "./hero.js";

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function initTheme(): void {
  const root = document.documentElement;
  const btn = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  const sync = (): void => {
    const dark = root.dataset.theme !== "light";
    btn?.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#0b0d12" : "#f7f5ef";
  };
  btn?.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* ignore */ }
    sync();
  });
  sync();
}

function initNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const menu = byId<HTMLUListElement>("nav-menu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }),
  );
}

function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((i) => i.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  items.forEach((i) => io.observe(i));
}

function main(): void {
  const ai = byId("ai-grid");
  const pl = byId("project-list");
  const tl = byId("timeline");
  const sk = byId("skills-grid");
  if (ai) renderAi(ai);
  if (pl) renderProjects(pl);
  if (tl) renderTimeline(tl);
  if (sk) renderSkills(sk);

  initTheme();
  initNav();
  initChat();
  initReveal();

  const canvas = byId<HTMLCanvasElement>("hero-canvas");
  if (canvas) initHero(canvas);
}

document.addEventListener("DOMContentLoaded", main);
