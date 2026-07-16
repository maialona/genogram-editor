import type {
  Gender,
  SpecialPersonType,
  Sexuality,
  Transgender,
} from "../../types/document";
import {
  FILL_COLOR,
  PERSON_HALF,
  PERSON_SIZE,
  STROKE,
  STROKE_COLOR,
} from "../constants";

interface BaseShapeLayerProps {
  gender: Gender;
  specialType?: SpecialPersonType;
  sexuality?: Sexuality;
  transgender?: Transgender;
  /** Optional fill override (e.g. highlight). */
  fill?: string;
  stroke?: string;
  /** Age drawn inside the symbol (reference chart style). */
  age?: number | null;
}

/**
 * Pure base shape for a person symbol.
 * Male □  Female ○  Unknown ◇
 * Plus special shapes & orientation / transgender overlays.
 */
export function BaseShapeLayer({
  gender,
  specialType = "none",
  sexuality = "none",
  transgender = "none",
  fill = FILL_COLOR,
  stroke = STROKE_COLOR,
  age = null,
}: BaseShapeLayerProps) {
  const h = PERSON_HALF;

  if (specialType === "pregnancy") {
    return (
      <g>
        <path
          d={`M 0 ${-h} L ${h} ${h} L ${-h} ${h} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE}
        />
        <AgeText age={age} />
      </g>
    );
  }

  if (specialType === "pet") {
    return (
      <g>
        <path
          d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE}
        />
        <AgeText age={age} />
      </g>
    );
  }

  if (specialType === "institution") {
    const w = PERSON_SIZE * 0.7;
    const bodyH = PERSON_SIZE * 0.55;
    return (
      <g>
        <path
          d={`M ${-w / 2} ${-bodyH * 0.2} L 0 ${-h * 0.85} L ${w / 2} ${-bodyH * 0.2}`}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
        />
        <rect
          x={-w / 2}
          y={-bodyH * 0.2}
          width={w}
          height={bodyH}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE}
        />
        <AgeText age={age} />
      </g>
    );
  }

  if (specialType === "miscarriage") {
    // X with diamond tips (two crossing diagonals)
    const s = h * 0.85;
    return (
      <g>
        <line
          x1={-s}
          y1={-s}
          x2={s}
          y2={s}
          stroke={stroke}
          strokeWidth={STROKE + 0.5}
        />
        <line
          x1={s}
          y1={-s}
          x2={-s}
          y2={s}
          stroke={stroke}
          strokeWidth={STROKE + 0.5}
        />
        {/* small diamond tips */}
        <path
          d={`M 0 ${-s - 4} L 4 ${-s} L 0 ${-s + 4} L ${-4} ${-s} Z`}
          fill={stroke}
        />
        <path
          d={`M 0 ${s - 4} L 4 ${s} L 0 ${s + 4} L ${-4} ${s} Z`}
          fill={stroke}
        />
      </g>
    );
  }

  if (specialType === "abortion") {
    const s = h * 0.85;
    return (
      <g>
        <line
          x1={-s}
          y1={-s}
          x2={s}
          y2={s}
          stroke={stroke}
          strokeWidth={STROKE + 0.5}
        />
        <line
          x1={s}
          y1={-s}
          x2={-s}
          y2={s}
          stroke={stroke}
          strokeWidth={STROKE + 0.5}
        />
        <line
          x1={-s * 0.7}
          y1={0}
          x2={s * 0.7}
          y2={0}
          stroke={stroke}
          strokeWidth={STROKE}
        />
      </g>
    );
  }

  if (specialType === "stillbirth") {
    // Triangle (male stillbirth) or circle (female) with X — use gender
    const mark = (
      <g>
        <line
          x1={-h * 0.55}
          y1={-h * 0.55}
          x2={h * 0.55}
          y2={h * 0.55}
          stroke={stroke}
          strokeWidth={STROKE}
        />
        <line
          x1={h * 0.55}
          y1={-h * 0.55}
          x2={-h * 0.55}
          y2={h * 0.55}
          stroke={stroke}
          strokeWidth={STROKE}
        />
      </g>
    );
    if (gender === "female") {
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={STROKE}
          />
          {mark}
        </g>
      );
    }
    // male / unknown → triangle with X (reference male stillbirth)
    return (
      <g>
        <path
          d={`M 0 ${-h} L ${h} ${h} L ${-h} ${h} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE}
        />
        {mark}
      </g>
    );
  }

  // Standard gender shapes
  let base: React.ReactNode;
  if (gender === "male") {
    base = (
      <rect
        x={-h}
        y={-h}
        width={PERSON_SIZE}
        height={PERSON_SIZE}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  } else if (gender === "female") {
    base = (
      <circle
        cx={0}
        cy={0}
        r={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  } else {
    base = (
      <path
        d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  }

  return (
    <g>
      {base}
      <OrientationOverlay
        sexuality={sexuality}
        transgender={transgender}
        gender={gender}
        stroke={stroke}
      />
      <AgeText age={age} />
    </g>
  );
}

function AgeText({ age }: { age: number | null | undefined }) {
  if (age == null) return null;
  return (
    <text
      x={0}
      y={5}
      textAnchor="middle"
      fill={STROKE_COLOR}
      fontSize={14}
      fontWeight={600}
      fontFamily="system-ui, sans-serif"
      pointerEvents="none"
    >
      {age}
    </text>
  );
}

function OrientationOverlay({
  sexuality,
  transgender,
  gender,
  stroke,
}: {
  sexuality: Sexuality;
  transgender: Transgender;
  gender: Gender;
  stroke: string;
}) {
  const h = PERSON_HALF * 0.72;

  // Transgender: opposite gender shape inside
  if (transgender === "mtf") {
    // Male outer (square already), circle inside
    return (
      <circle
        cx={0}
        cy={0}
        r={h * 0.85}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  }
  if (transgender === "ftm") {
    // Female outer (circle already), square inside
    const s = h * 1.35;
    return (
      <rect
        x={-s / 2}
        y={-s / 2}
        width={s}
        height={s}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  }

  // Triangle overlays for orientation
  const triDown = `M 0 ${h * 0.7} L ${h * 0.65} ${-h * 0.45} L ${-h * 0.65} ${-h * 0.45} Z`;
  // reference actually shows inverted triangle (point down): wait
  // Gay: square with inverted triangle (point down)
  // Looking at image: triangle pointing DOWN inside square/circle

  if (sexuality === "gay" || sexuality === "lesbian") {
    return (
      <path
        d={triDown}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
      />
    );
  }

  if (sexuality === "bisexualMale" || sexuality === "bisexualFemale") {
    return (
      <path
        d={triDown}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE}
        strokeDasharray="3 2"
      />
    );
  }

  // If sexuality set without matching gender, still draw when gender matches intent
  void gender;
  return null;
}
