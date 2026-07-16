import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appCss = readFileSync(
  new URL("../../src/App.css", import.meta.url),
  "utf8"
);
const overlayCssUrl = new URL(
  "../../src/components/AiEdgeGlow/AiEdgeGlow.css",
  import.meta.url
);

test("cinematic overlay replaces the body conic-gradient border", () => {
  assert.doesNotMatch(appCss, /\.app-shell::before/);
  assert.doesNotMatch(appCss, /ai-viewport-glow-breathe/);
  assert.equal(existsSync(fileURLToPath(overlayCssUrl)), true);

  const css = readFileSync(overlayCssUrl, "utf8");
  assert.match(css, /\.ai-edge-glow\s*{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.ai-edge-glow\s*{[\s\S]*?inset:\s*0/);
  assert.match(css, /\.ai-edge-glow\s*{[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /z-index:\s*\d+/);
  assert.doesNotMatch(css, /conic-gradient|border-image|hue-rotate/i);
});

test("fallback blobs drift independently and stop for reduced motion", () => {
  assert.equal(existsSync(fileURLToPath(overlayCssUrl)), true);
  const css = readFileSync(overlayCssUrl, "utf8");

  assert.match(css, /\.ai-edge-glow-blob/);
  assert.match(css, /animation:[\s\S]*?var\(--edge-glow-duration\)/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ai-edge-glow-blob[\s\S]*?animation:\s*none/
  );
});
