import assert from "node:assert/strict";
import test from "node:test";
import { layoutGenogram } from "../../src/ai/layoutGenogram";
import type { AiGenogramDraft } from "../../src/ai/types";

const familyDraft: AiGenogramDraft = {
  persons: [
    { id: "p1", name: "陳建國", gender: "male", generation: 0 },
    { id: "p2", name: "李淑芬", gender: "female", generation: 0 },
    { id: "p3", name: "陳志明", gender: "male", generation: 1 },
    { id: "p4", name: "陳雅惠", gender: "female", generation: 1 },
    { id: "p5", name: "張雅婷", gender: "female", generation: 1 },
    { id: "p6", name: "林志強", gender: "male", generation: 1 },
    { id: "p7", name: "陳小豪", gender: "male", generation: 2 },
    { id: "p8", name: "陳小美", gender: "female", generation: 2 },
    { id: "p9", name: "林佳欣", gender: "female", generation: 2 },
  ],
  relationships: [
    { from: "p1", to: "p2", type: "marriage" },
    { from: "p1", to: "p3", type: "parent" },
    { from: "p2", to: "p3", type: "parent" },
    { from: "p1", to: "p4", type: "parent" },
    { from: "p2", to: "p4", type: "parent" },
    { from: "p3", to: "p5", type: "marriage" },
    { from: "p4", to: "p6", type: "marriage" },
    { from: "p3", to: "p7", type: "parent" },
    { from: "p5", to: "p7", type: "parent" },
    { from: "p3", to: "p8", type: "parent" },
    { from: "p5", to: "p8", type: "parent" },
    { from: "p4", to: "p9", type: "parent" },
    { from: "p6", to: "p9", type: "parent" },
  ],
};

test("AI layout keeps every person in a generation separated", () => {
  const document = layoutGenogram(familyDraft);
  const rows = new Map<number, typeof document.persons>();

  for (const person of document.persons) {
    const row = rows.get(person.y) ?? [];
    row.push(person);
    rows.set(person.y, row);
  }

  for (const row of rows.values()) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    for (let i = 1; i < ordered.length; i += 1) {
      assert.ok(
        ordered[i].x - ordered[i - 1].x >= 100,
        `${ordered[i - 1].name} and ${ordered[i].name} overlap`
      );
    }
  }
});
