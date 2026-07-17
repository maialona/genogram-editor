import type { Gender, RelationshipType } from "../types/document";

export type AiProviderId = "xai" | "openai" | "deepseek" | "custom";

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

/** Structured payload expected from the model (no pixel coordinates). */
export interface AiGenogramDraft {
  title?: string;
  summary?: string;
  persons: AiPersonDraft[];
  relationships: AiRelationshipDraft[];
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
