import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FamilyUnitRenderer } from "../../src/renderers/FamilyUnitRenderer";
import {
  buildFamilyUnits,
  layoutFamilyUnit,
} from "../../src/renderers/familyUnits";
import { createPerson, type Document } from "../../src/types/document";

test("adoption renders a solid biological line beside a dashed line", () => {
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const document: Document = {
    title: "收養圖例",
    persons: [
      createPerson({ id: "a", gender: "male", x: 100, y: 100 }),
      createPerson({ id: "b", gender: "female", x: 230, y: 100 }),
      createPerson({ id: "c", gender: "male", x: 165, y: 270 }),
    ],
    relationships: [
      { id: "couple", from: "a", to: "b", type: "marriage" },
      {
        id: "ac",
        from: "a",
        to: "c",
        type: "parent",
        meta: { parentKind: "adoptive" },
      },
      {
        id: "bc",
        from: "b",
        to: "c",
        type: "parent",
        meta: { parentKind: "adoptive" },
      },
    ],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };
  const unit = buildFamilyUnits(document).units[0];
  const markup = renderToStaticMarkup(
    createElement(FamilyUnitRenderer, {
      layout: layoutFamilyUnit(unit),
      selectedIds: new Set<string>(),
    })
  );

  assert.match(markup, /class="adoptive-line-solid"/);
  assert.match(markup, /class="adoptive-line-dashed"/);
});
