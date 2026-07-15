import type { Document, Person, Relationship, RelationshipType } from "../types/document";
import { PERSON_HALF } from "./constants";

/** Relationship types that form a couple / partnership bar. */
export const COUPLE_TYPES: ReadonlySet<RelationshipType> = new Set([
  "marriage",
  "divorce",
  "separation",
  "cohabitation",
  "engagement",
]);

export interface FamilyUnit {
  /** Stable key for React. */
  id: string;
  partnerA: Person;
  partnerB: Person | null;
  coupleRel: Relationship | null;
  children: Person[];
  /** Parent relationships belonging to this unit. */
  parentRels: Relationship[];
}

export interface FamilyUnitLayout {
  unit: FamilyUnit;
  /** Couple / parent bar endpoints (world). */
  couple: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    midX: number;
    midY: number;
  } | null;
  /** Vertical drop from couple mid (or single parent) to children bar. */
  stem: { x: number; y1: number; y2: number } | null;
  /** Horizontal children bar. */
  childBar: { x1: number; x2: number; y: number } | null;
  /** Vertical drops onto each child. */
  childDrops: { personId: string; x: number; y1: number; y2: number; relId: string }[];
}

function personEdgeX(person: Person, towardX: number): number {
  if (towardX >= person.x) return person.x + PERSON_HALF;
  return person.x - PERSON_HALF;
}

/**
 * Build family units from Document (pure).
 * Couple + shared children → classic genogram tree.
 * Leftover parent links → single-parent units.
 */
export function buildFamilyUnits(document: Document): {
  units: FamilyUnit[];
  consumedRelIds: Set<string>;
} {
  const personMap = new Map(document.persons.map((p) => [p.id, p]));
  const consumedRelIds = new Set<string>();
  const units: FamilyUnit[] = [];

  const coupleRels = document.relationships.filter((r) => COUPLE_TYPES.has(r.type));
  const parentRels = document.relationships.filter((r) => r.type === "parent");

  /** childId → parent relationships */
  const parentsOf = new Map<string, Relationship[]>();
  for (const r of parentRels) {
    const list = parentsOf.get(r.to) ?? [];
    list.push(r);
    parentsOf.set(r.to, list);
  }

  const assignedChildIds = new Set<string>();

  for (const couple of coupleRels) {
    const a = personMap.get(couple.from);
    const b = personMap.get(couple.to);
    if (!a || !b) continue;

    const partnerIds = new Set([a.id, b.id]);
    const children: Person[] = [];
    const unitParentRels: Relationship[] = [];

    for (const [childId, rels] of parentsOf) {
      const relevant = rels.filter((r) => partnerIds.has(r.from));
      if (relevant.length === 0) continue;
      const child = personMap.get(childId);
      if (!child) continue;
      // Prefer assigning when child is below the couple (genogram convention)
      children.push(child);
      unitParentRels.push(...relevant);
    }

    children.sort((p, q) => p.x - q.x || p.y - q.y);
    for (const c of children) assignedChildIds.add(c.id);

    consumedRelIds.add(couple.id);
    for (const r of unitParentRels) consumedRelIds.add(r.id);

    // Left partner first for stable geometry
    const [partnerA, partnerB] = a.x <= b.x ? [a, b] : [b, a];

    units.push({
      id: `couple-${couple.id}`,
      partnerA,
      partnerB,
      coupleRel: couple,
      children,
      parentRels: unitParentRels,
    });
  }

  // Remaining parent links → single-parent family units
  const leftoverByParent = new Map<string, { children: Person[]; rels: Relationship[] }>();

  for (const r of parentRels) {
    if (consumedRelIds.has(r.id)) continue;
    const parent = personMap.get(r.from);
    const child = personMap.get(r.to);
    if (!parent || !child) continue;
    // Skip if child already in a couple unit
    if (assignedChildIds.has(child.id)) {
      consumedRelIds.add(r.id);
      continue;
    }
    const entry = leftoverByParent.get(parent.id) ?? { children: [], rels: [] };
    if (!entry.children.some((c) => c.id === child.id)) {
      entry.children.push(child);
    }
    entry.rels.push(r);
    leftoverByParent.set(parent.id, entry);
  }

  for (const [parentId, entry] of leftoverByParent) {
    const parent = personMap.get(parentId);
    if (!parent) continue;
    entry.children.sort((p, q) => p.x - q.x || p.y - q.y);
    for (const r of entry.rels) consumedRelIds.add(r.id);
    for (const c of entry.children) assignedChildIds.add(c.id);

    units.push({
      id: `single-${parentId}-${entry.rels.map((r) => r.id).join("-")}`,
      partnerA: parent,
      partnerB: null,
      coupleRel: null,
      children: entry.children,
      parentRels: entry.rels,
    });
  }

  return { units, consumedRelIds };
}

/** Compute pure layout geometry for a family unit. */
export function layoutFamilyUnit(unit: FamilyUnit): FamilyUnitLayout {
  const { partnerA, partnerB, children, coupleRel, parentRels } = unit;

  let couple: FamilyUnitLayout["couple"] = null;
  let stem: FamilyUnitLayout["stem"] = null;
  let childBar: FamilyUnitLayout["childBar"] = null;
  const childDrops: FamilyUnitLayout["childDrops"] = [];

  if (partnerB) {
    // Horizontal couple bar between partners (classic genogram)
    const y = (partnerA.y + partnerB.y) / 2;
    const x1 = personEdgeX(partnerA, partnerB.x);
    const x2 = personEdgeX(partnerB, partnerA.x);
    const midX = (x1 + x2) / 2;
    couple = { x1, y1: y, x2, y2: y, midX, midY: y };

    if (children.length > 0) {
      const childTops = children.map((c) => c.y - PERSON_HALF);
      const minChildTop = Math.min(...childTops);
      // Children bar sits between couple and children
      const barY = Math.min(minChildTop - 12, y + Math.max(36, (minChildTop - y) * 0.45));
      const xs = children.map((c) => c.x);
      const barX1 = Math.min(...xs);
      const barX2 = Math.max(...xs);

      stem = { x: midX, y1: y, y2: barY };
      // Expand bar so it always meets the stem (children may all sit to one side)
      const spanX1 = Math.min(midX, barX1);
      const spanX2 = Math.max(midX, barX2);
      childBar = { x1: spanX1, x2: spanX2, y: barY };

      for (const child of children) {
        const rel =
          parentRels.find((r) => r.to === child.id) ?? parentRels[0];
        childDrops.push({
          personId: child.id,
          x: child.x,
          y1: barY,
          y2: child.y - PERSON_HALF,
          relId: rel?.id ?? coupleRel?.id ?? unit.id,
        });
      }
    }
  } else {
    // Single parent: drop from bottom of parent symbol
    const parent = partnerA;
    if (children.length > 0) {
      const originY = parent.y + PERSON_HALF;
      const childTops = children.map((c) => c.y - PERSON_HALF);
      const minChildTop = Math.min(...childTops);
      const barY = Math.min(
        minChildTop - 12,
        originY + Math.max(28, (minChildTop - originY) * 0.4)
      );
      const xs = children.map((c) => c.x);
      const barX1 = Math.min(parent.x, ...xs);
      const barX2 = Math.max(parent.x, ...xs);

      stem = { x: parent.x, y1: originY, y2: barY };
      childBar = { x1: barX1, x2: barX2, y: barY };

      for (const child of children) {
        const rel = parentRels.find((r) => r.to === child.id) ?? parentRels[0];
        childDrops.push({
          personId: child.id,
          x: child.x,
          y1: barY,
          y2: child.y - PERSON_HALF,
          relId: rel?.id ?? unit.id,
        });
      }
    }
  }

  return { unit, couple, stem, childBar, childDrops };
}
