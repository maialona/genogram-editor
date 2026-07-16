import type { RelationshipType } from "../types/document";

export interface EmotionalDrawCtx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  ux: number;
  uy: number;
  px: number;
  py: number;
  selected: boolean;
  selectionColor: string;
}

const GREEN = "#16a34a";
const RED = "#dc2626";
const BLUE = "#2563eb";
const BLACK = "#1a1a1a";

function pickStroke(base: string, selected: boolean, selectionColor: string) {
  return selected ? selectionColor : base;
}

/** Straight multi-line with optional dash / color. */
function parallelLines(
  ctx: EmotionalDrawCtx,
  count: number,
  gap: number,
  stroke: string,
  strokeWidth: number,
  dash?: string
) {
  const { x1, y1, x2, y2, px, py } = ctx;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * gap;
    lines.push(
      <line
        key={i}
        x1={x1 + px * off}
        y1={y1 + py * off}
        x2={x2 + px * off}
        y2={y2 + py * off}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />
    );
  }
  return <g>{lines}</g>;
}

function zigzagPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number,
  waves: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  let d = `M ${x1} ${y1}`;
  const steps = Math.max(waves * 2, 4);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const sign = i % 2 === 0 ? 1 : -1;
    const x = x1 + dx * t + px * amplitude * sign;
    const y = y1 + dy * t + py * amplitude * sign;
    d += ` L ${x} ${y}`;
  }
  return d;
}

function sinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number,
  waves: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const segments = Math.max(16, Math.floor(len / 6));
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 2 * waves) * amplitude;
    d += ` L ${x1 + dx * t + px * wave} ${y1 + dy * t + py * wave}`;
  }
  return d;
}

function arrowHead(
  tipX: number,
  tipY: number,
  ux: number,
  uy: number,
  px: number,
  py: number,
  size: number,
  fill: string
) {
  const baseX = tipX - ux * size;
  const baseY = tipY - uy * size;
  const a1x = baseX + px * size * 0.55;
  const a1y = baseY + py * size * 0.55;
  const a2x = baseX - px * size * 0.55;
  const a2y = baseY - py * size * 0.55;
  return (
    <polygon
      points={`${tipX},${tipY} ${a1x},${a1y} ${a2x},${a2y}`}
      fill={fill}
    />
  );
}

/**
 * Emotional relationship symbols aligned to standard genogram charts.
 */
export function renderEmotionalLine(
  type: RelationshipType,
  ctx: EmotionalDrawCtx
): React.ReactNode | null {
  const sw = 2;
  const { x1, y1, x2, y2, midX, midY, ux, uy, px, py, selected, selectionColor } =
    ctx;

  switch (type) {
    case "harmony": {
      const s = pickStroke(GREEN, selected, selectionColor);
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={s}
          strokeWidth={sw}
        />
      );
    }

    case "indifferent": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={s}
          strokeWidth={sw}
          strokeDasharray="2 4"
        />
      );
    }

    case "love": {
      const s = pickStroke(GREEN, selected, selectionColor);
      return (
        <g>
          <line x1={x1} y1={y1} x2={midX - 6} y2={midY} stroke={s} strokeWidth={sw} />
          <line x1={midX + 6} y1={midY} x2={x2} y2={y2} stroke={s} strokeWidth={sw} />
          <circle cx={midX} cy={midY} r={5} fill="#fff" stroke={s} strokeWidth={sw} />
        </g>
      );
    }

    case "inLove": {
      const s = pickStroke(GREEN, selected, selectionColor);
      return (
        <g>
          <line x1={x1} y1={y1} x2={midX - 10} y2={midY} stroke={s} strokeWidth={sw} />
          <line x1={midX + 10} y1={midY} x2={x2} y2={y2} stroke={s} strokeWidth={sw} />
          <circle cx={midX} cy={midY} r={7} fill="none" stroke={s} strokeWidth={sw} />
          <circle cx={midX} cy={midY} r={3.5} fill="none" stroke={s} strokeWidth={sw} />
        </g>
      );
    }

    case "close": {
      const s = pickStroke(GREEN, selected, selectionColor);
      return parallelLines(ctx, 2, 5, s, sw);
    }

    case "veryClose": {
      const s = pickStroke(GREEN, selected, selectionColor);
      return (
        <g>
          {parallelLines(ctx, 3, 4, s, sw)}
          {/* cross-hatch suggestion between outer lines */}
          <path
            d={zigzagPath(x1, y1, x2, y2, 3, 6)}
            fill="none"
            stroke={s}
            strokeWidth={1}
            opacity={0.7}
          />
        </g>
      );
    }

    case "conflict": {
      const s = pickStroke(RED, selected, selectionColor);
      return parallelLines(ctx, 2, 5, s, sw, "6 4");
    }

    case "hate": {
      const s = pickStroke(RED, selected, selectionColor);
      return parallelLines(ctx, 3, 4, s, sw, "5 3");
    }

    case "cutoff": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={midX - 8}
            y2={midY}
            stroke={s}
            strokeWidth={sw}
            strokeDasharray="6 4"
          />
          <line
            x1={midX + 8}
            y1={midY}
            x2={x2}
            y2={y2}
            stroke={s}
            strokeWidth={sw}
            strokeDasharray="6 4"
          />
          <line
            x1={midX - 3 + px * 7}
            y1={midY - 3 + py * 7}
            x2={midX - 3 - px * 7}
            y2={midY - 3 - py * 7}
            stroke={s}
            strokeWidth={sw}
          />
          <line
            x1={midX + 3 + px * 7}
            y1={midY + 3 + py * 7}
            x2={midX + 3 - px * 7}
            y2={midY + 3 - py * 7}
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "hostile": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <path
          d={sinePath(x1, y1, x2, y2, 5, 4)}
          fill="none"
          stroke={s}
          strokeWidth={sw}
        />
      );
    }

    case "distantHostile": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <g>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s} strokeWidth={sw} />
          <path
            d={sinePath(
              midX - ux * 18,
              midY - uy * 18,
              midX + ux * 18,
              midY + uy * 18,
              4,
              3
            )}
            fill="none"
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "closeHostile": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <g>
          {parallelLines(ctx, 2, 5, s, sw)}
          <path
            d={sinePath(x1, y1, x2, y2, 3.5, 4)}
            fill="none"
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "fusedHostile": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <g>
          {parallelLines(ctx, 3, 4, s, sw)}
          <path
            d={sinePath(x1, y1, x2, y2, 3, 4)}
            fill="none"
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "violence": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <path
          d={zigzagPath(x1, y1, x2, y2, 8, 5)}
          fill="none"
          stroke={s}
          strokeWidth={sw + 1}
          strokeLinejoin="miter"
        />
      );
    }

    case "abuse": {
      const s = pickStroke(BLUE, selected, selectionColor);
      return (
        <path
          d={sinePath(x1, y1, x2, y2, 5, 5)}
          fill="none"
          stroke={s}
          strokeWidth={sw}
        />
      );
    }

    case "physicalAbuse": {
      const s = pickStroke(BLUE, selected, selectionColor);
      return (
        <g>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s} strokeWidth={sw} />
          <path
            d={sinePath(x1, y1, x2, y2, 4, 4)}
            fill="none"
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "emotionalAbuse": {
      const s = pickStroke(BLUE, selected, selectionColor);
      return (
        <g>
          {parallelLines(ctx, 2, 4, s, sw)}
          <path
            d={sinePath(x1, y1, x2, y2, 3.5, 5)}
            fill="none"
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "sexualAbuse": {
      const s = pickStroke(BLUE, selected, selectionColor);
      return (
        <path
          d={zigzagPath(x1, y1, x2, y2, 7, 5)}
          fill="none"
          stroke={s}
          strokeWidth={sw}
        />
      );
    }

    case "neglect": {
      const s = pickStroke(BLUE, selected, selectionColor);
      const tipX = x2 - ux * 4;
      const tipY = y2 - uy * 4;
      return (
        <g>
          <line x1={x1} y1={y1} x2={tipX - ux * 8} y2={tipY - uy * 8} stroke={s} strokeWidth={sw} />
          {arrowHead(tipX, tipY, ux, uy, px, py, 10, s)}
        </g>
      );
    }

    case "manipulative": {
      const s = pickStroke(RED, selected, selectionColor);
      return (
        <g>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s} strokeWidth={sw} />
          <line
            x1={midX - 6}
            y1={midY - 6}
            x2={midX + 6}
            y2={midY + 6}
            stroke={s}
            strokeWidth={sw}
          />
          <line
            x1={midX + 6}
            y1={midY - 6}
            x2={midX - 6}
            y2={midY + 6}
            stroke={s}
            strokeWidth={sw}
          />
        </g>
      );
    }

    case "controlling": {
      const s = pickStroke(RED, selected, selectionColor);
      const tipX = x2 - ux * 4;
      const tipY = y2 - uy * 4;
      const box = 7;
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={midX - box - 2}
            y2={midY}
            stroke={s}
            strokeWidth={sw}
          />
          <rect
            x={midX - box}
            y={midY - box}
            width={box * 2}
            height={box * 2}
            fill="#fff"
            stroke={s}
            strokeWidth={sw}
          />
          <line
            x1={midX - 4}
            y1={midY - 4}
            x2={midX + 4}
            y2={midY + 4}
            stroke={s}
            strokeWidth={sw}
          />
          <line
            x1={midX + 4}
            y1={midY - 4}
            x2={midX - 4}
            y2={midY + 4}
            stroke={s}
            strokeWidth={sw}
          />
          <line
            x1={midX + box + 2}
            y1={midY}
            x2={tipX - ux * 8}
            y2={tipY - uy * 8}
            stroke={s}
            strokeWidth={sw}
          />
          {arrowHead(tipX, tipY, ux, uy, px, py, 10, s)}
        </g>
      );
    }

    case "focusedOn": {
      const s = pickStroke(BLACK, selected, selectionColor);
      const tipX = x2 - ux * 4;
      const tipY = y2 - uy * 4;
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={tipX - ux * 10}
            y2={tipY - uy * 10}
            stroke={s}
            strokeWidth={sw}
          />
          {arrowHead(tipX, tipY, ux, uy, px, py, 11, s)}
        </g>
      );
    }

    case "fanAdmire": {
      const s = pickStroke(BLACK, selected, selectionColor);
      const tipX = x2 - ux * 4;
      const tipY = y2 - uy * 4;
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={midX - 6}
            y2={midY}
            stroke={s}
            strokeWidth={sw}
          />
          <circle
            cx={midX}
            cy={midY}
            r={5}
            fill="#fff"
            stroke={s}
            strokeWidth={sw}
          />
          <line
            x1={midX + 6}
            y1={midY}
            x2={tipX - ux * 10}
            y2={tipY - uy * 10}
            stroke={s}
            strokeWidth={sw}
          />
          {arrowHead(tipX, tipY, ux, uy, px, py, 11, s)}
        </g>
      );
    }

    default:
      return null;
  }
}

export function isEmotionalType(type: RelationshipType): boolean {
  return renderEmotionalLine(type, {
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0,
    midX: 0.5,
    midY: 0,
    ux: 1,
    uy: 0,
    px: 0,
    py: 1,
    selected: false,
    selectionColor: "#000",
  }) != null;
}
