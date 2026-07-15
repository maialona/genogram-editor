import type { Document } from "../types/document";
import { createEmptyDocument } from "../types/document";

const STORAGE_KEY = "genogram-editor-document-v1";

export function loadDocument(): Document {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyDocument();
    const parsed = JSON.parse(raw) as Document;
    return normalizeDocument(parsed);
  } catch {
    return createEmptyDocument();
  }
}

export function saveDocument(document: Document): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  } catch {
    // Quota exceeded or private mode — fail silently in MVP
  }
}

export function clearDocument(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Ensure loaded JSON matches expected shape for older / partial saves. */
function normalizeDocument(input: Partial<Document>): Document {
  const empty = createEmptyDocument();
  return {
    persons: Array.isArray(input.persons) ? input.persons : empty.persons,
    relationships: Array.isArray(input.relationships)
      ? input.relationships
      : empty.relationships,
    annotations: Array.isArray(input.annotations)
      ? input.annotations
      : empty.annotations,
    viewport: {
      scale: input.viewport?.scale ?? empty.viewport.scale,
      offsetX: input.viewport?.offsetX ?? empty.viewport.offsetX,
      offsetY: input.viewport?.offsetY ?? empty.viewport.offsetY,
    },
    meta: input.meta,
  };
}
