import { DEATH_COLOR, PERSON_HALF, STROKE } from "../constants";

interface DeathLayerProps {
  visible: boolean;
}

/** Death mark ╳ overlaid on person base shape. */
export function DeathLayer({ visible }: DeathLayerProps) {
  if (!visible) return null;
  const h = PERSON_HALF * 0.7;
  return (
    <g className="death-layer" pointerEvents="none">
      <line
        x1={-h}
        y1={-h}
        x2={h}
        y2={h}
        stroke={DEATH_COLOR}
        strokeWidth={STROKE}
      />
      <line
        x1={h}
        y1={-h}
        x2={-h}
        y2={h}
        stroke={DEATH_COLOR}
        strokeWidth={STROKE}
      />
    </g>
  );
}
