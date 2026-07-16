import type { Person } from "../types/document";
import { BaseShapeLayer } from "./layers/BaseShapeLayer";
import { DeathLayer } from "./layers/DeathLayer";
import { TextLayer } from "./layers/TextLayer";
import { SelectionLayer } from "./layers/SelectionLayer";
import { MedicalLayer } from "./layers/MedicalLayer";
import { IndexPersonLayer } from "./layers/IndexPersonLayer";
import { HighlightLayer } from "./layers/HighlightLayer";
import { CulturalMarkLayer } from "./layers/CulturalMarkLayer";

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
 * ├── Highlight
 * ├── Index Person (double outline)
 * ├── Cultural mark
 * ├── Base Shape (+ orientation / age)
 * ├── Medical Layer
 * ├── Death Layer
 * ├── Text Layer
 * └── Selection Layer
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
      <IndexPersonLayer
        visible={person.indexPerson}
        gender={person.gender}
        specialType={person.specialType}
      />
      <CulturalMarkLayer mark={person.culturalMark ?? "none"} />
      <BaseShapeLayer
        gender={person.gender}
        specialType={person.specialType ?? "none"}
        sexuality={person.sexuality ?? "none"}
        transgender={person.transgender ?? "none"}
        age={person.age}
      />
      <MedicalLayer
        conditions={person.medicalConditions}
        gender={person.gender}
        specialType={person.specialType ?? "none"}
        personId={person.id}
      />
      <DeathLayer visible={person.deceased} />
      <TextLayer person={person} />
      <SelectionLayer selected={selected} />
      {/* Invisible hit target for easier selection */}
      <circle r={28} fill="transparent" />
    </g>
  );
}
