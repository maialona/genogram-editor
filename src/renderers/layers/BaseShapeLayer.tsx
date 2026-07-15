import type { Gender } from "../../types/document";
import {
  FILL_COLOR,
  PERSON_HALF,
  PERSON_SIZE,
  STROKE,
  STROKE_COLOR,
} from "../constants";

interface BaseShapeLayerProps {
  gender: Gender;
  /** Optional fill override (e.g. highlight). */
  fill?: string;
  stroke?: string;
}

/**
 * Pure base shape for a person symbol.
 * Male □  Female ○  Unknown ◇
 */
export function BaseShapeLayer({
  gender,
  fill = FILL_COLOR,
  stroke = STROKE_COLOR,
}: BaseShapeLayerProps) {
  const s = PERSON_SIZE;
  const h = PERSON_HALF;

  if (gender === "male") {
    return (
      <rect
        x={-h}
        y={-h}
        width={s}
        height={s}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  }

  if (gender === "female") {
    return (
      <circle
        cx={0}
        cy={0}
        r={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  }

  // Unknown — diamond
  const d = `M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`;
  return (
    <path d={d} fill={fill} stroke={stroke} strokeWidth={STROKE} />
  );
}
