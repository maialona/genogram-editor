import type { Person } from "../../types/document";
import { PERSON_HALF, TEXT_COLOR } from "../constants";

interface TextLayerProps {
  person: Person;
}

/** Name / years label below the person symbol. */
export function TextLayer({ person }: TextLayerProps) {
  const y = PERSON_HALF + 14;
  const lines: string[] = [];

  if (person.name) lines.push(person.name);

  const years: string[] = [];
  if (person.birthYear != null) years.push(String(person.birthYear));
  if (person.deathYear != null) years.push(String(person.deathYear));
  if (years.length > 0) {
    lines.push(
      person.deathYear != null
        ? `${person.birthYear ?? "?"}–${person.deathYear}`
        : `b. ${person.birthYear}`
    );
  } else if (person.age != null) {
    lines.push(`${person.age} 歲`);
  }

  if (lines.length === 0) return null;

  return (
    <g className="text-layer" pointerEvents="none">
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={y + i * 14}
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
