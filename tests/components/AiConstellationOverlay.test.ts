import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiConstellationOverlay } from "../../src/components/Canvas/AiConstellationOverlay";
import { createPerson, type Document } from "../../src/types/document";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("waiting constellation always renders six abstract nodes", () => {
  const markup = renderToStaticMarkup(
    createElement(AiConstellationOverlay, {
      phase: "structuring",
      previewDocument: null,
      width: 800,
      height: 600,
    })
  );

  assert.equal((markup.match(/class="constellation-node"/g) ?? []).length, 6);
  assert.doesNotMatch(markup, /%/);
});

test("revealing constellation renders the real preview document", () => {
  const preview: Document = {
    title: "preview",
    persons: [
      createPerson({
        id: "p1",
        name: "林正雄",
        gender: "male",
        x: 100,
        y: 100,
      }),
    ],
    relationships: [],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };
  const markup = renderToStaticMarkup(
    createElement(AiConstellationOverlay, {
      phase: "revealing",
      previewDocument: preview,
      width: 800,
      height: 600,
    })
  );

  assert.match(markup, /ai-constellation-preview/);
  assert.match(markup, /林正雄/);
});
