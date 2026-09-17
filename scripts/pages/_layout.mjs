// Shared shell for sub-pages. Content pages export {title, description, body}.
export function page({ title, description, body, kicker, heading, lede, meta = [] }) {
  const metaHtml = meta.length
    ? `<dl class="cs-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`
    : "";
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Abhigna Kandala</title>
  <meta name="description" content="${description}" />
  <meta name="theme-color" content="#0b0d12" />
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/site.css" />
  <script>
    try {
      const t = localStorage.getItem("theme");
      if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
      else if (window.matchMedia("(prefers-color-scheme: light)").matches) document.documentElement.dataset.theme = "light";
    } catch (e) {}
  </script>
</head>
<body class="subpage">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <nav class="nav" aria-label="Primary">
      <a class="nav-brand" href="/" aria-label="Abhigna Kandala, home">
        <span class="nav-mark" aria-hidden="true"></span>
        <span>Abhigna Kandala</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu"><span></span><span></span></button>
      <ul class="nav-links" id="nav-menu">
        <li><a href="/#work">Work</a></li>
        <li><a href="/#case-studies">Case studies</a></li>
        <li><a href="/#depth">Engineering</a></li>
        <li><a href="/lab.html">Lab</a></li>
        <li><a href="/#contact">Contact</a></li>
        <li class="nav-actions">
          <button class="theme-toggle" type="button" aria-label="Switch to light theme" data-theme-toggle>
            <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
          <button class="btn btn-accent btn-sm" type="button" data-open-chat>Ask Abhigna AI</button>
        </li>
      </ul>
    </nav>
  </header>
  <main id="main" class="cs">
    <header class="cs-head container">
      <p class="section-label">${kicker}</p>
      <h1 class="section-title cs-title">${heading}</h1>
      <p class="section-desc">${lede}</p>
      ${metaHtml}
    </header>
    <div class="container cs-body">
${body}
    </div>
    <footer class="container cs-foot">
      <a class="btn btn-ghost" href="/#case-studies">← All case studies</a>
      <button class="btn btn-accent" type="button" data-open-chat>Ask Abhigna AI about this</button>
    </footer>
  </main>
  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© 2026 Abhigna Kandala.</p>
      <p><a href="https://github.com/KandalaAbhigna/Portfolio" target="_blank" rel="noopener">Source on GitHub</a></p>
    </div>
  </footer>
  <script type="module" src="/js/main.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

export const section = (id, title, html) => `
      <section class="cs-section" id="${id}">
        <h2>${title}</h2>
${html}
      </section>`;

export const callout = (label, html) => `
        <aside class="callout"><p class="callout-label">${label}</p>${html}</aside>`;

export const stats = (items) =>
  `<dl class="metrics metrics-wide">${items.map(([v, l]) => `<div><dd>${v}</dd><dt>${l}</dt></div>`).join("")}</dl>`;
