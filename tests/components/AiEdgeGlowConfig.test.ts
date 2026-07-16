import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const moduleUrl = new URL(
  "../../src/components/AiEdgeGlow/edgeGlowConfig.ts",
  import.meta.url
);

test("edge glow centralizes seven independent cinematic light sources", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { edgeGlowConfig } = await import(moduleUrl.href);

  assert.equal(edgeGlowConfig.lights.length, 7);
  assert.deepEqual(
    edgeGlowConfig.lights.map((light) => light.name).sort(),
    ["acid-green", "amber", "cyan", "deep-red", "hot-pink", "orange", "violet"]
  );
  assert.ok(edgeGlowConfig.lights.every((light) => light.period >= 12 && light.period <= 28));
  assert.equal(new Set(edgeGlowConfig.lights.map((light) => light.phase)).size, 7);
  const staticHighlights = edgeGlowConfig.lights.filter(
    (light) => light.fallback.staticIntensity > 0.2
  );
  assert.ok(staticHighlights.length >= 2 && staticHighlights.length <= 4);
  assert.ok(edgeGlowConfig.atmosphericWidth >= 50);
  assert.ok(edgeGlowConfig.mobileAtmosphericWidth >= 24);
  assert.ok(edgeGlowConfig.mobileAtmosphericWidth <= 80);
  assert.ok(edgeGlowConfig.renderScale >= 0.5 && edgeGlowConfig.renderScale <= 0.75);
  assert.deepEqual(edgeGlowConfig.bandIntensity, {
    core: 1.45,
    bloom: 0.72,
    atmosphere: 0.28,
  });
  assert.ok(edgeGlowConfig.alphaCeiling >= 0.9 && edgeGlowConfig.alphaCeiling < 1);
  assert.ok(
    edgeGlowConfig.maxFramesPerSecond >= 24 &&
      edgeGlowConfig.maxFramesPerSecond <= 30
  );
});

test("edge glow helpers cap resolution and gate animation lifecycle", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const {
    clampEdgeGlowDpr,
    edgeGlowConfig,
    resolveEdgeGlowWidths,
    shouldAnimateEdgeGlow,
  } = await import(moduleUrl.href);

  assert.equal(clampEdgeGlowDpr(3), 2);
  assert.equal(clampEdgeGlowDpr(1.5), 1.5);
  assert.equal(clampEdgeGlowDpr(0), 1);

  const desktop = resolveEdgeGlowWidths(1440, edgeGlowConfig);
  const mobile = resolveEdgeGlowWidths(390, edgeGlowConfig);
  assert.equal(desktop.atmosphericWidth, edgeGlowConfig.atmosphericWidth);
  assert.equal(mobile.atmosphericWidth, edgeGlowConfig.mobileAtmosphericWidth);

  assert.equal(shouldAnimateEdgeGlow(true, true, true, false), true);
  assert.equal(shouldAnimateEdgeGlow(false, true, true, false), false);
  assert.equal(shouldAnimateEdgeGlow(true, false, true, false), false);
  assert.equal(shouldAnimateEdgeGlow(true, true, false, false), false);
  assert.equal(shouldAnimateEdgeGlow(true, true, true, true), false);
});
