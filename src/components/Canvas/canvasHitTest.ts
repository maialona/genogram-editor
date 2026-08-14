import type { DiagramMode, Document, Person } from "../../types/document";
import { HOUSEHOLD_ID } from "../../types/ecomapCatalog";
import { PERSON_HALF } from "../../renderers/constants";
import {
  ECO_SYSTEM_RADIUS,
  householdCircle,
  personEcomapPosition,
} from "../../renderers/ecomapLayout";

export interface HitNode {
  id: string;
  x: number;
  y: number;
  kind: "person" | "system";
}

export function visibleEcomapPeople(doc: Document): Person[] {
  const house = new Set(doc.householdPersonIds);
  return doc.persons
    .filter((p) => house.has(p.id))
    .map((p) => {
      const pos = personEcomapPosition(p);
      return { ...p, x: pos.x, y: pos.y };
    });
}

export function visiblePeople(doc: Document, mode: DiagramMode): Person[] {
  return mode === "ecomap" ? visibleEcomapPeople(doc) : doc.persons;
}

export function hitTestPerson(
  worldX: number,
  worldY: number,
  persons: { id: string; x: number; y: number }[],
  excludeId?: string
): string | null {
  const r = PERSON_HALF + 10;
  let best: string | null = null;
  let bestDist = r;
  for (const p of persons) {
    if (excludeId && p.id === excludeId) continue;
    const d = Math.hypot(p.x - worldX, p.y - worldY);
    if (d <= bestDist) {
      bestDist = d;
      best = p.id;
    }
  }
  return best;
}

export function hitTestSystem(
  worldX: number,
  worldY: number,
  systems: { id: string; x: number; y: number }[],
  excludeId?: string
): string | null {
  const r = ECO_SYSTEM_RADIUS + 8;
  let best: string | null = null;
  let bestDist = r;
  for (const s of systems) {
    if (excludeId && s.id === excludeId) continue;
    const d = Math.hypot(s.x - worldX, s.y - worldY);
    if (d <= bestDist) {
      bestDist = d;
      best = s.id;
    }
  }
  return best;
}

export function hitTestHousehold(
  worldX: number,
  worldY: number,
  doc: Document
): boolean {
  const circle = householdCircle(doc);
  if (!circle) return false;
  const d = Math.hypot(worldX - circle.cx, worldY - circle.cy);
  return d <= circle.r && d >= circle.r - 18;
}

export function householdCenter(doc: Document): { x: number; y: number } | null {
  const circle = householdCircle(doc);
  if (!circle) return null;
  return { x: circle.cx, y: circle.cy };
}

export function endpointPoint(
  id: string,
  doc: Document
): { x: number; y: number } | null {
  if (id === HOUSEHOLD_ID) return householdCenter(doc);
  const person = visibleEcomapPeople(doc).find((p) => p.id === id);
  if (person) return { x: person.x, y: person.y };
  const system = doc.ecoSystems.find((s) => s.id === id);
  if (system) return { x: system.x, y: system.y };
  const genogramPerson = doc.persons.find((p) => p.id === id);
  return genogramPerson ? { x: genogramPerson.x, y: genogramPerson.y } : null;
}
