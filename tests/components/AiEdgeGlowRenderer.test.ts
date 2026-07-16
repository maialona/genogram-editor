import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { edgeGlowConfig } from "../../src/components/AiEdgeGlow/edgeGlowConfig";

const moduleUrl = new URL(
  "../../src/components/AiEdgeGlow/edgeGlowRenderer.ts",
  import.meta.url
);

test("renderer helpers cap DPR and calculate integer backing resolution", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { computeEdgeGlowResolution } = await import(moduleUrl.href);

  assert.deepEqual(computeEdgeGlowResolution(800, 600, 3), {
    width: 1600,
    height: 1200,
    dpr: 2,
  });
  assert.deepEqual(computeEdgeGlowResolution(390.4, 844.2, 1.5), {
    width: 586,
    height: 1266,
    dpr: 1.5,
  });
});

test("renderer packs seven stable light uniform vectors", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { flattenEdgeGlowUniforms } = await import(moduleUrl.href);
  const packed = flattenEdgeGlowUniforms(edgeGlowConfig.lights);

  assert.equal(packed.colors.length, 28);
  assert.equal(packed.motion.length, 28);
  assert.equal(packed.shape.length, 28);
  assert.deepEqual(Array.from(packed.colors.slice(0, 4)), [1, 0.035, 0.45, 0.92]);
  assert.deepEqual(Array.from(packed.motion.slice(0, 4)), [0.035, 128, 17, 0.35]);
  assert.deepEqual(Array.from(packed.shape.slice(0, 2)), [0.045, 0.92]);
});

test("renderer source releases GPU resources and the WebGL context", () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const source = readFileSync(fileURLToPath(moduleUrl), "utf8");

  assert.match(source, /deleteVertexArray/);
  assert.match(source, /deleteProgram/);
  assert.match(source, /WEBGL_lose_context/);
  assert.match(source, /canvas\.isConnected/);
  assert.match(source, /loseContext\(\)/);
});
