import assert from "node:assert/strict";
import test from "node:test";
import {
  ECO_FAMILY_REL_OPTIONS,
  ECO_FLOW_OPTIONS,
  ECO_QUALITY_OPTIONS,
  ECO_STRENGTH_OPTIONS,
  ECO_SYSTEM_LABELS,
  ECO_SYSTEM_PRESETS,
  HOUSEHOLD_ID,
} from "../../src/types/ecomapCatalog";

test("ecomap catalog exposes household endpoint id and system presets", () => {
  assert.equal(HOUSEHOLD_ID, "household");
  const categories = ECO_SYSTEM_PRESETS.map((item) => item.category);
  assert.ok(categories.includes("school"));
  assert.ok(categories.includes("work"));
  assert.ok(categories.includes("custom"));
  assert.equal(ECO_SYSTEM_LABELS.school, "學校／教育");
});

test("ecomap family ties cover the household relationships the view draws", () => {
  assert.deepEqual(
    ECO_FAMILY_REL_OPTIONS.map((o) => o.value),
    ["marriage", "parent", "adoptiveParent", "twin"]
  );
});

test("ecomap link attributes cover strength, quality, and flow", () => {
  assert.deepEqual(
    ECO_STRENGTH_OPTIONS.map((o) => o.value),
    ["strong", "moderate", "weak"]
  );
  assert.deepEqual(
    ECO_QUALITY_OPTIONS.map((o) => o.value),
    ["supportive", "stressful", "mixed", "cutoff"]
  );
  assert.deepEqual(
    ECO_FLOW_OPTIONS.map((o) => o.value),
    ["none", "inward", "outward", "both"]
  );
});
