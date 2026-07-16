import { v4 as uuidv4 } from "uuid";
import {
  createPerson,
  createRelationship,
  DEFAULT_DOCUMENT_TITLE,
  type Document,
  type Person,
  type Relationship,
} from "../types/document";
import { COUPLE_TYPES } from "../types/relationshipCatalog";
import type { AiGenogramDraft } from "./types";

/** Horizontal spacing between person centers. */
const DX = 130;
/** Vertical spacing between generations. */
const DY = 170;
const ORIGIN_X = 120;
const ORIGIN_Y = 100;

/**
 * Infer generation indices from parent edges when the model omitted them.
 * parent: from=parent, to=child → child.gen = parent.gen + 1
 */
function inferGenerations(draft: AiGenogramDraft): Map<string, number> {
  const gens = new Map<string, number>();
  for (const p of draft.persons) {
    if (typeof p.generation === "number" && Number.isFinite(p.generation)) {
      gens.set(p.id, Math.max(0, Math.round(p.generation)));
    }
  }

  const parentEdges = draft.relationships.filter((r) => r.type === "parent");
  for (let pass = 0; pass < draft.persons.length + 2; pass++) {
    let changed = false;
    for (const e of parentEdges) {
      const pg = gens.get(e.from);
      const cg = gens.get(e.to);
      if (pg != null && cg == null) {
        gens.set(e.to, pg + 1);
        changed = true;
      } else if (pg == null && cg != null && cg > 0) {
        gens.set(e.from, cg - 1);
        changed = true;
      } else if (pg != null && cg != null && cg < pg + 1) {
        gens.set(e.to, pg + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const p of draft.persons) {
    if (!gens.has(p.id)) gens.set(p.id, 0);
  }

  for (const r of draft.relationships) {
    if (!COUPLE_TYPES.has(r.type)) continue;
    const a = gens.get(r.from) ?? 0;
    const b = gens.get(r.to) ?? 0;
    const g = Math.min(a, b);
    gens.set(r.from, g);
    gens.set(r.to, g);
  }

  const values = Array.from(gens.values());
  const minG = values.length ? Math.min(...values) : 0;
  if (minG !== 0 && Number.isFinite(minG)) {
    for (const [id, g] of gens) gens.set(id, g - minG);
  }

  return gens;
}

function couplePartnerMap(draft: AiGenogramDraft): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of draft.relationships) {
    if (!COUPLE_TYPES.has(r.type)) continue;
    map.set(r.from, r.to);
    map.set(r.to, r.from);
  }
  return map;
}

/**
 * Order people within a generation: couple pairs together.
 */
function orderGeneration(
  personIds: string[],
  draft: AiGenogramDraft,
  partners: Map<string, string>
): string[] {
  const remaining = new Set(personIds);
  const ordered: string[] = [];

  const score = (id: string) => {
    const p = draft.persons.find((x) => x.id === id);
    return p?.gender === "female" ? 1 : 0;
  };

  while (remaining.size > 0) {
    const seed =
      Array.from(remaining).find((id) => {
        const partner = partners.get(id);
        return partner && remaining.has(partner);
      }) ?? Array.from(remaining)[0];

    remaining.delete(seed);
    const partner = partners.get(seed);
    if (partner && remaining.has(partner)) {
      if (score(seed) <= score(partner)) {
        ordered.push(seed, partner);
      } else {
        ordered.push(partner, seed);
      }
      remaining.delete(partner);
    } else {
      ordered.push(seed);
    }
  }

  return ordered;
}

/**
 * Convert AI structural draft into a full Document with laid-out coordinates.
 */
export function layoutGenogram(draft: AiGenogramDraft): Document {
  const gens = inferGenerations(draft);
  const partners = couplePartnerMap(draft);

  const byGen = new Map<number, string[]>();
  for (const p of draft.persons) {
    const g = gens.get(p.id) ?? 0;
    const list = byGen.get(g) ?? [];
    list.push(p.id);
    byGen.set(g, list);
  }

  for (const [g, ids] of byGen) {
    if (g === 0) {
      byGen.set(g, orderGeneration(ids, draft, partners));
      continue;
    }

    const parentOrder = new Map<string, number>();
    const prev = byGen.get(g - 1) ?? [];
    prev.forEach((id, i) => parentOrder.set(id, i));

    const familyKey = (id: string) => {
      const parents = draft.relationships
        .filter((r) => r.type === "parent" && r.to === id)
        .map((r) => r.from);
      if (parents.length === 0) return 999;
      const scores = parents.map((pid) => parentOrder.get(pid) ?? 50);
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    };

    const sorted = [...ids].sort((a, b) => familyKey(a) - familyKey(b));
    byGen.set(g, orderGeneration(sorted, draft, partners));
  }

  const positions = new Map<string, { x: number; y: number }>();
  const genKeys = Array.from(byGen.keys()).sort((a, b) => a - b);

  for (const g of genKeys) {
    const ids = byGen.get(g) ?? [];
    const width = Math.max(0, ids.length - 1) * DX;
    const startX = ORIGIN_X + Math.max(0, (4 * DX - width) / 2);
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * DX,
        y: ORIGIN_Y + g * DY,
      });
    });
  }

  // Nudge siblings under couple midpoints when both parents exist
  for (const g of genKeys) {
    if (g === 0) continue;
    const ids = byGen.get(g) ?? [];
    const clusters = new Map<string, string[]>();
    for (const id of ids) {
      const parents = draft.relationships
        .filter((r) => r.type === "parent" && r.to === id)
        .map((r) => r.from)
        .sort();
      const key = parents.join("+") || `solo:${id}`;
      const list = clusters.get(key) ?? [];
      list.push(id);
      clusters.set(key, list);
    }

    for (const [key, childIds] of clusters) {
      if (key.startsWith("solo:")) continue;
      const parentIds = key.split("+").filter(Boolean);
      const parentXs = parentIds
        .map((pid) => positions.get(pid)?.x)
        .filter((x): x is number => typeof x === "number");
      if (parentXs.length === 0) continue;
      const mid = parentXs.reduce((a, b) => a + b, 0) / parentXs.length;
      const totalW = Math.max(0, childIds.length - 1) * DX;
      const start = mid - totalW / 2;
      childIds.forEach((cid, i) => {
        const pos = positions.get(cid);
        if (!pos) return;
        positions.set(cid, { x: start + i * DX, y: pos.y });
      });
    }
  }

  const idMap = new Map<string, string>();
  const persons: Person[] = draft.persons.map((p) => {
    const newId = uuidv4();
    idMap.set(p.id, newId);
    const pos = positions.get(p.id) ?? { x: ORIGIN_X, y: ORIGIN_Y };
    const notesParts: string[] = [];
    if (p.notes) notesParts.push(p.notes);
    if (p.age != null) notesParts.push(`${p.age} 歲`);
    if (p.deceased) notesParts.push("已故");
    if (p.indexPerson) notesParts.push("指標人物");

    return createPerson({
      id: newId,
      gender: p.gender,
      name: p.name,
      x: pos.x,
      y: pos.y,
      age: p.age ?? null,
      birthYear: p.birthYear ?? null,
      deathYear: p.deathYear ?? null,
      deceased: Boolean(p.deceased),
      indexPerson: Boolean(p.indexPerson),
      notes: notesParts.join(" · "),
    });
  });

  const relationships: Relationship[] = [];
  const seenRel = new Set<string>();
  for (const r of draft.relationships) {
    const from = idMap.get(r.from);
    const to = idMap.get(r.to);
    if (!from || !to) continue;
    const key = `${from}|${to}|${r.type}`;
    const keyRev = COUPLE_TYPES.has(r.type)
      ? `${to}|${from}|${r.type}`
      : "";
    if (seenRel.has(key) || (keyRev && seenRel.has(keyRev))) continue;
    seenRel.add(key);
    relationships.push(
      createRelationship({
        id: uuidv4(),
        from,
        to,
        type: r.type,
      })
    );
  }

  const title =
    draft.title && draft.title.trim()
      ? draft.title.trim().slice(0, 120)
      : DEFAULT_DOCUMENT_TITLE;

  return {
    title,
    persons,
    relationships,
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: Date.now(),
    meta: { source: "ai-genogram", generatedAt: Date.now() },
  };
}
