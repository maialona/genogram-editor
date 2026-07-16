export const EDGE_GLOW_VERTEX_SHADER = `#version 300 es
precision highp float;

out vec2 vUv;

const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  vec2 position = POSITIONS[gl_VertexID];
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const EDGE_GLOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform float uReducedMotion;
uniform float uCornerRadius;
uniform float uCoreWidth;
uniform float uBloomWidth;
uniform float uAtmosphericWidth;
uniform float uGlobalIntensity;
uniform float uGrainAmount;
uniform float uAnimationSpeed;
uniform vec3 uBandIntensity;
uniform float uAlphaCeiling;
uniform vec4 uLightColors[7];
uniform vec4 uLightMotion[7];
uniform vec4 uLightShape[7];

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float sdRoundedBox(vec2 point, vec2 halfSize, float radius) {
  vec2 q = abs(point) - halfSize + vec2(radius);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

vec2 closestBoundaryPoint(vec2 point, vec2 halfSize, float radius) {
  vec2 quadrant = vec2(point.x < 0.0 ? -1.0 : 1.0, point.y < 0.0 ? -1.0 : 1.0);
  vec2 absolutePoint = abs(point);
  vec2 straight = max(halfSize - vec2(radius), vec2(0.0));

  if (absolutePoint.x > straight.x && absolutePoint.y > straight.y) {
    vec2 cornerCenter = quadrant * straight;
    vec2 cornerDirection = point - cornerCenter;
    cornerDirection /= max(length(cornerDirection), 0.0001);
    return cornerCenter + cornerDirection * radius;
  }

  float verticalGap = abs(halfSize.x - absolutePoint.x);
  float horizontalGap = abs(halfSize.y - absolutePoint.y);
  if (verticalGap < horizontalGap) {
    return vec2(
      quadrant.x * halfSize.x,
      clamp(point.y, -straight.y, straight.y)
    );
  }
  return vec2(
    clamp(point.x, -straight.x, straight.x),
    quadrant.y * halfSize.y
  );
}

float roundedPerimeterPosition(vec2 point, vec2 halfSize, float radius) {
  vec2 straight = max(halfSize - vec2(radius), vec2(0.0));
  float horizontal = 2.0 * straight.x;
  float vertical = 2.0 * straight.y;
  float arc = 0.5 * PI * radius;
  float perimeter = 2.0 * horizontal + 2.0 * vertical + 4.0 * arc;
  float distanceAlong = 0.0;

  if (point.y >= straight.y && point.x >= -straight.x && point.x <= straight.x) {
    distanceAlong = point.x + straight.x;
  } else if (point.x > straight.x && point.y > straight.y) {
    vec2 relative = point - vec2(straight.x, straight.y);
    float angle = atan(relative.y, relative.x);
    distanceAlong = horizontal + (0.5 * PI - angle) * radius;
  } else if (point.x >= straight.x && point.y <= straight.y && point.y >= -straight.y) {
    distanceAlong = horizontal + arc + (straight.y - point.y);
  } else if (point.x > straight.x && point.y < -straight.y) {
    vec2 relative = point - vec2(straight.x, -straight.y);
    float angle = atan(relative.y, relative.x);
    distanceAlong = horizontal + arc + vertical + (-angle) * radius;
  } else if (point.y <= -straight.y && point.x <= straight.x && point.x >= -straight.x) {
    distanceAlong = horizontal + 2.0 * arc + vertical + (straight.x - point.x);
  } else if (point.x < -straight.x && point.y < -straight.y) {
    vec2 relative = point - vec2(-straight.x, -straight.y);
    float angle = atan(relative.y, relative.x);
    distanceAlong = 2.0 * horizontal + 2.0 * arc + vertical
      + (-0.5 * PI - angle) * radius;
  } else if (point.x <= -straight.x && point.y >= -straight.y && point.y <= straight.y) {
    distanceAlong = 2.0 * horizontal + 3.0 * arc + vertical
      + (point.y + straight.y);
  } else {
    vec2 relative = point - vec2(-straight.x, straight.y);
    float angle = atan(relative.y, relative.x);
    distanceAlong = 2.0 * horizontal + 3.0 * arc + 2.0 * vertical
      + (PI - angle) * radius;
  }

  return fract(distanceAlong / max(perimeter, 1.0));
}

float wrappedPerimeterDistance(float a, float b, float perimeter) {
  float normalizedDistance = abs(a - b);
  normalizedDistance = min(normalizedDistance, 1.0 - normalizedDistance);
  return normalizedDistance * perimeter;
}

float smoothFalloff(float value, float spread) {
  float normalized = value / max(spread, 0.0001);
  return 1.0 - smoothstep(0.0, 1.0, normalized);
}

float hashNoise(vec2 point) {
  vec3 p3 = fract(vec3(point.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 point = gl_FragCoord.xy - uResolution * 0.5;
  vec2 halfSize = uResolution * 0.5 - vec2(max(2.0, uCoreWidth * 1.5));
  float radius = min(uCornerRadius, min(halfSize.x, halfSize.y) - 1.0);
  float signedDistance = sdRoundedBox(point, halfSize, radius);
  float insideMask = 1.0 - smoothstep(0.0, max(1.0, 2.0 * uDpr), signedDistance);

  if (insideMask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 boundaryPoint = closestBoundaryPoint(point, halfSize, radius);
  float perimeterPosition = roundedPerimeterPosition(boundaryPoint, halfSize, radius);
  vec2 straight = max(halfSize - vec2(radius), vec2(0.0));
  float perimeter = 4.0 * (straight.x + straight.y) + TAU * radius;
  float inwardDistance = max(-signedDistance, 0.0);
  float edgeDistance = abs(signedDistance);
  float animatedTime = mix(uTime * uAnimationSpeed, 0.0, step(0.5, uReducedMotion));

  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;

  for (int i = 0; i < 7; i++) {
    vec4 colorData = uLightColors[i];
    vec4 motion = uLightMotion[i];
    vec4 shape = uLightShape[i];
    float angularSpeed = TAU / max(motion.z, 1.0);
    float driftPrimary = sin(animatedTime * angularSpeed + motion.w);
    float driftSecondary = sin(animatedTime * angularSpeed * 0.43 + motion.w * 1.73);
    float driftTertiary = sin(animatedTime * angularSpeed * 0.17 + motion.w * 2.31);
    float drift = driftPrimary * 0.62 + driftSecondary * 0.27 + driftTertiary * 0.11;
    float lightPosition = fract(motion.x + drift * shape.x);

    float pulseWave = 0.5 + 0.5 * sin(
      animatedTime * angularSpeed * 0.51 + motion.w * 1.91
    );
    float visibilityEnvelope = 0.08 + 0.92 * smoothstep(0.56, 0.92, pulseWave);
    float alongDistance = wrappedPerimeterDistance(
      perimeterPosition,
      lightPosition,
      perimeter
    );
    float lightRadius = motion.y * uDpr;

    float alongCore = smoothFalloff(alongDistance, lightRadius * 0.34);
    float alongBloom = smoothFalloff(alongDistance, lightRadius * 0.78);
    float alongAtmosphere = smoothFalloff(alongDistance, lightRadius * 1.38);
    float coreGlow = smoothFalloff(edgeDistance, uCoreWidth) * alongCore;
    float bloomGlow = smoothFalloff(inwardDistance, uBloomWidth) * alongBloom;
    float atmosphericGlow = smoothFalloff(
      inwardDistance,
      uAtmosphericWidth * shape.y
    ) * alongAtmosphere;

    float lightEnergy = (
      coreGlow * uBandIntensity.x
      + bloomGlow * uBandIntensity.y
      + atmosphericGlow * uBandIntensity.z
    ) * colorData.a * visibilityEnvelope * uGlobalIntensity * insideMask;

    accumulatedColor += colorData.rgb * lightEnergy;
    accumulatedAlpha += lightEnergy;
  }

  float strongestChannel = max(
    max(accumulatedColor.r, accumulatedColor.g),
    accumulatedColor.b
  );
  vec3 normalizedLightColor = accumulatedColor / max(strongestChannel, 0.0001);
  float mappedAlpha = clamp(
    1.0 - exp(-accumulatedAlpha),
    0.0,
    uAlphaCeiling
  );
  float grain = (hashNoise(gl_FragCoord.xy + floor(uTime * 11.0)) - 0.5)
    * uGrainAmount * mappedAlpha;
  normalizedLightColor = clamp(normalizedLightColor + grain, 0.0, 1.0);
  fragColor = vec4(normalizedLightColor * mappedAlpha, mappedAlpha);
}
`;
