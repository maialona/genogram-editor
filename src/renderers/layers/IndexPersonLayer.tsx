import type { Gender, SpecialPersonType } from "../../types/document";
import { PERSON_HALF, PERSON_SIZE, STROKE, STROKE_COLOR } from "../constants";

interface IndexPersonLayerProps {
  visible: boolean;
  gender: Gender;
  specialType?: SpecialPersonType;
}

/**
 * Double outline for index (proband) person — black, matching base shape.
 * Reference: concentric square (male) / circle (female).
 */
export function IndexPersonLayer({
  visible,
  gender,
  specialType = "none",
}: IndexPersonLayerProps) {
  if (!visible) return null;

  const pad = 5;
  const stroke = STROKE_COLOR;

  // Special shapes
  if (specialType === "pregnancy" || specialType === "stillbirth") {
    if (gender === "female" && specialType === "stillbirth") {
      return (
        <circle
          className="index-person-layer"
          cx={0}
          cy={0}
          r={PERSON_HALF + pad}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          pointerEvents="none"
        />
      );
    }
    const h = PERSON_HALF + pad;
    return (
      <path
        className="index-person-layer"
        d={`M 0 ${-h} L ${h * 1.05} ${h} L ${-h * 1.05} ${h} Z`}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
        pointerEvents="none"
      />
    );
  }

  if (specialType === "pet") {
    const h = PERSON_HALF + pad;
    return (
      <path
        className="index-person-layer"
        d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
        pointerEvents="none"
      />
    );
  }

  if (gender === "female") {
    return (
      <circle
        className="index-person-layer"
        cx={0}
        cy={0}
        r={PERSON_HALF + pad}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
        pointerEvents="none"
      />
    );
  }

  if (gender === "unknown") {
    const h = PERSON_HALF + pad;
    return (
      <path
        className="index-person-layer"
        d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
        pointerEvents="none"
      />
    );
  }

  // Male (default square)
  const size = PERSON_SIZE + pad * 2;
  return (
    <rect
      className="index-person-layer"
      x={-PERSON_HALF - pad}
      y={-PERSON_HALF - pad}
      width={size}
      height={size}
      fill="none"
      stroke={stroke}
      strokeWidth={STROKE}
      pointerEvents="none"
    />
  );
}
