import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EcoSystemCategory } from "../../src/types/document";
import { EcoSystemRenderer } from "../../src/renderers/EcoSystemRenderer";
import { EcoSystemGlyph } from "../../src/renderers/ecoSystemIcons";
import {
  EcoFlowGlyph,
  EcoQualityGlyph,
  EcoStrengthGlyph,
} from "../../src/renderers/ecoLinkIcons";
import { ECO_SYSTEM_PRESETS } from "../../src/types/ecomapCatalog";
import { createEcoSystem } from "../../src/types/document";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const CATEGORIES: EcoSystemCategory[] = ECO_SYSTEM_PRESETS.map((p) => p.category);

test("each ecomap system category has a distinct glyph", () => {
  const marks = CATEGORIES.map((category) =>
    renderToStaticMarkup(createElement(EcoSystemGlyph, { category }))
  );
  assert.equal(marks.length, 11);
  assert.equal(new Set(marks).size, marks.length);
  for (const markup of marks) {
    assert.match(markup, /class="eco-system-glyph"/);
    assert.match(markup, /<path |<circle |<rect /);
  }
});

test("canvas system node includes the category glyph and label", () => {
  const markup = renderToStaticMarkup(
    createElement(EcoSystemRenderer, {
      system: createEcoSystem({
        id: "s-school",
        label: "幼兒園",
        category: "school",
        x: 10,
        y: 20,
      }),
      selected: false,
    })
  );
  assert.match(markup, /class="eco-system"/);
  assert.match(markup, /data-category="school"/);
  assert.match(markup, /class="eco-system-glyph"/);
  assert.match(markup, /幼兒園/);
});

test("link preview glyphs match strength, quality, and flow", () => {
  const strong = renderToStaticMarkup(
    createElement(EcoStrengthGlyph, { value: "strong" })
  );
  const weak = renderToStaticMarkup(
    createElement(EcoStrengthGlyph, { value: "weak" })
  );
  assert.match(strong, /stroke-width="3.4"/);
  assert.doesNotMatch(strong, /stroke-dasharray/);
  assert.match(weak, /stroke-dasharray/);

  const stressful = renderToStaticMarkup(
    createElement(EcoQualityGlyph, { value: "stressful" })
  );
  const cutoff = renderToStaticMarkup(
    createElement(EcoQualityGlyph, { value: "cutoff" })
  );
  assert.match(stressful, /#dc2626/);
  assert.match(cutoff, /#6b7280/);

  const both = renderToStaticMarkup(createElement(EcoFlowGlyph, { value: "both" }));
  const none = renderToStaticMarkup(createElement(EcoFlowGlyph, { value: "none" }));
  assert.equal((both.match(/<path /g) ?? []).length, 2);
  assert.equal((none.match(/<path /g) ?? []).length, 0);
});
