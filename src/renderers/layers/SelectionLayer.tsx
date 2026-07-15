import { PERSON_HALF, SELECTION_COLOR } from "../constants";

interface SelectionLayerProps {
  selected: boolean;
}

/** Selection highlight ring around person. */
export function SelectionLayer({ selected }: SelectionLayerProps) {
  if (!selected) return null;
  const pad = 6;
  const size = PERSON_HALF * 2 + pad * 2;
  return (
    <rect
      className="selection-layer"
      x={-PERSON_HALF - pad}
      y={-PERSON_HALF - pad}
      width={size}
      height={size}
      fill="none"
      stroke={SELECTION_COLOR}
      strokeWidth={2}
      strokeDasharray="4 3"
      rx={4}
      pointerEvents="none"
    />
  );
}
