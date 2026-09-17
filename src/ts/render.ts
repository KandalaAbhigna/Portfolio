import { depth, featured, jobs, type Featured, type Link } from "./data.js";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function linkPill(link: Link, cls = ""): HTMLAnchorElement {
  const a = el("a", cls, link.label);
  if (link.href === "#chat-open") {
    a.setAttribute("role", "button");
    a.tabIndex = 0;
    a.dataset.openChat = "true";
  } else if (link.href) {
    a.href = link.href;
    if (link.href.startsWith("http")) {
      a.target = "_blank";
      a.rel = "noopener";
    }
  } else {
    a.setAttribute("aria-disabled", "true");
    a.title = "Not public";
  }
  return a;
}

export function diagram(kind: Featured["diagram"]): SVGSVGElement {
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

  if (kind === "pipeline") {
    svg.setAttribute("aria-label", "EventBridge schedule triggers Step Functions, which runs five ECS Fargate tasks and writes results to S3 and RDS; a Lambda API reads precomputed JSON for the React dashboard.");
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
  } else if (kind === "k8s") {
    svg.setAttribute("aria-label", "GitHub Actions builds Docker images and deploys to Kubernetes; Nginx ingress with cert-manager TLS routes to autoscaled FastAPI pods backed by MongoDB.");
    node(12, 12, 104, "GitHub Actions", "on push", "");
    node(136, 12, 104, "Docker", "build + push", "");
    node(260, 12, 88, "Kubernetes", "deploy", "hot");
    node(12, 100, 104, "Nginx ingress", "TLS, secrets", "hot");
    node(136, 100, 104, "FastAPI pods", "2–10 replicas", "acc");
    node(260, 100, 88, "MongoDB", "state", "");
    edge("M116 34 L136 34");
    edge("M240 34 L260 34");
    edge("M304 56 C 304 88, 64 66, 64 100");
    edge("M116 122 L136 122");
    edge("M240 122 L260 122");
  } else {
    svg.setAttribute("aria-label", "Question goes to BM25 retrieval over the knowledge base, the best-matching sentences are quoted from those sections, and the answer streams back with citations.");
    node(12, 12, 120, "Visitor question", "browser", "");
    node(228, 12, 120, "Knowledge base", "md → chunks", "");
    node(120, 88, 120, "BM25 retrieval", "top-5 sections", "hot");
    node(120, 164, 120, "Answer", "quoted + cited", "acc");
    edge("M132 34 C 170 34, 150 88, 150 88");
    edge("M288 56 C 288 80, 240 88, 240 100");
    edge("M180 132 L180 164");
    edge("M120 186 C 60 186, 40 60, 40 56");
  }
  return svg;
}

export function renderFeatured(root: HTMLElement): void {
  root.replaceChildren();
  featured.forEach((f, idx) => {
    const card = el("article", `feature reveal${idx % 2 === 1 ? " is-flipped" : ""}`);
    card.id = `feature-${f.id}`;

    const body = el("div", "feature-body");
    body.append(el("p", "card-kicker", f.kind));
    body.append(el("h3", "feature-title", f.title));
    body.append(el("p", "feature-story", f.story));

    const metrics = el("dl", "metrics");
    f.metrics.forEach((m) => {
      const box = el("div");
      box.append(el("dd", undefined, m.value), el("dt", undefined, m.label));
      metrics.append(box);
    });
    body.append(metrics);

    const own = el("p", "feature-own");
    own.append(el("strong", undefined, "My ownership. "), document.createTextNode(f.ownership));
    body.append(own);

    const tags = el("div", "tags");
    f.stack.forEach((s) => tags.append(el("span", "tag", s)));
    body.append(tags);

    const actions = el("div", "feature-actions");
    f.links.forEach((l, i) => actions.append(linkPill(l, i === 0 ? "btn btn-accent btn-sm" : "btn btn-ghost btn-sm")));
    body.append(actions);

    const visual = el("div", "feature-visual");
    visual.append(diagram(f.diagram));

    card.append(body, visual);
    root.append(card);
  });
}

export function renderDepth(root: HTMLElement): void {
  root.replaceChildren();
  depth.forEach((d) => {
    const box = el("article", "depth reveal");
    box.append(el("h3", undefined, d.name), el("p", "depth-claim", d.claim));
    const ul = el("ul", "depth-points");
    d.points.forEach((p) => ul.append(el("li", undefined, p)));
    box.append(ul);
    root.append(box);
  });
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
