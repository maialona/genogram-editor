import type { EcoLink, EcoLinkQuality, EcoLinkStrength } from "../types/document";
import { PERSON_HALF } from "./constants";
import {
  ECO_SYSTEM_RADIUS,
  type Circle,
  type Point,
} from "./ecomapLayout";

export const ECO_LINK_WIDTH: Record<EcoLinkStrength, number> = {
  strong: 3.5,
  moderate: 2,
  weak: 1.25,
};

export const ECO_LINK_COLOR: Record<EcoLinkQuality, string> = {
  supportive: "#166534",
  stressful: "#dc2626",
  mixed: "#b45309",
  cutoff: "#6b7280",
};

export interface EcoLinkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EcoLinkArrow {
  tipX: number;
  tipY: number;
  ux: number;
  uy: number;
  px: number;
  py: number;
}

export interface EcoLinkDrawModel {
  path: string;
  strokeWidth: number;
  dash: string | undefined;
  color: string;
  hashes: EcoLinkSegment[];
  crosses: EcoLinkSegment[];
  arrows: EcoLinkArrow[];
}

export function pointOnCircle(from: Point, circle: Circle): Point {
  const dx = from.x - circle.cx;
  const dy = from.y - circle.cy;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: circle.cx + (dx / len) * circle.r,
    y: circle.cy + (dy / len) * circle.r,
  };
}

export function pointOnRadius(from: Point, center: Point, radius: number): Point {
  const dx = from.x - center.x;
  const dy = from.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: center.x + (dx / len) * radius,
    y: center.y + (dy / len) * radius,
  };
}

export function zigzagPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude = 7,
  waves = 5
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const steps = Math.max(waves * 2, 4);
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const sign = i % 2 === 0 ? 1 : -1;
    d += ` L ${x1 + dx * t + px * amplitude * sign} ${y1 + dy * t + py * amplitude * sign}`;
  }
  return d;
}

function hashMarks(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count = 4,
  size = 6
): EcoLinkSegment[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const marks: EcoLinkSegment[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    marks.push({
      x1: cx + px * size,
      y1: cy + py * size,
      x2: cx - px * size,
      y2: cy - py * size,
    });
  }
  return marks;
}

function crossAtMid(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 7
): EcoLinkSegment[] {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  return [
    {
      x1: mx - ux * 3 + px * size,
      y1: my - uy * 3 + py * size,
      x2: mx - ux * 3 - px * size,
      y2: my - uy * 3 - py * size,
    },
    {
      x1: mx + ux * 3 + px * size,
      y1: my + uy * 3 + py * size,
      x2: mx + ux * 3 - px * size,
      y2: my + uy * 3 - py * size,
    },
  ];
}

function arrowAt(
  tipX: number,
  tipY: number,
  ux: number,
  uy: number
): EcoLinkArrow {
  return {
    tipX,
    tipY,
    ux,
    uy,
    px: -uy,
    py: ux,
  };
}

export function ecoLinkEndpoints(
  link: Pick<EcoLink, "from">,
  args: {
    circle: Circle | null;
    personPosition: Point | null;
    system: Point;
  }
): { from: Point; to: Point } | null {
  const system = args.system;
  let origin: Point | null = null;
  if (link.from.kind === "household") {
    if (!args.circle) return null;
    origin = pointOnCircle(system, args.circle);
  } else if (args.personPosition) {
    origin = pointOnRadius(system, args.personPosition, PERSON_HALF);
  }
  if (!origin) return null;
  return {
    from: origin,
    to: pointOnRadius(origin, system, ECO_SYSTEM_RADIUS),
  };
}

export function describeEcoLink(
  link: Pick<EcoLink, "strength" | "quality" | "flow">,
  from: Point,
  to: Point
): EcoLinkDrawModel {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const path =
    link.quality === "stressful"
      ? zigzagPath(from.x, from.y, to.x, to.y)
      : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  const arrows: EcoLinkArrow[] = [];
  if (link.flow === "outward" || link.flow === "both") {
    arrows.push(arrowAt(to.x, to.y, ux, uy));
  }
  if (link.flow === "inward" || link.flow === "both") {
    arrows.push(arrowAt(from.x, from.y, -ux, -uy));
  }

  return {
    path,
    strokeWidth: ECO_LINK_WIDTH[link.strength],
    dash: link.strength === "weak" || link.quality === "cutoff" ? "6 5" : undefined,
    color: ECO_LINK_COLOR[link.quality],
    hashes: link.quality === "mixed" ? hashMarks(from.x, from.y, to.x, to.y) : [],
    crosses: link.quality === "cutoff" ? crossAtMid(from.x, from.y, to.x, to.y) : [],
    arrows,
  };
}
