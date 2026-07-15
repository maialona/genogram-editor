import type { Person } from "../types/document";
import { BaseShapeLayer } from "./layers/BaseShapeLayer";
import { DeathLayer } from "./layers/DeathLayer";
import { TextLayer } from "./layers/TextLayer";
import { SelectionLayer } from "./layers/SelectionLayer";
import { MedicalLayer } from "./layers/MedicalLayer";
import { IndexPersonLayer } from "./layers/IndexPersonLayer";
import { HighlightLayer } from "./layers/HighlightLayer";

export interface PersonRendererProps {
  person: Person;
  selected: boolean;
  highlighted?: boolean;
  onPointerDown?: (e: React.PointerEvent, personId: string) => void;
}

/**
 * Pure person renderer — composes layers, never mutates Document.
 *
 * Person
 * ├── Base Shape
 * ├── Index Person Layer
 * ├── Medical Layer
 * ├── Death Layer
 * ├── Text Layer
 * ├── Selection Layer
 * └── Highlight Layer
 */
export function PersonRenderer({
  person,
  selected,
  highlighted = false,
  onPointerDown,
}: PersonRendererProps) {
  return (
    <g
      className="person-node"
      data-id={person.id}
      transform={`translate(${person.x}, ${person.y}) rotate(${person.rotation})`}
      onPointerDown={(e) => onPointerDown?.(e, person.id)}
      style={{ cursor: "pointer" }}
    >
      <HighlightLayer active={highlighted} />
      <IndexPersonLayer visible={person.indexPerson} />
      <BaseShapeLayer gender={person.gender} />
      <MedicalLayer conditions={person.medicalConditions} />
      <DeathLayer visible={person.deceased} />
      <TextLayer person={person} />
      <SelectionLayer selected={selected} />
      {/* Invisible hit target for easier selection */}
      <circle r={28} fill="transparent" />
    </g>
  );
}
