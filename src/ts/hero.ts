// Hero background: a slow field of drifting nodes that connect when close,
// a quiet nod to retrieval graphs. Respects reduced motion and pauses when hidden.

export function initHero(canvas: HTMLCanvasElement): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  interface P { x: number; y: number; vx: number; vy: number; r: number; }
  let pts: P[] = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  let running = true;

  const css = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.max(28, Math.min(70, Math.floor((w * h) / 22000)));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 1.6,
    }));
  };

  const draw = (): void => {
    ctx.clearRect(0, 0, w, h);
    const line = css("--line-strong") || "#323846";
    const accent = css("--accent") || "#f2b544";
    const teal = css("--teal") || "#4fd1c5";
    const maxD = 130;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < maxD) {
          ctx.globalAlpha = (1 - d / maxD) * 0.6;
          ctx.strokeStyle = line;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    pts.forEach((p, i) => {
      ctx.fillStyle = i % 9 === 0 ? accent : i % 7 === 0 ? teal : line;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const step = (): void => {
    if (!running) return;
    for (const p of pts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
    }
    draw();
    raf = requestAnimationFrame(step);
  };

  resize();
  window.addEventListener("resize", () => { resize(); draw(); });
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  if (reduce) {
    draw();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    const visible = entries.some((e) => e.isIntersecting);
    if (visible && !running) { running = true; step(); }
    else if (!visible && running) { running = false; cancelAnimationFrame(raf); }
  });
  io.observe(canvas);
  step();
}
