import type { Document, SelectableId } from "../types/document";
import { HOUSEHOLD_ID } from "../types/ecomapCatalog";
import { PersonRenderer } from "./PersonRenderer";
import { RelationshipRenderer } from "./RelationshipRenderer";
import { FamilyUnitRenderer } from "./FamilyUnitRenderer";
import { buildFamilyUnits, layoutFamilyUnit } from "./familyUnits";
import { EcoLinkRenderer } from "./EcoLinkRenderer";
import { EcoSystemRenderer } from "./EcoSystemRenderer";
import { HouseholdCircleRenderer } from "./HouseholdCircleRenderer";
import { describeEcoLink, ecoLinkEndpoints } from "./ecoLinkGeometry";
import {
  ecomapFamilyRelationships,
  householdCircle,
  householdMembers,
  personEcomapPosition,
  withEcomapPositions,
} from "./ecomapLayout";

export interface EcomapRendererProps {
  document: Document;
  selectedIds: SelectableId[];
  connectFromId: string | null;
  hoverPersonId?: string | null;
  hoverEcoSystemId?: string | null;
  onPersonPointerDown?: (e: React.PointerEvent, personId: string) => void;
  onRelationshipPointerDown?: (
    e: React.PointerEvent,
    relationshipId: string
  ) => void;
  onHouseholdPointerDown?: (e: React.PointerEvent) => void;
  onEcoSystemPointerDown?: (e: React.PointerEvent, systemId: string) => void;
  onEcoLinkPointerDown?: (e: React.PointerEvent, linkId: string) => void;
}

export function EcomapRenderer({
  document,
  selectedIds,
  connectFromId,
  hoverPersonId = null,
  hoverEcoSystemId = null,
  onPersonPointerDown,
  onRelationshipPointerDown,
  onHouseholdPointerDown,
  onEcoSystemPointerDown,
  onEcoLinkPointerDown,
}: EcomapRendererProps) {
  const selected = new Set(selectedIds);
  const circle = householdCircle(document);
  const members = householdMembers(document);
  const memberIds = new Set(members.map((p) => p.id));
  const personMap = new Map(document.persons.map((p) => [p.id, p]));

  const familyDoc = {
    ...withEcomapPositions(document),
    persons: withEcomapPositions(document).persons.filter((p) =>
      memberIds.has(p.id)
    ),
    relationships: ecomapFamilyRelationships(document),
  };
  const { units, consumedRelIds } = buildFamilyUnits(familyDoc);
  const leftoverRels = familyDoc.relationships.filter(
    (r) => !consumedRelIds.has(r.id)
  );

  return (
    <g className="ecomap-root">
      {circle ? (
        <HouseholdCircleRenderer
          circle={circle}
          selected={selected.has(HOUSEHOLD_ID)}
          highlighted={connectFromId === HOUSEHOLD_ID}
          onPointerDown={onHouseholdPointerDown}
        />
      ) : null}

      <g className="eco-links-layer">
        {document.ecoLinks.map((link) => {
          const system = document.ecoSystems.find((s) => s.id === link.to);
          if (!system) return null;
          const person =
            link.from.kind === "person"
              ? personMap.get(link.from.personId)
              : null;
          const ends = ecoLinkEndpoints(link, {
            circle,
            personPosition: person ? personEcomapPosition(person) : null,
            system: { x: system.x, y: system.y },
          });
          if (!ends) return null;
          return (
            <EcoLinkRenderer
              key={link.id}
              link={link}
              model={describeEcoLink(link, ends.from, ends.to)}
              selected={selected.has(link.id)}
              onPointerDown={onEcoLinkPointerDown}
            />
          );
        })}
      </g>

      <g className="ecomap-family-units">
        {units.map((unit) => (
          <FamilyUnitRenderer
            key={unit.id}
            layout={layoutFamilyUnit(unit)}
            selectedIds={selected}
            onPointerDown={onRelationshipPointerDown}
          />
        ))}
      </g>

      <g className="ecomap-family-rels">
        {leftoverRels.map((rel) => {
          const from = familyDoc.persons.find((p) => p.id === rel.from);
          const to = familyDoc.persons.find((p) => p.id === rel.to);
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

      <g className="ecomap-persons">
        {familyDoc.persons.map((person) => (
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

      <g className="eco-systems-layer">
        {document.ecoSystems.map((system) => (
          <EcoSystemRenderer
            key={system.id}
            system={system}
            selected={selected.has(system.id)}
            highlighted={hoverEcoSystemId === system.id}
            onPointerDown={onEcoSystemPointerDown}
          />
        ))}
      </g>
    </g>
  );
}
