import { HOUSEHOLD_ID } from "../types/ecomapCatalog";
import type { Circle } from "./ecomapLayout";
import { SELECTION_COLOR } from "./constants";

export interface HouseholdCircleRendererProps {
  circle: Circle;
  selected: boolean;
  highlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function HouseholdCircleRenderer({
  circle,
  selected,
  highlighted = false,
  onPointerDown,
}: HouseholdCircleRendererProps) {
  const stroke = selected || highlighted ? SELECTION_COLOR : "#94a3b8";
  return (
    <g
      className="household-circle"
      data-id={HOUSEHOLD_ID}
      onPointerDown={onPointerDown}
      style={{ cursor: "pointer" }}
    >
      <circle
        cx={circle.cx}
        cy={circle.cy}
        r={circle.r}
        fill="rgba(248, 250, 252, 0.55)"
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 1.75}
        strokeDasharray="10 6"
      />
      <text
        x={circle.cx}
        y={circle.cy - circle.r - 10}
        textAnchor="middle"
        fill="#64748b"
        fontSize={12}
        fontFamily="system-ui, sans-serif"
      >
        核心家庭
      </text>
    </g>
  );
}
