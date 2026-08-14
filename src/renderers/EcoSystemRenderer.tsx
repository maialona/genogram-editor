import type { EcoSystem } from "../types/document";
import { ECO_SYSTEM_LABELS } from "../types/ecomapCatalog";
import { ECO_SYSTEM_RADIUS } from "./ecomapLayout";
import { SELECTION_COLOR, TEXT_COLOR } from "./constants";

export interface EcoSystemRendererProps {
  system: EcoSystem;
  selected: boolean;
  highlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, systemId: string) => void;
}

export function EcoSystemRenderer({
  system,
  selected,
  highlighted = false,
  onPointerDown,
}: EcoSystemRendererProps) {
  const label = system.label.trim() || ECO_SYSTEM_LABELS[system.category];
  const stroke = selected || highlighted ? SELECTION_COLOR : "#334155";
  return (
    <g
      className="eco-system"
      data-id={system.id}
      transform={`translate(${system.x}, ${system.y})`}
      onPointerDown={(e) => onPointerDown?.(e, system.id)}
      style={{ cursor: "pointer" }}
    >
      {highlighted || selected ? (
        <circle
          r={ECO_SYSTEM_RADIUS + 5}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={1.5}
          opacity={0.45}
        />
      ) : null}
      <circle
        r={ECO_SYSTEM_RADIUS}
        fill="#fff"
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 1.75}
      />
      <text
        y={4}
        textAnchor="middle"
        fill={TEXT_COLOR}
        fontSize={12}
        fontFamily="system-ui, sans-serif"
      >
        {truncateLabel(label, 6)}
      </text>
      <title>{label}</title>
    </g>
  );
}

function truncateLabel(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, maxChars)}…` : label;
}
