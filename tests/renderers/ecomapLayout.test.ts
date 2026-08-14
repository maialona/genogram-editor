import assert from "node:assert/strict";
import test from "node:test";
import {
  compactHouseholdPositions,
  householdCircle,
  inferDefaultHouseholdIds,
  placeSystemsAroundHousehold,
  seedEcomapLayout,
} from "../../src/renderers/ecomapLayout";
import {
  createEmptyDocument,
  createPerson,
  type Document,
} from "../../src/types/document";

function doc(partial: Partial<Document>): Document {
  return { ...createEmptyDocument(), ...partial };
}

test("default household is the index person plus first-degree relatives", () => {
  const document = doc({
    persons: [
      createPerson({ id: "ip", gender: "male", x: 0, y: 100, indexPerson: true }),
      createPerson({ id: "spouse", gender: "female", x: 100, y: 100 }),
      createPerson({ id: "child", gender: "male", x: 50, y: 200 }),
      createPerson({ id: "uncle", gender: "male", x: 300, y: 0 }),
    ],
    relationships: [
      { id: "m", from: "ip", to: "spouse", type: "marriage" },
      { id: "p1", from: "ip", to: "child", type: "parent" },
      { id: "p2", from: "spouse", to: "child", type: "parent" },
      { id: "u", from: "uncle", to: "ip", type: "harmony" },
    ],
  });

  assert.deepEqual(inferDefaultHouseholdIds(document), ["ip", "spouse", "child"]);
});

test("household circle is null when empty and large enough for one person", () => {
  assert.equal(householdCircle(createEmptyDocument()), null);

  const one = doc({
    householdPersonIds: ["p1"],
    persons: [createPerson({ id: "p1", gender: "female", x: 10, y: 20, ecomapX: 0, ecomapY: 0 })],
  });
  const circle = householdCircle(one);
  assert.ok(circle);
  assert.equal(circle.cx, 0);
  assert.equal(circle.cy, 0);
  assert.ok(circle.r >= 72);
});

test("seed fills missing ecomap coordinates but does not overwrite existing ones", () => {
  const document = doc({
    persons: [
      createPerson({
        id: "ip",
        gender: "male",
        x: 400,
        y: 400,
        indexPerson: true,
        ecomapX: 12,
        ecomapY: 34,
      }),
      createPerson({ id: "spouse", gender: "female", x: 520, y: 400 }),
    ],
    relationships: [{ id: "m", from: "ip", to: "spouse", type: "marriage" }],
  });

  const seeded = seedEcomapLayout(document);
  const ip = seeded.persons.find((p) => p.id === "ip");
  const spouse = seeded.persons.find((p) => p.id === "spouse");

  assert.deepEqual(seeded.householdPersonIds, ["ip", "spouse"]);
  assert.equal(ip?.ecomapX, 12);
  assert.equal(ip?.ecomapY, 34);
  assert.equal(typeof spouse?.ecomapX, "number");
  assert.equal(typeof spouse?.ecomapY, "number");
  assert.notEqual(spouse?.ecomapX, 520);
});

test("systems are placed evenly outside the household rim", () => {
  const points = placeSystemsAroundHousehold({ cx: 0, cy: 0, r: 80 }, 4);
  assert.equal(points.length, 4);
  assert.ok(points[0].y < 0);
  assert.ok(Math.abs(points[0].x) < 1);
  for (const point of points) {
    assert.ok(Math.hypot(point.x, point.y) > 80);
  }
});

test("compact household layout is centered and stable", () => {
  const members = [
    createPerson({ id: "a", gender: "male", x: 9, y: 1 }),
    createPerson({ id: "b", gender: "female", x: 1, y: 1 }),
  ];
  const pos = compactHouseholdPositions(members);
  assert.equal(pos.size, 2);
  const xs = [...pos.values()].map((p) => p.x);
  assert.ok(Math.min(...xs) < 0);
  assert.ok(Math.max(...xs) > 0);
});
