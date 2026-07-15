import { PERSON_HALF } from "../constants";

interface HighlightLayerProps {
  active: boolean;
}

/** Temporary connect-mode highlight. */
export function HighlightLayer({ active }: HighlightLayerProps) {
  if (!active) return null;
  return (
    <circle
      className="highlight-layer"
      cx={0}
      cy={0}
      r={PERSON_HALF + 10}
      fill="rgba(59, 130, 246, 0.15)"
      stroke="#3b82f6"
      strokeWidth={2}
      pointerEvents="none"
    />
  );
}
