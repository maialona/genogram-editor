import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EcomapSymbolLibrary } from "../../src/components/EcomapSymbolLibrary";
import { ECO_SYSTEM_PRESETS } from "../../src/types/ecomapCatalog";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("ecomap symbol library shows a glyph for every system and link style", () => {
  const markup = renderToStaticMarkup(createElement(EcomapSymbolLibrary));

  for (const preset of ECO_SYSTEM_PRESETS) {
    assert.match(markup, new RegExp(`data-category="${preset.category}"`));
  }
  assert.equal((markup.match(/class="eco-system-glyph"/g) ?? []).length, 11);
  assert.equal((markup.match(/data-kind="ecoLink"/g) ?? []).length, 11);
  assert.match(markup, /學校／教育/);
  assert.match(markup, /強/);
  assert.match(markup, /支持/);
  assert.match(markup, /互惠/);
});

test("ecomap symbol library exposes household person glyphs", () => {
  const markup = renderToStaticMarkup(createElement(EcomapSymbolLibrary));
  assert.match(markup, /data-kind="person"/);
  assert.match(markup, /data-gender="male"/);
  assert.match(markup, /data-gender="female"/);
  assert.match(markup, /data-gender="unknown"/);
  assert.match(markup, /男性/);
  assert.match(markup, /女性/);
  assert.match(markup, /未知性別/);
});

test("ecomap symbol library sections start collapsed like the genogram accordion", () => {
  const markup = renderToStaticMarkup(createElement(EcomapSymbolLibrary));
  assert.equal((markup.match(/symbol-section-toggle/g) ?? []).length, 6);
  assert.equal((markup.match(/aria-expanded="false"/g) ?? []).length, 6);
  assert.equal((markup.match(/hidden=""/g) ?? []).length, 6);
});

test("ecomap symbol library exposes household family relationship glyphs", () => {
  const markup = renderToStaticMarkup(createElement(EcomapSymbolLibrary));
  assert.match(markup, /data-rel="marriage"/);
  assert.match(markup, /data-rel="parent"/);
  assert.match(markup, /data-rel="adoptiveParent"/);
  assert.match(markup, /data-rel="twin"/);
  assert.match(markup, /婚姻/);
  assert.match(markup, /親子/);
  assert.match(markup, /收養親子/);
  assert.match(markup, /雙胞胎/);
});
