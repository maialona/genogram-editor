/** Core document model — the single source of truth. SVG never holds state. */

export type Gender = "male" | "female" | "unknown";

export type RelationshipType =
  | "marriage"
  | "divorce"
  | "separation"
  | "cohabitation"
  | "engagement"
  | "parent"
  | "harmony"
  | "close"
  | "conflict"
  | "abuse"
  | "hostile";

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
  medicalConditions: string[];
  notes: string;
  x: number;
  y: number;
  rotation: number;
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
  persons: Person[];
  relationships: Relationship[];
  annotations: Annotation[];
  viewport: Viewport;
  /** Document-level extensibility (title, version, etc.). */
  meta?: ExtensibleMeta;
}

export type SelectableId = string;

export type SymbolLibraryItem =
  | { kind: "person"; gender: Gender; label: string }
  | { kind: "relationship"; type: RelationshipType; label: string }
  | { kind: "status"; status: "deceased" | "indexPerson"; label: string }
  | { kind: "medical"; marker: string; label: string };

export const DEFAULT_VIEWPORT: Viewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function createEmptyDocument(): Document {
  return {
    persons: [],
    relationships: [],
    annotations: [],
    viewport: { ...DEFAULT_VIEWPORT },
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
    ...partial,
  };
}

export function createRelationship(
  partial: Pick<Relationship, "id" | "from" | "to" | "type"> &
    Partial<Relationship>
): Relationship {
  return { ...partial };
}
