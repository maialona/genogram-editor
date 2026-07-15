import { INDEX_COLOR, PERSON_HALF, STROKE } from "../constants";

interface IndexPersonLayerProps {
  visible: boolean;
}

/** Double outline for index (proband) person. */
export function IndexPersonLayer({ visible }: IndexPersonLayerProps) {
  if (!visible) return null;
  const pad = 4;
  const size = PERSON_HALF * 2 + pad * 2;
  return (
    <rect
      className="index-person-layer"
      x={-PERSON_HALF - pad}
      y={-PERSON_HALF - pad}
      width={size}
      height={size}
      fill="none"
      stroke={INDEX_COLOR}
      strokeWidth={STROKE}
      pointerEvents="none"
    />
  );
}
