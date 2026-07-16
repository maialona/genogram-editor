import {
  type CSSProperties,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  edgeGlowConfig,
  shouldAnimateEdgeGlow,
} from "./edgeGlowConfig";
import {
  createEdgeGlowRenderer,
  type EdgeGlowRenderer,
} from "./edgeGlowRenderer";

type EdgeGlowVariables = CSSProperties & Record<`--edge-glow-${string}`, string | number>;

function colorToCss(color: readonly [number, number, number]) {
  return `rgb(${Math.round(color[0] * 255)} ${Math.round(color[1] * 255)} ${Math.round(color[2] * 255)})`;
}

export function AiEdgeGlowMarkup({
  active,
  fallback,
  canvasRef,
}: {
  active: boolean;
  fallback: boolean;
  canvasRef?: Ref<HTMLCanvasElement>;
}) {
  const className = `ai-edge-glow${active ? " is-active" : ""}${fallback ? " is-fallback" : ""}`;

  return (
    <div className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="ai-edge-glow-canvas"
        aria-hidden="true"
      />
      {fallback && (
        <div className="ai-edge-glow-fallback" aria-hidden="true">
          {edgeGlowConfig.lights.map((light) => {
            const phaseDelay = -(
              (light.phase / (Math.PI * 2)) *
              light.period
            );
            const style: EdgeGlowVariables = {
              "--edge-glow-color": colorToCss(light.color),
              "--edge-glow-x": `${light.fallback.x}%`,
              "--edge-glow-y": `${light.fallback.y}%`,
              "--edge-glow-width": `${light.fallback.width}px`,
              "--edge-glow-height": `${light.fallback.height}px`,
              "--edge-glow-blur": `${light.fallback.blur}px`,
              "--edge-glow-drift-x": `${light.fallback.driftX}px`,
              "--edge-glow-drift-y": `${light.fallback.driftY}px`,
              "--edge-glow-duration": `${light.period}s`,
              "--edge-glow-delay": `${phaseDelay}s`,
              "--edge-glow-intensity": light.intensity,
              "--edge-glow-static-intensity": light.fallback.staticIntensity,
            };
            return (
              <span key={light.name} className="ai-edge-glow-blob" style={style}>
                <span className="ai-edge-glow-blob-atmosphere" />
                <span className="ai-edge-glow-blob-bloom" />
                <span className="ai-edge-glow-blob-core" />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AiEdgeGlow({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!active) {
      setFallback(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: EdgeGlowRenderer | null = createEdgeGlowRenderer(canvas);
    if (!renderer) {
      setFallback(true);
      return;
    }

    setFallback(false);
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let reducedMotion = reducedMotionQuery.matches;
    let visible = !document.hidden;
    let focused = document.hasFocus();
    let frameId = 0;
    let elapsedMs = 0;
    let lastFrameMs: number | null = null;
    let disposed = false;
    const minimumFrameInterval = 1000 / edgeGlowConfig.maxFramesPerSecond;

    const stopFrame = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameMs = null;
    };

    const renderFrame = (timestampMs: number) => {
      if (!renderer || disposed) return;
      if (
        lastFrameMs != null &&
        timestampMs - lastFrameMs < minimumFrameInterval
      ) {
        frameId = requestAnimationFrame(renderFrame);
        return;
      }
      if (lastFrameMs != null) elapsedMs += timestampMs - lastFrameMs;
      lastFrameMs = timestampMs;
      renderer.render(elapsedMs, false);
      frameId = requestAnimationFrame(renderFrame);
    };

    const syncRendering = () => {
      stopFrame();
      if (!renderer || disposed) return;
      renderer.resize();
      if (shouldAnimateEdgeGlow(active, visible, focused, reducedMotion)) {
        frameId = requestAnimationFrame(renderFrame);
      } else {
        renderer.render(reducedMotion ? 0 : elapsedMs, reducedMotion);
      }
    };

    const handleVisibility = () => {
      visible = !document.hidden;
      syncRendering();
    };
    const handleFocus = () => {
      focused = true;
      syncRendering();
    };
    const handleBlur = () => {
      focused = false;
      syncRendering();
    };
    const handleResize = () => syncRendering();
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      syncRendering();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopFrame();
      renderer?.dispose();
      renderer = null;
      setFallback(true);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("resize", handleResize);
    reducedMotionQuery.addEventListener("change", handleMotionPreference);
    canvas.addEventListener("webglcontextlost", handleContextLost);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleResize);
    resizeObserver?.observe(document.documentElement);
    syncRendering();

    return () => {
      disposed = true;
      stopFrame();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", handleResize);
      reducedMotionQuery.removeEventListener("change", handleMotionPreference);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      renderer?.dispose();
      renderer = null;
    };
  }, [active]);

  return (
    <AiEdgeGlowMarkup
      active={active}
      fallback={fallback}
      canvasRef={canvasRef}
    />
  );
}
