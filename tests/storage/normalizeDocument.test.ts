import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDocument } from "../../src/storage/storageManager";
import { createPerson } from "../../src/types/document";

test("legacy genogram JSON gains empty ecomap fields", () => {
  const doc = normalizeDocument({
    title: "舊檔",
    persons: [
      createPerson({ id: "p1", gender: "male", x: 10, y: 20, name: "阿明" }),
    ],
    relationships: [{ id: "r1", from: "p1", to: "p1", type: "parent" }],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 1,
  });

  assert.deepEqual(doc.householdPersonIds, []);
  assert.deepEqual(doc.ecoSystems, []);
  assert.deepEqual(doc.ecoLinks, []);
  assert.equal(doc.ecomapViewport.scale, 1);
  assert.equal(doc.persons[0].ecomapX, null);
  assert.equal(doc.persons[0].ecomapY, null);
});

test("orphan household ids and dangling eco-links are dropped", () => {
  const doc = normalizeDocument({
    title: "殘缺生態圖",
    persons: [
      createPerson({ id: "p1", gender: "female", x: 0, y: 0, name: "小華" }),
    ],
    householdPersonIds: ["p1", "ghost", "p1"],
    ecoSystems: [
      {
        id: "s-school",
        label: "學校",
        category: "school",
        notes: "",
        x: 200,
        y: 0,
      },
      { id: "broken", label: "沒座標", category: "work" } as never,
    ],
    ecoLinks: [
      {
        id: "ok",
        from: { kind: "household" },
        to: "s-school",
        strength: "strong",
        quality: "supportive",
        flow: "both",
        notes: "",
      },
      {
        id: "missing-system",
        from: { kind: "household" },
        to: "nope",
      },
      {
        id: "missing-person",
        from: { kind: "person", personId: "ghost" },
        to: "s-school",
      },
      {
        id: "bad-from",
        from: { kind: "alien" },
        to: "s-school",
      } as never,
    ],
  });

  assert.deepEqual(doc.householdPersonIds, ["p1"]);
  assert.equal(doc.ecoSystems.length, 1);
  assert.equal(doc.ecoSystems[0].id, "s-school");
  assert.deepEqual(
    doc.ecoLinks.map((l) => l.id),
    ["ok"]
  );
  assert.equal(doc.ecoLinks[0].strength, "strong");
  assert.equal(doc.ecoLinks[0].flow, "both");
});

test("unknown ecomap enums fall back to safe defaults", () => {
  const doc = normalizeDocument({
    persons: [
      createPerson({
        id: "p1",
        gender: "male",
        x: 0,
        y: 0,
        ecomapX: 12,
        ecomapY: 34,
      }),
    ],
    ecoSystems: [
      {
        id: "s1",
        label: "鄰里",
        category: "not-a-category" as never,
        notes: "",
        x: 80,
        y: 90,
      },
    ],
    ecoLinks: [
      {
        id: "l1",
        from: { kind: "person", personId: "p1" },
        to: "s1",
        strength: "mega" as never,
        quality: "toxic" as never,
        flow: "sideways" as never,
      },
    ],
  });

  assert.equal(doc.persons[0].ecomapX, 12);
  assert.equal(doc.persons[0].ecomapY, 34);
  assert.equal(doc.ecoSystems[0].category, "custom");
  assert.equal(doc.ecoLinks[0].strength, "moderate");
  assert.equal(doc.ecoLinks[0].quality, "supportive");
  assert.equal(doc.ecoLinks[0].flow, "none");
});
