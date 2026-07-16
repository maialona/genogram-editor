/** Core document model — the single source of truth. SVG never holds state. */

export type Gender = "male" | "female" | "unknown";

/** Sexual orientation markers (triangle overlays). */
export type Sexuality =
  | "none"
  | "gay"
  | "lesbian"
  | "bisexualMale"
  | "bisexualFemale";

/** Transgender presentation (inner opposite-gender shape). */
export type Transgender = "none" | "mtf" | "ftm";

/**
 * Special person symbols that replace the standard gender base shape.
 * stillbirth uses gender for square vs circle.
 */
export type SpecialPersonType =
  | "none"
  | "pregnancy"
  | "pet"
  | "institution"
  | "miscarriage"
  | "abortion"
  | "stillbirth";

/** Cultural / migration marks drawn above the person. */
export type CulturalMark = "none" | "immigration" | "multiCulture";

export type RelationshipType =
  // Family / couple
  | "marriage"
  | "engagement"
  | "separation" // legal separation (vertical slash) — legacy name kept
  | "separationInFact"
  | "divorce"
  | "widowed"
  | "cohabitation"
  | "legalCohabitation"
  | "engagementCohabitation"
  | "engagementSeparation"
  | "loveAffair"
  | "parent"
  | "adoptiveParent"
  | "twin"
  // Emotional
  | "harmony"
  | "indifferent"
  | "love"
  | "inLove"
  | "close"
  | "veryClose"
  | "conflict"
  | "hate"
  | "cutoff"
  | "hostile"
  | "distantHostile"
  | "closeHostile"
  | "fusedHostile"
  | "violence"
  | "abuse"
  | "physicalAbuse"
  | "emotionalAbuse"
  | "sexualAbuse"
  | "neglect"
  | "manipulative"
  | "controlling"
  | "focusedOn"
  | "fanAdmire";

/** Extensible metadata bag for future fields without changing core structure. */
export type ExtensibleMeta = Record<string, string | number | boolean | null>;

export interface Person {
  id: string;
  gender: Gender;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  age: number | null;
  deceased: boolean;
  indexPerson: boolean;
  /** Known medical condition ids and/or free-text labels. */
  medicalConditions: string[];
  notes: string;
  x: number;
  y: number;
  rotation: number;
  sexuality: Sexuality;
  transgender: Transgender;
  specialType: SpecialPersonType;
  culturalMark: CulturalMark;
  /** Reserved for future symbol / style extensions. */
  meta?: ExtensibleMeta;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: RelationshipType;
  /** Reserved for future relationship styling / multi-line layout. */
  meta?: ExtensibleMeta;
}

export interface Annotation {
  id: string;
  text: string;
  x: number;
  y: number;
  /** Reserved for future annotation types. */
  meta?: ExtensibleMeta;
}

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Document {
  /** Display name shown in the toolbar; used as export filename base. */
  title: string;
  persons: Person[];
  relationships: Relationship[];
  annotations: Annotation[];
  viewport: Viewport;
  /** Unix ms of last content change (client clock). */
  updatedAt: number;
  /** Document-level extensibility (schemaVersion, etc.). */
  meta?: ExtensibleMeta;
}

export type SelectableId = string;

export type SymbolLibraryItem =
  | { kind: "person"; gender: Gender; label: string }
  | { kind: "relationship"; type: RelationshipType; label: string }
  | {
      kind: "status";
      status: "deceased" | "indexPerson";
      label: string;
    }
  | {
      kind: "personAttr";
      attr:
        | { field: "sexuality"; value: Sexuality }
        | { field: "transgender"; value: Transgender }
        | { field: "specialType"; value: SpecialPersonType }
        | { field: "culturalMark"; value: CulturalMark };
      label: string;
    }
  | { kind: "medical"; marker: string; label: string };

export const DEFAULT_VIEWPORT: Viewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_DOCUMENT_TITLE = "Untitled";

export function createEmptyDocument(): Document {
  return {
    title: DEFAULT_DOCUMENT_TITLE,
    persons: [],
    relationships: [],
    annotations: [],
    viewport: { ...DEFAULT_VIEWPORT },
    updatedAt: Date.now(),
  };
}

export function createPerson(
  partial: Partial<Person> & Pick<Person, "id" | "gender" | "x" | "y">
): Person {
  return {
    name: "",
    birthYear: null,
    deathYear: null,
    age: null,
    deceased: false,
    indexPerson: false,
    medicalConditions: [],
    notes: "",
    rotation: 0,
    sexuality: "none",
    transgender: "none",
    specialType: "none",
    culturalMark: "none",
    ...partial,
  };
}

export function createRelationship(
  partial: Pick<Relationship, "id" | "from" | "to" | "type"> &
    Partial<Relationship>
): Relationship {
  return { ...partial };
}
