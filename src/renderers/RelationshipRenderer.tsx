import type { Person, Relationship, RelationshipType } from "../types/document";
import { PERSON_HALF, RELATIONSHIP_COLOR, SELECTION_COLOR, STROKE } from "./constants";

export interface RelationshipRendererProps {
  relationship: Relationship;
  from: Person;
  to: Person;
  selected: boolean;
  onPointerDown?: (e: React.PointerEvent, relationshipId: string) => void;
}

function midpoint(from: Person, to: Person) {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
}

function unitVector(from: Person, to: Person) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len, len, dx, dy };
}

function perpendicular(ux: number, uy: number) {
  return { px: -uy, py: ux };
}

function edgePoint(from: Person, to: Person, pad = PERSON_HALF + 2) {
  const { ux, uy, len } = unitVector(from, to);
  const d = Math.min(pad, len / 2 - 2);
  return {
    x1: from.x + ux * d,
    y1: from.y + uy * d,
    x2: to.x - ux * d,
    y2: to.y - uy * d,
    ux,
    uy,
    len,
  };
}

/**
 * Fallback / emotional relationship lines.
 * Family (couple + parent) edges are normally drawn by FamilyUnitRenderer.
 * This renderer still handles parent/couple if they are not part of a unit.
 */
export function RelationshipRenderer({
  relationship,
  from,
  to,
  selected,
  onPointerDown,
}: RelationshipRendererProps) {
  const stroke = selected ? SELECTION_COLOR : RELATIONSHIP_COLOR;
  const strokeWidth = selected ? STROKE + 1 : STROKE;
  const mid = midpoint(from, to);
  const { ux, uy } = unitVector(from, to);
  const { px, py } = perpendicular(ux, uy);
  const edge = edgePoint(from, to);

  return (
    <g
      className="relationship-edge"
      data-id={relationship.id}
      onPointerDown={(e) => onPointerDown?.(e, relationship.id)}
      style={{ cursor: "pointer" }}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="transparent"
        strokeWidth={18}
      />
      {renderByType(relationship.type, {
        from,
        to,
        mid,
        ux,
        uy,
        px,
        py,
        stroke,
        strokeWidth,
        edge,
      })}
    </g>
  );
}

interface DrawCtx {
  from: Person;
  to: Person;
  mid: { x: number; y: number };
  ux: number;
  uy: number;
  px: number;
  py: number;
  stroke: string;
  strokeWidth: number;
  edge: { x1: number; y1: number; x2: number; y2: number };
}

function renderByType(type: RelationshipType, ctx: DrawCtx): React.ReactNode {
  const { from, to, mid, ux, uy, px, py, stroke, strokeWidth, edge } = ctx;

  switch (type) {
    case "marriage":
    case "divorce":
    case "separation":
    case "cohabitation":
    case "engagement": {
      // Fallback couple (should usually be in FamilyUnitRenderer)
      const y = (from.y + to.y) / 2;
      const left = from.x <= to.x ? from : to;
      const right = from.x <= to.x ? to : from;
      const x1 = left.x + PERSON_HALF;
      const x2 = right.x - PERSON_HALF;
      const midX = (x1 + x2) / 2;
      const base = (
        <line
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={
            type === "cohabitation"
              ? "8 4"
              : type === "engagement"
                ? "3 3"
                : undefined
          }
        />
      );
      if (type === "divorce") {
        return (
          <g>
            {base}
            <line
              x1={midX - 5}
              y1={y - 8}
              x2={midX + 5}
              y2={y + 8}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <line
              x1={midX - 1}
              y1={y - 8}
              x2={midX + 9}
              y2={y + 8}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </g>
        );
      }
      if (type === "separation") {
        return (
          <g>
            {base}
            <line
              x1={midX}
              y1={y - 8}
              x2={midX}
              y2={y + 8}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </g>
        );
      }
      return base;
    }

    case "parent": {
      // Simple orthogonal fallback
      const x1 = from.x;
      const y1 = from.y + PERSON_HALF;
      const x2 = to.x;
      const y2 = to.y - PERSON_HALF;
      const midY = (y1 + y2) / 2;
      return (
        <path
          d={`M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case "harmony":
      return (
        <path
          d={wavyPath(edge.x1, edge.y1, edge.x2, edge.y2, 6)}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case "close":
      return (
        <g>
          <path
            d={wavyPath(
              edge.x1 + 3 * px,
              edge.y1 + 3 * py,
              edge.x2 + 3 * px,
              edge.y2 + 3 * py,
              5
            )}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <path
            d={wavyPath(
              edge.x1 - 3 * px,
              edge.y1 - 3 * py,
              edge.x2 - 3 * px,
              edge.y2 - 3 * py,
              5
            )}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );

    case "conflict":
      return (
        <g>
          <line
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <path
            d={`M ${mid.x - 10 * ux} ${mid.y - 10 * uy}
                L ${mid.x - 5 * ux + 8 * px} ${mid.y - 5 * uy + 8 * py}
                L ${mid.x + 5 * ux - 8 * px} ${mid.y + 5 * uy - 8 * py}
                L ${mid.x + 10 * ux} ${mid.y + 10 * uy}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );

    case "hostile":
      return (
        <g>
          <line
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <path
            d={`M ${mid.x - 12 * ux} ${mid.y - 12 * uy}
                L ${mid.x - 4 * ux + 10 * px} ${mid.y - 4 * uy + 10 * py}
                L ${mid.x + 4 * ux - 10 * px} ${mid.y + 4 * uy - 10 * py}
                L ${mid.x + 12 * ux} ${mid.y + 12 * uy}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth={strokeWidth}
          />
        </g>
      );

    case "abuse":
      return (
        <g>
          <line
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="#dc2626"
            strokeWidth={strokeWidth}
          />
          <polygon
            points={arrowHead(to.x, to.y, ux, uy, px, py)}
            fill="#dc2626"
          />
        </g>
      );

    default:
      return (
        <line
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
  }
}

function wavyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const segments = Math.max(4, Math.floor(len / 16));
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * segments) * amplitude;
    const x = x1 + dx * t + px * wave;
    const y = y1 + dy * t + py * wave;
    d += ` L ${x} ${y}`;
  }
  return d;
}

function arrowHead(
  x: number,
  y: number,
  ux: number,
  uy: number,
  px: number,
  py: number
): string {
  const size = 10;
  const tipX = x - ux * 20;
  const tipY = y - uy * 20;
  const a1x = tipX - ux * size + px * size * 0.6;
  const a1y = tipY - uy * size + py * size * 0.6;
  const a2x = tipX - ux * size - px * size * 0.6;
  const a2y = tipY - uy * size - py * size * 0.6;
  return `${tipX + ux * 8},${tipY + uy * 8} ${a1x},${a1y} ${a2x},${a2y}`;
}
