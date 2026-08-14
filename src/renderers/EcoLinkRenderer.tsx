import type { EcoLink } from "../types/document";
import type { EcoLinkDrawModel } from "./ecoLinkGeometry";
import { SELECTION_COLOR } from "./constants";

export interface EcoLinkRendererProps {
  link: EcoLink;
  model: EcoLinkDrawModel;
  selected: boolean;
  onPointerDown?: (e: React.PointerEvent, linkId: string) => void;
}

export function EcoLinkRenderer({
  link,
  model,
  selected,
  onPointerDown,
}: EcoLinkRendererProps) {
  const stroke = selected ? SELECTION_COLOR : model.color;
  return (
    <g
      className="eco-link"
      data-id={link.id}
      onPointerDown={(e) => onPointerDown?.(e, link.id)}
      style={{ cursor: "pointer" }}
    >
      <path
        d={model.path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(model.strokeWidth + 10, 14)}
      />
      <path
        d={model.path}
        fill="none"
        stroke={stroke}
        strokeWidth={model.strokeWidth}
        strokeDasharray={model.dash}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {model.hashes.map((hash, i) => (
        <line
          key={`h${i}`}
          x1={hash.x1}
          y1={hash.y1}
          x2={hash.x2}
          y2={hash.y2}
          stroke={stroke}
          strokeWidth={1.5}
        />
      ))}
      {model.crosses.map((cross, i) => (
        <line
          key={`x${i}`}
          x1={cross.x1}
          y1={cross.y1}
          x2={cross.x2}
          y2={cross.y2}
          stroke={stroke}
          strokeWidth={2}
        />
      ))}
      {model.arrows.map((arrow, i) => {
        const size = 10;
        const baseX = arrow.tipX - arrow.ux * size;
        const baseY = arrow.tipY - arrow.uy * size;
        return (
          <polygon
            key={`a${i}`}
            points={`${arrow.tipX},${arrow.tipY} ${baseX + arrow.px * size * 0.55},${baseY + arrow.py * size * 0.55} ${baseX - arrow.px * size * 0.55},${baseY - arrow.py * size * 0.55}`}
            fill={stroke}
          />
        );
      })}
    </g>
  );
}
