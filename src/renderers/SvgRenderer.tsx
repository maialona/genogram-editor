import type { Document, SelectableId } from "../types/document";
import { PersonRenderer } from "./PersonRenderer";
import { RelationshipRenderer } from "./RelationshipRenderer";
import { FamilyUnitRenderer } from "./FamilyUnitRenderer";
import { buildFamilyUnits, layoutFamilyUnit } from "./familyUnits";

export interface SvgRendererProps {
  document: Document;
  selectedIds: SelectableId[];
  connectFromId: string | null;
  /** Person under connect cursor (drop target). */
  hoverPersonId?: string | null;
  onPersonPointerDown?: (e: React.PointerEvent, personId: string) => void;
  onRelationshipPointerDown?: (
    e: React.PointerEvent,
    relationshipId: string
  ) => void;
}

/**
 * Top-level pure SVG renderer.
 * Document → family units + leftover edges + persons → SVG
 * Never stores state; never mutates Document.
 */
export function SvgRenderer({
  document,
  selectedIds,
  connectFromId,
  hoverPersonId = null,
  onPersonPointerDown,
  onRelationshipPointerDown,
}: SvgRendererProps) {
  const personMap = new Map(document.persons.map((p) => [p.id, p]));
  const selected = new Set(selectedIds);

  const { units, consumedRelIds } = buildFamilyUnits(document);
  const unitLayouts = units.map(layoutFamilyUnit);

  const leftoverRels = document.relationships.filter(
    (r) => !consumedRelIds.has(r.id)
  );

  return (
    <g className="document-root">
      {/* Family units (couple bar + children tree) */}
      <g className="family-units-layer">
        {unitLayouts.map((layout) => (
          <FamilyUnitRenderer
            key={layout.unit.id}
            layout={layout}
            selectedIds={selected}
            onPointerDown={onRelationshipPointerDown}
          />
        ))}
      </g>

      {/* Emotional / leftover edges not absorbed by family units */}
      <g className="relationships-layer">
        {leftoverRels.map((rel) => {
          const from = personMap.get(rel.from);
          const to = personMap.get(rel.to);
          if (!from || !to) return null;
          return (
            <RelationshipRenderer
              key={rel.id}
              relationship={rel}
              from={from}
              to={to}
              selected={selected.has(rel.id)}
              onPointerDown={onRelationshipPointerDown}
            />
          );
        })}
      </g>

      <g className="persons-layer">
        {document.persons.map((person) => (
          <PersonRenderer
            key={person.id}
            person={person}
            selected={selected.has(person.id)}
            highlighted={
              connectFromId === person.id || hoverPersonId === person.id
            }
            onPointerDown={onPersonPointerDown}
          />
        ))}
      </g>

      <g className="annotations-layer">
        {document.annotations.map((ann) => (
          <text
            key={ann.id}
            x={ann.x}
            y={ann.y}
            fill="#444"
            fontSize={12}
            fontFamily="system-ui, sans-serif"
          >
            {ann.text}
          </text>
        ))}
      </g>
    </g>
  );
}
