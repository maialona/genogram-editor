import type {
  CulturalMark,
  Document,
  Gender,
  Person,
  Relationship,
  RelationshipType,
  Sexuality,
  SpecialPersonType,
  Transgender,
} from "../types/document";
import {
  createEmptyDocument,
  createPerson,
  DEFAULT_DOCUMENT_TITLE,
} from "../types/document";
import { RELATIONSHIP_LABELS } from "../types/relationshipCatalog";

const STORAGE_KEY = "genogram-editor-document-v1";

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" | "unknown" };

export function loadDocument(): Document {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyDocument();
    const parsed = JSON.parse(raw) as Partial<Document>;
    return normalizeDocument(parsed);
  } catch {
    return createEmptyDocument();
  }
}

export function saveDocument(document: Document): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    return { ok: true };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: string }).name)
        : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      return { ok: false, reason: "quota" };
    }
    // Private mode / disabled storage often throws SecurityError or DOMException
    if (name === "SecurityError") {
      return { ok: false, reason: "unavailable" };
    }
    return { ok: false, reason: "unknown" };
  }
}

export function clearDocument(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const VALID_RELS = new Set(Object.keys(RELATIONSHIP_LABELS));

function normalizeGender(g: unknown): Gender {
  if (g === "male" || g === "female" || g === "unknown") return g;
  return "unknown";
}

function normalizeSexuality(v: unknown): Sexuality {
  const ok: Sexuality[] = [
    "none",
    "gay",
    "lesbian",
    "bisexualMale",
    "bisexualFemale",
  ];
  return ok.includes(v as Sexuality) ? (v as Sexuality) : "none";
}

function normalizeTrans(v: unknown): Transgender {
  return v === "mtf" || v === "ftm" ? v : "none";
}

function normalizeSpecial(v: unknown): SpecialPersonType {
  const ok: SpecialPersonType[] = [
    "none",
    "pregnancy",
    "pet",
    "institution",
    "miscarriage",
    "abortion",
    "stillbirth",
  ];
  return ok.includes(v as SpecialPersonType)
    ? (v as SpecialPersonType)
    : "none";
}

function normalizeCulture(v: unknown): CulturalMark {
  return v === "immigration" || v === "multiCulture" ? v : "none";
}

function normalizeTitle(raw: unknown, meta: Document["meta"]): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 120);
  if (meta && typeof meta.title === "string" && meta.title.trim()) {
    return String(meta.title).trim().slice(0, 120);
  }
  return DEFAULT_DOCUMENT_TITLE;
}

function normalizePerson(raw: Partial<Person> & { id?: string }): Person | null {
  if (!raw.id || typeof raw.x !== "number" || typeof raw.y !== "number") {
    return null;
  }
  return createPerson({
    id: raw.id,
    gender: normalizeGender(raw.gender),
    x: raw.x,
    y: raw.y,
    name: typeof raw.name === "string" ? raw.name : "",
    birthYear: typeof raw.birthYear === "number" ? raw.birthYear : null,
    deathYear: typeof raw.deathYear === "number" ? raw.deathYear : null,
    age: typeof raw.age === "number" ? raw.age : null,
    deceased: Boolean(raw.deceased),
    indexPerson: Boolean(raw.indexPerson),
    medicalConditions: Array.isArray(raw.medicalConditions)
      ? raw.medicalConditions.filter((c): c is string => typeof c === "string")
      : [],
    notes: typeof raw.notes === "string" ? raw.notes : "",
    rotation: typeof raw.rotation === "number" ? raw.rotation : 0,
    sexuality: normalizeSexuality(raw.sexuality),
    transgender: normalizeTrans(raw.transgender),
    specialType: normalizeSpecial(raw.specialType),
    culturalMark: normalizeCulture(raw.culturalMark),
    meta: raw.meta,
  });
}

function normalizeRelationship(
  raw: Partial<Relationship>
): Relationship | null {
  if (!raw.id || !raw.from || !raw.to) return null;
  let type = raw.type as RelationshipType;
  if (!VALID_RELS.has(type)) {
    // legacy aliases
    if (type === ("separation" as RelationshipType)) type = "separation";
    else type = "marriage";
  }
  if (!VALID_RELS.has(type)) type = "marriage";
  return {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    type,
    meta: raw.meta,
  };
}

/** Ensure loaded JSON matches expected shape for older / partial saves. */
export function normalizeDocument(input: Partial<Document>): Document {
  const empty = createEmptyDocument();
  const persons = Array.isArray(input.persons)
    ? input.persons
        .map((p) => normalizePerson(p as Partial<Person>))
        .filter((p): p is Person => p != null)
    : empty.persons;

  const relationships = Array.isArray(input.relationships)
    ? input.relationships
        .map((r) => normalizeRelationship(r as Partial<Relationship>))
        .filter((r): r is Relationship => r != null)
    : empty.relationships;

  return {
    title: normalizeTitle(input.title, input.meta),
    persons,
    relationships,
    annotations: Array.isArray(input.annotations)
      ? input.annotations
      : empty.annotations,
    viewport: {
      scale: input.viewport?.scale ?? empty.viewport.scale,
      offsetX: input.viewport?.offsetX ?? empty.viewport.offsetX,
      offsetY: input.viewport?.offsetY ?? empty.viewport.offsetY,
    },
    updatedAt:
      typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt)
        ? input.updatedAt
        : Date.now(),
    meta: input.meta,
  };
}
