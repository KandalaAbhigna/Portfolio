import { aiApps, jobs, projects, skillGroups, type AiApp, type Link } from "./data.js";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function linkPill(link: Link, cls = ""): HTMLAnchorElement {
  const a = el("a", cls, link.label);
  if (link.href) {
    a.href = link.href;
    if (link.href.startsWith("http")) {
      a.target = "_blank";
      a.rel = "noopener";
    }
  } else {
    a.setAttribute("aria-disabled", "true");
    a.title = "Link not public";
  }
  return a;
}

function diagram(kind: AiApp["diagram"]): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 360 220");
  svg.setAttribute("class", "diagram");
  svg.setAttribute("role", "img");

  const node = (x: number, y: number, w: number, label: string, sub: string, cls = "") => {
    const g = document.createElementNS(ns, "g");
    const r = document.createElementNS(ns, "rect");
    r.setAttribute("x", String(x)); r.setAttribute("y", String(y));
    r.setAttribute("width", String(w)); r.setAttribute("height", "44");
    r.setAttribute("rx", "8"); r.setAttribute("class", `node ${cls}`);
    const t1 = document.createElementNS(ns, "text");
    t1.setAttribute("x", String(x + 10)); t1.setAttribute("y", String(y + 18)); t1.setAttribute("class", "label"); t1.textContent = label;
    const t2 = document.createElementNS(ns, "text");
    t2.setAttribute("x", String(x + 10)); t2.setAttribute("y", String(y + 34)); t2.textContent = sub;
    g.append(r, t1, t2);
    svg.append(g);
  };
  const edge = (d: string) => {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d); p.setAttribute("class", "edge");
    svg.append(p);
  };

  if (kind === "rag") {
    svg.setAttribute("aria-label", "Question goes to BM25 retrieval over the knowledge base, top chunks and the question go to Claude, and the answer streams back with citations.");
    node(12, 12, 120, "Visitor question", "browser", "");
    node(228, 12, 120, "Knowledge base", "md → chunks", "");
    node(120, 88, 120, "BM25 retrieval", "top-5 sections", "hot");
    node(120, 164, 120, "Claude", "grounded answer", "acc");
    edge("M132 34 C 170 34, 150 88, 150 88");
    edge("M288 56 C 288 80, 240 88, 240 100");
    edge("M180 132 L180 164");
    edge("M120 186 C 60 186, 40 60, 40 56");
  } else if (kind === "pipeline") {
    svg.setAttribute("aria-label", "EventBridge schedule triggers Step Functions, which runs five ECS Fargate tasks in order and writes results to S3 and RDS for Lambda to serve.");
    node(12, 12, 104, "EventBridge", "daily cron", "");
    node(136, 12, 104, "Step Functions", "orchestrates", "hot");
    node(260, 12, 88, "ECS Fargate", "5 tasks", "hot");
    node(12, 100, 104, "S3 + RDS", "artifacts", "");
    node(136, 100, 104, "Lambda API", "reads JSON", "acc");
    node(260, 100, 88, "Dashboard", "React / TS", "");
    edge("M116 34 L136 34");
    edge("M240 34 L260 34");
    edge("M304 56 C 304 88, 64 66, 64 100");
    edge("M116 122 L136 122");
    edge("M240 122 L260 122");
  } else {
    svg.setAttribute("aria-label", "Input, model, output.");
    node(12, 88, 100, "Input", "", "");
    node(130, 88, 100, "Model", "", "hot");
    node(248, 88, 100, "Output", "", "acc");
    edge("M112 110 L130 110");
    edge("M230 110 L248 110");
  }
  return svg;
}

export function renderAi(root: HTMLElement): void {
  root.replaceChildren();
  if (aiApps.length === 0) {
    root.append(el("div", "ai-empty", "AI applications will appear here."));
    return;
  }
  for (const app of aiApps) {
    const idx = aiApps.indexOf(app);
    const compact = app.compact && aiApps.filter((a) => a.compact).length % 2 === 0;
    const card = el("article", `ai-card reveal${compact ? " is-compact" : ""}${!compact && idx % 2 === 1 ? " is-flipped" : ""}`);
    card.id = `ai-${app.id}`;

    const body = el("div", "ai-card-body");
    const h3 = el("h3", "ai-card-title");
    h3.append(el("span", undefined, app.kind), document.createTextNode(app.title));
    body.append(h3, el("p", "ai-card-desc", app.summary));

    const ul = el("ul", "ai-card-points");
    app.points.forEach((p) => ul.append(el("li", undefined, p)));
    body.append(ul);

    const tags = el("div", "tags");
    app.stack.forEach((s) => tags.append(el("span", "tag", s)));
    body.append(tags);

    const actions = el("div", "ai-card-actions");
    app.links.forEach((l, i) => {
      const a = linkPill(l, i === 0 ? "btn btn-accent btn-sm" : "btn btn-ghost btn-sm");
      if (l.href === "#chat-open") {
        a.removeAttribute("href");
        a.setAttribute("role", "button");
        a.tabIndex = 0;
        a.dataset.openChat = "true";
      }
      actions.append(a);
    });
    body.append(actions);

    const visual = el("div", "ai-card-visual");
    visual.append(diagram(app.diagram));

    card.append(body, visual);
    root.append(card);
  }
}

export function renderProjects(root: HTMLElement): void {
  root.replaceChildren();
  for (const p of projects) {
    const art = el("article", "project reveal");
    art.id = `project-${p.id}`;
    const meta = el("div", "project-meta");
    meta.append(el("strong", undefined, p.period), document.createTextNode(p.role));

    const main = el("div");
    const h3 = el("h3");
    h3.append(document.createTextNode(p.title + " "), el("span", undefined, "— " + p.subtitle));
    main.append(h3, el("p", undefined, p.summary));
    const ul = el("ul", "project-points");
    p.points.forEach((pt) => ul.append(el("li", undefined, pt)));
    main.append(ul);
    const tags = el("div", "tags");
    p.stack.forEach((s) => tags.append(el("span", "tag", s)));
    main.append(tags);

    const links = el("div", "project-links");
    p.links.forEach((l) => links.append(linkPill(l)));

    art.append(meta, main, links);
    root.append(art);
  }
}

export function renderTimeline(root: HTMLElement): void {
  root.replaceChildren();
  for (const j of jobs) {
    const li = el("li", "reveal");
    const head = el("div", "timeline-head");
    const h3 = el("h3");
    h3.append(document.createTextNode(j.role + " "), el("span", undefined, "· " + j.company));
    head.append(h3, el("p", undefined, `${j.period} · ${j.location}`));
    const ul = el("ul");
    j.points.forEach((p) => ul.append(el("li", undefined, p)));
    li.append(head, ul);
    root.append(li);
  }
}

export function renderSkills(root: HTMLElement): void {
  root.replaceChildren();
  for (const g of skillGroups) {
    const box = el("div", "skill-group reveal");
    box.append(el("h3", undefined, g.name));
    const tags = el("div", "tags");
    g.items.forEach((s) => tags.append(el("span", "tag", s)));
    box.append(tags);
    root.append(box);
  }
}
