import type { Person, Relationship, RelationshipType } from "../types/document";
import { COUPLE_TYPES } from "../types/relationshipCatalog";
import {
  PERSON_HALF,
  RELATIONSHIP_COLOR,
  SELECTION_COLOR,
  STROKE,
} from "./constants";
import { renderCoupleLine } from "./coupleLine";
import { renderEmotionalLine } from "./emotionalLines";

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
        selected,
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
  selected: boolean;
}

function renderByType(type: RelationshipType, ctx: DrawCtx): React.ReactNode {
  const { from, to, mid, ux, uy, px, py, stroke, strokeWidth, edge, selected } =
    ctx;

  // Couple types — horizontal bar between partners
  if (COUPLE_TYPES.has(type)) {
    const y = (from.y + to.y) / 2;
    const left = from.x <= to.x ? from : to;
    const right = from.x <= to.x ? to : from;
    const x1 = left.x + PERSON_HALF;
    const x2 = right.x - PERSON_HALF;
    const midX = (x1 + x2) / 2;
    return renderCoupleLine(
      type,
      { x1, y1: y, x2, y2: y, midX, midY: y },
      stroke,
      strokeWidth
    );
  }

  if (type === "parent") {
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

  const emotional = renderEmotionalLine(type, {
    x1: edge.x1,
    y1: edge.y1,
    x2: edge.x2,
    y2: edge.y2,
    midX: mid.x,
    midY: mid.y,
    ux,
    uy,
    px,
    py,
    selected,
    selectionColor: SELECTION_COLOR,
  });

  if (emotional) return emotional;

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
