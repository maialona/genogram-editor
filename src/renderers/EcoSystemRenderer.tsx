import type { EcoSystem } from "../types/document";
import { ECO_SYSTEM_LABELS } from "../types/ecomapCatalog";
import { ECO_SYSTEM_RADIUS } from "./ecomapLayout";
import { SELECTION_COLOR, TEXT_COLOR } from "./constants";
import { EcoSystemGlyphPaths } from "./ecoSystemIcons";

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
      data-category={system.category}
      transform={`translate(${system.x}, ${system.y})`}
      onPointerDown={(e) => onPointerDown?.(e, system.id)}
      style={{ cursor: "pointer", color: stroke }}
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
      <g
        className="eco-system-glyph"
        transform="translate(-11 -12.5) scale(0.92)"
        aria-hidden="true"
      >
        <EcoSystemGlyphPaths category={system.category} />
      </g>
      <text
        y={ECO_SYSTEM_RADIUS + 14}
        textAnchor="middle"
        fill={TEXT_COLOR}
        fontSize={11}
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
