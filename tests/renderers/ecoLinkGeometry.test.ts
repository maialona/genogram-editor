import assert from "node:assert/strict";
import test from "node:test";
import { describeEcoLink } from "../../src/renderers/ecoLinkGeometry";

test("strong supportive link is a thick solid line", () => {
  const model = describeEcoLink(
    { strength: "strong", quality: "supportive", flow: "none" },
    { x: 0, y: 0 },
    { x: 100, y: 0 }
  );
  assert.equal(model.strokeWidth, 3.5);
  assert.equal(model.dash, undefined);
  assert.equal(model.path, "M 0 0 L 100 0");
  assert.equal(model.arrows.length, 0);
  assert.equal(model.hashes.length, 0);
});

test("weak cutoff link is dashed with mid-line crosses", () => {
  const model = describeEcoLink(
    { strength: "weak", quality: "cutoff", flow: "none" },
    { x: 0, y: 0 },
    { x: 80, y: 0 }
  );
  assert.equal(model.dash, "6 5");
  assert.equal(model.crosses.length, 2);
});

test("stressful mixed and flow combinations", () => {
  const stressful = describeEcoLink(
    { strength: "moderate", quality: "stressful", flow: "outward" },
    { x: 0, y: 0 },
    { x: 40, y: 0 }
  );
  assert.match(stressful.path, /^M /);
  assert.notEqual(stressful.path, "M 0 0 L 40 0");
  assert.equal(stressful.arrows.length, 1);
  assert.equal(stressful.arrows[0].tipX, 40);

  const mixedBoth = describeEcoLink(
    { strength: "strong", quality: "mixed", flow: "both" },
    { x: 0, y: 0 },
    { x: 60, y: 0 }
  );
  assert.ok(mixedBoth.hashes.length >= 3);
  assert.equal(mixedBoth.arrows.length, 2);

  const inward = describeEcoLink(
    { strength: "moderate", quality: "supportive", flow: "inward" },
    { x: 0, y: 0 },
    { x: 50, y: 0 }
  );
  assert.equal(inward.arrows[0].tipX, 0);
  assert.ok(inward.arrows[0].ux < 0);
});
