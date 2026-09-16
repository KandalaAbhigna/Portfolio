// Minimal ambient types so `tsc --noEmit` works without @types/node.
// Vercel's runtime provides the real `process` object.
declare const process: { env: Record<string, string | undefined> };
