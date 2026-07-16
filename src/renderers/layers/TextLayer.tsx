import type { Person } from "../../types/document";
import { PERSON_HALF, TEXT_COLOR } from "../constants";

interface TextLayerProps {
  person: Person;
}

/**
 * Name / years label below the person symbol.
 * Age is drawn inside the symbol (BaseShapeLayer); years appear above/below
 * in classic genogram style when present.
 */
export function TextLayer({ person }: TextLayerProps) {
  const linesBelow: string[] = [];
  if (person.name) linesBelow.push(person.name);

  // Years above symbol (reference chart style); name only below
  const hasBirth = person.birthYear != null;
  const hasDeath = person.deathYear != null;
  const yearAbove =
    hasBirth && hasDeath
      ? `${person.birthYear} — ${person.deathYear}`
      : hasBirth
        ? `${person.birthYear} —`
        : hasDeath
          ? `— ${person.deathYear}`
          : null;

  if (linesBelow.length === 0 && !yearAbove) return null;

  const yBelow = PERSON_HALF + 14;
  const abovePad =
    person.culturalMark && person.culturalMark !== "none" ? 38 : 12;

  return (
    <g className="text-layer" pointerEvents="none">
      {yearAbove && (
        <text
          x={0}
          y={-PERSON_HALF - abovePad}
          textAnchor="middle"
          fill={TEXT_COLOR}
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {yearAbove}
        </text>
      )}
      {linesBelow.map((line, i) => (
        <text
          key={i}
          x={0}
          y={yBelow + i * 14}
          textAnchor="middle"
          fill={TEXT_COLOR}
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
