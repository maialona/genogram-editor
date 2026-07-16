export type EdgeGlowColorName =
  | "hot-pink"
  | "deep-red"
  | "orange"
  | "amber"
  | "acid-green"
  | "cyan"
  | "violet";

export interface EdgeGlowLight {
  name: EdgeGlowColorName;
  color: readonly [number, number, number];
  basePosition: number;
  radius: number;
  intensity: number;
  period: number;
  phase: number;
  driftAmplitude: number;
  inwardSpread: number;
  fallback: {
    x: number;
    y: number;
    width: number;
    height: number;
    blur: number;
    driftX: number;
    driftY: number;
    staticIntensity: number;
  };
}

export interface EdgeGlowConfig {
  cornerRadius: number;
  coreWidth: number;
  bloomWidth: number;
  atmosphericWidth: number;
  mobileBloomWidth: number;
  mobileAtmosphericWidth: number;
  globalIntensity: number;
  grainAmount: number;
  animationSpeed: number;
  renderScale: number;
  maxFramesPerSecond: number;
  bandIntensity: {
    core: number;
    bloom: number;
    atmosphere: number;
  };
  alphaCeiling: number;
  maxDevicePixelRatio: number;
  mobileBreakpoint: number;
  lights: readonly EdgeGlowLight[];
}

export const edgeGlowConfig = {
  cornerRadius: 30,
  coreWidth: 1.5,
  bloomWidth: 24,
  atmosphericWidth: 110,
  mobileBloomWidth: 18,
  mobileAtmosphericWidth: 68,
  globalIntensity: 1,
  grainAmount: 0.025,
  animationSpeed: 0.65,
  renderScale: 0.55,
  maxFramesPerSecond: 30,
  bandIntensity: {
    core: 1.45,
    bloom: 0.72,
    atmosphere: 0.28,
  },
  alphaCeiling: 0.96,
  maxDevicePixelRatio: 2,
  mobileBreakpoint: 640,
  lights: [
    {
      name: "hot-pink",
      color: [1, 0.035, 0.45],
      basePosition: 0.035,
      radius: 128,
      intensity: 0.92,
      period: 17,
      phase: 0.35,
      driftAmplitude: 0.045,
      inwardSpread: 0.92,
      fallback: { x: 78, y: -6, width: 310, height: 170, blur: 30, driftX: 34, driftY: 10, staticIntensity: 0.72 },
    },
    {
      name: "deep-red",
      color: [0.82, 0.012, 0.025],
      basePosition: 0.61,
      radius: 104,
      intensity: 0.82,
      period: 23,
      phase: 2.2,
      driftAmplitude: 0.032,
      inwardSpread: 0.78,
      fallback: { x: 103, y: 36, width: 220, height: 300, blur: 34, driftX: -8, driftY: 42, staticIntensity: 0.06 },
    },
    {
      name: "orange",
      color: [1, 0.22, 0.018],
      basePosition: 0.285,
      radius: 146,
      intensity: 0.88,
      period: 14,
      phase: 4.65,
      driftAmplitude: 0.052,
      inwardSpread: 1.08,
      fallback: { x: 102, y: 82, width: 260, height: 230, blur: 32, driftX: -16, driftY: -38, staticIntensity: 0.48 },
    },
    {
      name: "amber",
      color: [1, 0.62, 0.035],
      basePosition: 0.86,
      radius: 136,
      intensity: 0.78,
      period: 27,
      phase: 5.72,
      driftAmplitude: 0.038,
      inwardSpread: 1.16,
      fallback: { x: 57, y: 104, width: 330, height: 190, blur: 36, driftX: 48, driftY: -12, staticIntensity: 0.08 },
    },
    {
      name: "acid-green",
      color: [0.48, 1, 0.035],
      basePosition: 0.445,
      radius: 118,
      intensity: 0.72,
      period: 19,
      phase: 1.28,
      driftAmplitude: 0.041,
      inwardSpread: 0.86,
      fallback: { x: 18, y: 104, width: 270, height: 190, blur: 34, driftX: 42, driftY: -10, staticIntensity: 0.1 },
    },
    {
      name: "cyan",
      color: [0.025, 0.82, 1],
      basePosition: 0.72,
      radius: 152,
      intensity: 0.86,
      period: 25,
      phase: 3.46,
      driftAmplitude: 0.048,
      inwardSpread: 1.22,
      fallback: { x: -4, y: 64, width: 250, height: 330, blur: 38, driftX: 10, driftY: -48, staticIntensity: 0.66 },
    },
    {
      name: "violet",
      color: [0.4, 0.08, 1],
      basePosition: 0.165,
      radius: 112,
      intensity: 0.84,
      period: 12.7,
      phase: 0.92,
      driftAmplitude: 0.034,
      inwardSpread: 0.94,
      fallback: { x: 8, y: -5, width: 250, height: 180, blur: 30, driftX: 38, driftY: 12, staticIntensity: 0.12 },
    },
  ],
} as const satisfies EdgeGlowConfig;

export function clampEdgeGlowDpr(
  value: number,
  max: number = edgeGlowConfig.maxDevicePixelRatio
) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(value, max);
}

export function resolveEdgeGlowWidths(
  viewportWidth: number,
  config: EdgeGlowConfig = edgeGlowConfig
) {
  const mobile = viewportWidth <= config.mobileBreakpoint;
  return {
    coreWidth: config.coreWidth,
    bloomWidth: mobile ? config.mobileBloomWidth : config.bloomWidth,
    atmosphericWidth: mobile
      ? config.mobileAtmosphericWidth
      : config.atmosphericWidth,
  };
}

export function shouldAnimateEdgeGlow(
  active: boolean,
  visible: boolean,
  focused: boolean,
  reducedMotion: boolean
) {
  return active && visible && focused && !reducedMotion;
}
