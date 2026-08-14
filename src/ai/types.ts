import type {
  DiagramMode,
  EcoLinkFlow,
  EcoLinkQuality,
  EcoLinkStrength,
  EcoSystemCategory,
  Gender,
  RelationshipType,
} from "../types/document";

export type AiProviderId = "xai" | "openai" | "deepseek" | "anthropic" | "custom";

export interface AiSettings {
  apiKey: string;
  provider: AiProviderId;
  baseUrl: string;
  model: string;
  /** Use Vite /llm-proxy to avoid browser CORS. */
  useProxy: boolean;
}

export interface AiPersonDraft {
  id: string;
  name: string;
  gender: Gender;
  /** 0 = top generation. Optional; layout may infer from parent edges. */
  generation?: number | null;
  age?: number | null;
  birthYear?: number | null;
  deathYear?: number | null;
  deceased?: boolean;
  indexPerson?: boolean;
  notes?: string;
  /** Shared id for siblings that should render from one twin junction. */
  twinGroup?: string;
}

export interface AiRelationshipDraft {
  from: string;
  to: string;
  type: RelationshipType;
  /** Applies to parent relationships; omitted means biological. */
  parentKind?: "biological" | "adoptive";
}

export interface AiEcoSystemDraft {
  id: string;
  label: string;
  category: EcoSystemCategory;
  notes?: string;
}

/** Family-side endpoint: the household circle, or one person. */
export type AiEcoLinkFromDraft =
  | { kind: "household" }
  | { kind: "person"; personId: string };

export interface AiEcoLinkDraft {
  from: AiEcoLinkFromDraft;
  to: string;
  strength?: EcoLinkStrength;
  quality?: EcoLinkQuality;
  flow?: EcoLinkFlow;
  notes?: string;
}

/** Structured payload expected from the model (no pixel coordinates). */
export interface AiGenogramDraft {
  title?: string;
  summary?: string;
  /** Omitted or "genogram" keeps the family chart; "ecomap" opens the ecomap view. */
  diagramMode?: DiagramMode;
  persons: AiPersonDraft[];
  relationships: AiRelationshipDraft[];
  householdPersonIds?: string[];
  ecoSystems?: AiEcoSystemDraft[];
  ecoLinks?: AiEcoLinkDraft[];
}

export interface AiGenerateResult {
  draft: AiGenogramDraft;
  warnings: string[];
  rawContent: string;
}

export class AiClientError extends Error {
  readonly code:
    | "no_key"
    | "invalid_key"
    | "http"
    | "network"
    | "parse"
    | "empty"
    | "cors";

  readonly status?: number;

  constructor(
    code: AiClientError["code"],
    message: string,
    status?: number
  ) {
    super(message);
    this.name = "AiClientError";
    this.code = code;
    this.status = status;
  }
}
