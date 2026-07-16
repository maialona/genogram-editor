import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const moduleUrl = new URL(
  "../../src/components/AiEdgeGlow/edgeGlowShaders.ts",
  import.meta.url
);

test("fragment shader models a rounded viewport perimeter", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { EDGE_GLOW_FRAGMENT_SHADER } = await import(moduleUrl.href);

  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /sdRoundedBox/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /roundedPerimeterPosition/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /closestBoundaryPoint/);
  assert.doesNotMatch(EDGE_GLOW_FRAGMENT_SHADER, /float epsilon/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /wrappedPerimeterDistance/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /for\s*\(int i = 0; i < 7; i\+\+\)/);
});

test("vertex shader uses a WebGL2-safe full-screen triangle table", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { EDGE_GLOW_VERTEX_SHADER } = await import(moduleUrl.href);

  assert.match(EDGE_GLOW_VERTEX_SHADER, /const vec2 POSITIONS\[3\]/);
  assert.match(EDGE_GLOW_VERTEX_SHADER, /POSITIONS\[gl_VertexID\]/);
  assert.doesNotMatch(EDGE_GLOW_VERTEX_SHADER, /<<|\s&\s/);
});

test("fragment shader separates core, bloom, atmosphere, and imperfect light", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { EDGE_GLOW_FRAGMENT_SHADER } = await import(moduleUrl.href);

  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /coreGlow/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /bloomGlow/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /atmosphericGlow/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /smoothFalloff/);
  assert.doesNotMatch(EDGE_GLOW_FRAGMENT_SHADER, /float gaussian/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /visibilityEnvelope/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /motion\.y \* uDpr/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /hashNoise/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /accumulatedColor\s*\+=/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /normalizedLightColor/);
  assert.doesNotMatch(EDGE_GLOW_FRAGMENT_SHADER, /hue-rotate|conic-gradient/i);
});

test("light drift combines multiple low-frequency waves instead of linear rotation", async () => {
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true);
  const { EDGE_GLOW_FRAGMENT_SHADER } = await import(moduleUrl.href);

  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /driftPrimary/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /driftSecondary/);
  assert.match(EDGE_GLOW_FRAGMENT_SHADER, /driftTertiary/);
  assert.doesNotMatch(EDGE_GLOW_FRAGMENT_SHADER, /uTime\s*\+\s*basePosition/);
});
