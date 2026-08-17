import assert from "node:assert/strict";
import test from "node:test";
import { resolveEcomapConnect } from "../../../src/components/Canvas/ecoConnect";
import { HOUSEHOLD_ID } from "../../../src/types/ecomapCatalog";

const systems = new Set(["s-school", "s-work"]);

test("person to person becomes a family relationship", () => {
  assert.deepEqual(resolveEcomapConnect("p1", "p2", systems), {
    kind: "relationship",
    from: "p1",
    to: "p2",
  });
});

test("person or household to a system becomes an eco-link", () => {
  assert.deepEqual(resolveEcomapConnect("p1", "s-school", systems), {
    kind: "ecoLink",
    from: { kind: "person", personId: "p1" },
    to: "s-school",
  });
  assert.deepEqual(resolveEcomapConnect(HOUSEHOLD_ID, "s-work", systems), {
    kind: "ecoLink",
    from: { kind: "household" },
    to: "s-work",
  });
});

test("dragging from a system still attaches the eco-link on the family side", () => {
  assert.deepEqual(resolveEcomapConnect("s-school", "p1", systems), {
    kind: "ecoLink",
    from: { kind: "person", personId: "p1" },
    to: "s-school",
  });
  assert.deepEqual(resolveEcomapConnect("s-work", HOUSEHOLD_ID, systems), {
    kind: "ecoLink",
    from: { kind: "household" },
    to: "s-work",
  });
});

test("household-to-person and system-to-system are ignored", () => {
  assert.deepEqual(resolveEcomapConnect(HOUSEHOLD_ID, "p1", systems), {
    kind: "none",
  });
  assert.deepEqual(resolveEcomapConnect("s-school", "s-work", systems), {
    kind: "none",
  });
  assert.deepEqual(resolveEcomapConnect("p1", "p1", systems), { kind: "none" });
});
