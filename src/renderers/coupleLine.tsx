import type { RelationshipType } from "../types/document";
import { COUPLE_TYPES } from "../types/relationshipCatalog";

export function isCoupleType(type: RelationshipType): boolean {
  return COUPLE_TYPES.has(type);
}

export interface CoupleGeom {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

/** House icon used on cohabitation couple bars. */
function HouseIcon({
  cx,
  cy,
  stroke,
  strokeWidth,
  size = 10,
}: {
  cx: number;
  cy: number;
  stroke: string;
  strokeWidth: number;
  size?: number;
}) {
  const w = size;
  const h = size * 0.85;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* roof */}
      <path
        d={`M ${-w / 2} ${-h * 0.15} L 0 ${-h * 0.55} L ${w / 2} ${-h * 0.15}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
      />
      {/* body */}
      <rect
        x={-w / 2}
        y={-h * 0.15}
        width={w}
        height={h * 0.7}
        fill="#fff"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function slashPair(
  midX: number,
  midY: number,
  stroke: string,
  strokeWidth: number,
  count: 1 | 2,
  angle: "diag" | "vert" = "diag"
) {
  if (angle === "vert") {
    return (
      <line
        x1={midX}
        y1={midY - 9}
        x2={midX}
        y2={midY + 9}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  const lines = [];
  for (let i = 0; i < count; i++) {
    const ox = i * 4 - (count === 2 ? 2 : 0);
    lines.push(
      <line
        key={i}
        x1={midX - 5 + ox}
        y1={midY - 8}
        x2={midX + 5 + ox}
        y2={midY + 8}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return <>{lines}</>;
}

/**
 * Classic genogram couple-bar decorations matching reference charts.
 */
export function renderCoupleLine(
  type: RelationshipType,
  couple: CoupleGeom,
  stroke: string,
  strokeWidth: number
): React.ReactNode {
  const { x1, y1, x2, y2, midX, midY } = couple;

  const isDashed =
    type === "engagement" ||
    type === "cohabitation" ||
    type === "engagementCohabitation" ||
    type === "engagementSeparation" ||
    type === "loveAffair";

  const isLoveAffair = type === "loveAffair";
  const lineStroke = isLoveAffair ? "#e11d48" : stroke;
  const dasharray = isDashed
    ? type === "engagement" || type === "engagementSeparation"
      ? "3 3"
      : "8 4"
    : undefined;

  // Leave a small gap in the bar when placing a house icon
  const needsHouse =
    type === "cohabitation" ||
    type === "legalCohabitation" ||
    type === "engagementCohabitation";

  const base = needsHouse ? (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={midX - 12}
        y2={y2}
        stroke={lineStroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <line
        x1={midX + 12}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={lineStroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <HouseIcon
        cx={midX}
        cy={midY}
        stroke={lineStroke}
        strokeWidth={strokeWidth}
      />
    </g>
  ) : (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={lineStroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dasharray}
    />
  );

  switch (type) {
    case "divorce":
      return (
        <g>
          {base}
          {slashPair(midX, midY, stroke, strokeWidth, 2, "diag")}
        </g>
      );

    case "separation": // legal — vertical
      return (
        <g>
          {base}
          {slashPair(midX, midY, stroke, strokeWidth, 1, "vert")}
        </g>
      );

    case "separationInFact":
      return (
        <g>
          {base}
          {slashPair(midX, midY, stroke, strokeWidth, 1, "diag")}
        </g>
      );

    case "engagementSeparation":
      return (
        <g>
          {base}
          {slashPair(midX, midY, stroke, strokeWidth, 1, "diag")}
        </g>
      );

    case "widowed":
      return (
        <g>
          {base}
          <line
            x1={midX - 6}
            y1={midY - 6}
            x2={midX + 6}
            y2={midY + 6}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            x1={midX + 6}
            y1={midY - 6}
            x2={midX - 6}
            y2={midY + 6}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );

    case "marriage":
    case "engagement":
    case "cohabitation":
    case "legalCohabitation":
    case "engagementCohabitation":
    case "loveAffair":
      return base;

    default:
      return base;
  }
}
