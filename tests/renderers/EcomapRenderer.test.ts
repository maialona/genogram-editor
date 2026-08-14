import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSampleEcomap } from "../../src/data/sampleEcomap";
import { EcomapRenderer } from "../../src/renderers/EcomapRenderer";
import { SvgRenderer } from "../../src/renderers/SvgRenderer";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("sample ecomap renders household, systems, and links", () => {
  const markup = renderToStaticMarkup(
    createElement(EcomapRenderer, {
      document: createSampleEcomap(),
      selectedIds: [],
      connectFromId: null,
    })
  );

  assert.match(markup, /class="household-circle"/);
  assert.match(markup, /核心家庭/);
  assert.equal((markup.match(/class="eco-system"/g) ?? []).length, 4);
  assert.equal((markup.match(/class="eco-link"/g) ?? []).length, 4);
  assert.match(markup, /小明/);
});

test("genogram mode hides ecomap layers", () => {
  const markup = renderToStaticMarkup(
    createElement(SvgRenderer, {
      document: createSampleEcomap(),
      selectedIds: [],
      connectFromId: null,
      diagramMode: "genogram",
    })
  );
  assert.doesNotMatch(markup, /class="household-circle"/);
  assert.doesNotMatch(markup, /class="eco-system"/);
});
