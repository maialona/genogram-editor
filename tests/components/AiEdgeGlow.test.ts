import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const moduleUrl = new URL(
  "../../src/components/AiEdgeGlow/AiEdgeGlow.tsx",
  import.meta.url
);

test("edge glow markup exposes one inert canvas and seven fallback lights", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { AiEdgeGlowMarkup } = await import(moduleUrl.href);
  const markup = renderToStaticMarkup(
    createElement(AiEdgeGlowMarkup, {
      active: true,
      fallback: true,
    })
  );

  assert.match(markup, /class="ai-edge-glow is-active is-fallback"/);
  assert.match(markup, /<canvas[^>]*class="ai-edge-glow-canvas"[^>]*aria-hidden="true"/);
  assert.equal((markup.match(/class="ai-edge-glow-blob"/g) ?? []).length, 7);
  assert.doesNotMatch(markup, /tabindex|role="button"/i);
});
