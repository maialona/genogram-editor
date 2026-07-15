import type { Viewport } from "../types/document";
import { GRID_SIZE } from "./constants";

interface GridProps {
  viewport: Viewport;
  width: number;
  height: number;
}

/**
 * Infinite-feeling grid that follows viewport pan/zoom.
 * Pure render — no state.
 */
export function Grid({ viewport, width, height }: GridProps) {
  const { scale, offsetX, offsetY } = viewport;
  const step = GRID_SIZE * scale;

  if (step < 8) return null;

  // World-space origin in screen coords
  const originScreenX = offsetX;
  const originScreenY = offsetY;

  const startX = ((originScreenX % step) + step) % step;
  const startY = ((originScreenY % step) + step) % step;

  const lines: React.ReactElement[] = [];
  let i = 0;

  for (let x = startX; x < width; x += step) {
    lines.push(
      <line
        key={`v-${i++}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    );
  }
  for (let y = startY; y < height; y += step) {
    lines.push(
      <line
        key={`h-${i++}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    );
  }

  return (
    <g className="grid-layer" pointerEvents="none">
      {lines}
    </g>
  );
}
