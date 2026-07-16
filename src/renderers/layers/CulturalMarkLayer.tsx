import type { CulturalMark } from "../../types/document";
import { PERSON_HALF, STROKE, STROKE_COLOR } from "../constants";

interface CulturalMarkLayerProps {
  mark: CulturalMark;
}

/**
 * Immigration / multi-culture marks above the person (wavy arrows).
 * Reference: arrow with 1 or 2 waves pointing up from stem on top of symbol.
 */
export function CulturalMarkLayer({ mark }: CulturalMarkLayerProps) {
  if (!mark || mark === "none") return null;

  const baseY = -PERSON_HALF - 2;
  const stemH = 18;
  // multiCulture: 2 waves; immigration: 1 wave with hook
  const waves = mark === "multiCulture" ? 2 : 1;

  let path = `M 0 ${baseY} L 0 ${baseY - stemH}`;
  // wavy section going up-left then hook
  const waveStartY = baseY - stemH;
  if (waves === 2) {
    path += ` C -6 ${waveStartY - 6}, 6 ${waveStartY - 12}, -4 ${waveStartY - 18}`;
    path += ` C -10 ${waveStartY - 22}, 2 ${waveStartY - 26}, -2 ${waveStartY - 32}`;
  } else {
    path += ` C -8 ${waveStartY - 8}, 8 ${waveStartY - 14}, -2 ${waveStartY - 22}`;
    // small reverse hook (immigration)
    path += ` C -8 ${waveStartY - 26}, -10 ${waveStartY - 20}, -6 ${waveStartY - 18}`;
  }

  return (
    <g className="cultural-mark-layer" pointerEvents="none">
      <path
        d={path}
        fill="none"
        stroke={STROKE_COLOR}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </g>
  );
}
