import type { Document, Person, Relationship } from "../types/document";
import { COUPLE_TYPES } from "../types/relationshipCatalog";
import { PERSON_HALF } from "./constants";

export const HOUSEHOLD_PADDING = 48;
export const HOUSEHOLD_MIN_RADIUS = 72;
export const ECO_SYSTEM_RADIUS = 36;
export const ECOMAP_PERSON_GAP = 80;
/** Gap between household rim and orbiting system centers. */
export const ECO_SYSTEM_ORBIT_GAP = 56;

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Position used while drawing the ecomap view. */
export function personEcomapPosition(person: Person): Point {
  return {
    x: person.ecomapX ?? person.x,
    y: person.ecomapY ?? person.y,
  };
}

export function householdMembers(doc: Document): Person[] {
  const allow = new Set(doc.householdPersonIds);
  return doc.persons.filter((p) => allow.has(p.id));
}

/**
 * Index person plus first-degree relatives (partners and parent/child).
 * Empty when there is no index person.
 */
export function inferDefaultHouseholdIds(doc: Document): string[] {
  const index = doc.persons.find((p) => p.indexPerson);
  if (!index) return doc.persons.map((p) => p.id);

  const ids = new Set<string>([index.id]);
  for (const rel of doc.relationships) {
    const touches =
      rel.from === index.id || rel.to === index.id;
    if (!touches) continue;
    const other = rel.from === index.id ? rel.to : rel.from;
    if (COUPLE_TYPES.has(rel.type) || isParentLink(rel)) {
      ids.add(other);
    }
  }
  return doc.persons.map((p) => p.id).filter((id) => ids.has(id));
}

function isParentLink(rel: Relationship): boolean {
  return rel.type === "parent" || rel.type === "adoptiveParent";
}

export function householdCircle(doc: Document): Circle | null {
  const members = householdMembers(doc);
  if (members.length === 0) return null;

  const points = members.map(personEcomapPosition);
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  let farthest = 0;
  for (const p of points) {
    farthest = Math.max(farthest, Math.hypot(p.x - cx, p.y - cy) + PERSON_HALF);
  }

  return {
    cx,
    cy,
    r: Math.max(farthest + HOUSEHOLD_PADDING, HOUSEHOLD_MIN_RADIUS),
  };
}

/** Evenly space systems around the household, starting at the top. */
export function placeSystemsAroundHousehold(
  circle: Circle,
  count: number
): Point[] {
  if (count <= 0) return [];
  const radius = circle.r + ECO_SYSTEM_RADIUS + ECO_SYSTEM_ORBIT_GAP;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return {
      x: circle.cx + Math.cos(angle) * radius,
      y: circle.cy + Math.sin(angle) * radius,
    };
  });
}

export function compactHouseholdPositions(members: Person[]): Map<string, Point> {
  const map = new Map<string, Point>();
  if (members.length === 0) return map;

  const sorted = [...members].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.id.localeCompare(b.id);
  });

  const cols = Math.min(3, sorted.length);
  const rows = Math.ceil(sorted.length / cols);
  const width = (cols - 1) * ECOMAP_PERSON_GAP;
  const height = (rows - 1) * ECOMAP_PERSON_GAP;

  sorted.forEach((person, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    map.set(person.id, {
      x: col * ECOMAP_PERSON_GAP - width / 2,
      y: row * ECOMAP_PERSON_GAP - height / 2,
    });
  });

  return map;
}

/**
 * Fill missing household membership and ecomap coordinates.
 * Existing ecomapX/Y values are left untouched.
 */
export function seedEcomapLayout(doc: Document): Document {
  const householdPersonIds =
    doc.householdPersonIds.length > 0
      ? doc.householdPersonIds.filter((id) =>
          doc.persons.some((p) => p.id === id)
        )
      : inferDefaultHouseholdIds(doc);

  const members = doc.persons.filter((p) => householdPersonIds.includes(p.id));
  const seeded = compactHouseholdPositions(members);

  const persons = doc.persons.map((person) => {
    if (!householdPersonIds.includes(person.id)) return person;
    if (person.ecomapX != null && person.ecomapY != null) return person;
    const pos = seeded.get(person.id);
    if (!pos) return person;
    return { ...person, ecomapX: pos.x, ecomapY: pos.y };
  });

  return { ...doc, persons, householdPersonIds };
}

/** Remap people onto ecomap coordinates for reuse of genogram renderers. */
export function withEcomapPositions(doc: Document): Document {
  return {
    ...doc,
    persons: doc.persons.map((person) => {
      const pos = personEcomapPosition(person);
      return { ...person, x: pos.x, y: pos.y };
    }),
  };
}

export function ecomapFamilyRelationships(doc: Document): Relationship[] {
  const household = new Set(doc.householdPersonIds);
  return doc.relationships.filter((rel) => {
    if (!household.has(rel.from) || !household.has(rel.to)) return false;
    return COUPLE_TYPES.has(rel.type) || isParentLink(rel) || rel.type === "twin";
  });
}
