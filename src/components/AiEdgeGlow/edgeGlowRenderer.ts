import {
  clampEdgeGlowDpr,
  edgeGlowConfig,
  type EdgeGlowConfig,
  type EdgeGlowLight,
  resolveEdgeGlowWidths,
} from "./edgeGlowConfig";
import {
  EDGE_GLOW_FRAGMENT_SHADER,
  EDGE_GLOW_VERTEX_SHADER,
} from "./edgeGlowShaders";

export interface EdgeGlowRenderer {
  resize: (cssWidth?: number, cssHeight?: number, dpr?: number) => void;
  render: (timestampMs: number, reducedMotion: boolean) => void;
  clear: () => void;
  dispose: () => void;
}

export function computeEdgeGlowResolution(
  cssWidth: number,
  cssHeight: number,
  requestedDpr: number
) {
  const dpr = clampEdgeGlowDpr(requestedDpr);
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
  };
}

export function flattenEdgeGlowUniforms(lights: readonly EdgeGlowLight[]) {
  const colors: number[] = [];
  const motion: number[] = [];
  const shape: number[] = [];

  for (const light of lights) {
    colors.push(...light.color, light.intensity);
    motion.push(
      light.basePosition,
      light.radius,
      light.period,
      light.phase
    );
    shape.push(light.driftAmplitude, light.inwardSpread, 0, 0);
  }

  return { colors, motion, shape };
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create edge glow shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const stage = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    const message =
      gl.getShaderInfoLog(shader) || `Edge glow ${stage} shader compile failed`;
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function requiredUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string
) {
  const location = gl.getUniformLocation(program, name);
  if (location == null) throw new Error(`Missing edge glow uniform: ${name}`);
  return location;
}

export function createEdgeGlowRenderer(
  canvas: HTMLCanvasElement,
  config: EdgeGlowConfig = edgeGlowConfig
): EdgeGlowRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  let vertexShader: WebGLShader | null = null;
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;

  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, EDGE_GLOW_VERTEX_SHADER);
    fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      EDGE_GLOW_FRAGMENT_SHADER
    );
    program = gl.createProgram();
    if (!program) throw new Error("Unable to create edge glow program");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Edge glow program link failed");
    }

    vertexArray = gl.createVertexArray();
    if (!vertexArray) throw new Error("Unable to create edge glow vertex array");

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    vertexShader = null;
    fragmentShader = null;
  } catch (error) {
    if (vertexArray) gl.deleteVertexArray(vertexArray);
    if (program) gl.deleteProgram(program);
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    console.warn("[AiEdgeGlow] WebGL initialization failed", error);
    return null;
  }

  const linkedProgram = program;
  const linkedVertexArray = vertexArray;
  const uniforms = {
    resolution: requiredUniform(gl, linkedProgram, "uResolution"),
    dpr: requiredUniform(gl, linkedProgram, "uDpr"),
    time: requiredUniform(gl, linkedProgram, "uTime"),
    reducedMotion: requiredUniform(gl, linkedProgram, "uReducedMotion"),
    cornerRadius: requiredUniform(gl, linkedProgram, "uCornerRadius"),
    coreWidth: requiredUniform(gl, linkedProgram, "uCoreWidth"),
    bloomWidth: requiredUniform(gl, linkedProgram, "uBloomWidth"),
    atmosphericWidth: requiredUniform(gl, linkedProgram, "uAtmosphericWidth"),
    globalIntensity: requiredUniform(gl, linkedProgram, "uGlobalIntensity"),
    grainAmount: requiredUniform(gl, linkedProgram, "uGrainAmount"),
    animationSpeed: requiredUniform(gl, linkedProgram, "uAnimationSpeed"),
    bandIntensity: requiredUniform(gl, linkedProgram, "uBandIntensity"),
    alphaCeiling: requiredUniform(gl, linkedProgram, "uAlphaCeiling"),
    lightColors: requiredUniform(gl, linkedProgram, "uLightColors[0]"),
    lightMotion: requiredUniform(gl, linkedProgram, "uLightMotion[0]"),
    lightShape: requiredUniform(gl, linkedProgram, "uLightShape[0]"),
  };
  const packedLights = flattenEdgeGlowUniforms(config.lights);
  let disposed = false;

  gl.useProgram(linkedProgram);
  gl.bindVertexArray(linkedVertexArray);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform1f(uniforms.globalIntensity, config.globalIntensity);
  gl.uniform1f(uniforms.grainAmount, config.grainAmount);
  gl.uniform1f(uniforms.animationSpeed, config.animationSpeed);
  gl.uniform3f(
    uniforms.bandIntensity,
    config.bandIntensity.core,
    config.bandIntensity.bloom,
    config.bandIntensity.atmosphere
  );
  gl.uniform1f(uniforms.alphaCeiling, config.alphaCeiling);
  gl.uniform4fv(uniforms.lightColors, new Float32Array(packedLights.colors));
  gl.uniform4fv(uniforms.lightMotion, new Float32Array(packedLights.motion));
  gl.uniform4fv(uniforms.lightShape, new Float32Array(packedLights.shape));

  const clear = () => {
    if (disposed) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const resize = (
    cssWidth = canvas.clientWidth || window.innerWidth,
    cssHeight = canvas.clientHeight || window.innerHeight,
    requestedDpr = window.devicePixelRatio || 1
  ) => {
    if (disposed || cssWidth <= 0 || cssHeight <= 0) return;
    const effectiveDpr =
      clampEdgeGlowDpr(requestedDpr, config.maxDevicePixelRatio) *
      config.renderScale;
    const resolution = computeEdgeGlowResolution(
      cssWidth,
      cssHeight,
      effectiveDpr
    );
    if (canvas.width !== resolution.width) canvas.width = resolution.width;
    if (canvas.height !== resolution.height) canvas.height = resolution.height;

    const widths = resolveEdgeGlowWidths(cssWidth, config);
    gl.viewport(0, 0, resolution.width, resolution.height);
    gl.useProgram(linkedProgram);
    gl.uniform2f(uniforms.resolution, resolution.width, resolution.height);
    gl.uniform1f(uniforms.dpr, resolution.dpr);
    gl.uniform1f(uniforms.cornerRadius, config.cornerRadius * resolution.dpr);
    gl.uniform1f(uniforms.coreWidth, widths.coreWidth * resolution.dpr);
    gl.uniform1f(uniforms.bloomWidth, widths.bloomWidth * resolution.dpr);
    gl.uniform1f(
      uniforms.atmosphericWidth,
      widths.atmosphericWidth * resolution.dpr
    );
  };

  const render = (timestampMs: number, reducedMotion: boolean) => {
    if (disposed || canvas.width <= 0 || canvas.height <= 0) return;
    gl.useProgram(linkedProgram);
    gl.bindVertexArray(linkedVertexArray);
    gl.uniform1f(uniforms.time, timestampMs / 1000);
    gl.uniform1f(uniforms.reducedMotion, reducedMotion ? 1 : 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const dispose = () => {
    if (disposed) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.deleteVertexArray(linkedVertexArray);
    gl.deleteProgram(linkedProgram);
    const loseContext = gl.getExtension("WEBGL_lose_context");
    disposed = true;
    window.setTimeout(() => {
      if (!canvas.isConnected) loseContext?.loseContext();
    }, 0);
  };

  resize();
  return { resize, render, clear, dispose };
}
