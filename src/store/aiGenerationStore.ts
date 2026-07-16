import { create } from "zustand";
import type { Document } from "../types/document";

export type AiGenerationPhase =
  | "idle"
  | "analyzing"
  | "structuring"
  | "linking"
  | "revealing"
  | "error";

interface AiGenerationStore {
  phase: AiGenerationPhase;
  runId: string | null;
  previewDocument: Document | null;
  error: string | null;
  begin: (runId: string) => void;
  setPhase: (runId: string, phase: AiGenerationPhase) => void;
  setPreview: (runId: string, document: Document) => void;
  fail: (runId: string, message: string) => void;
  cancel: (runId?: string) => void;
  complete: (runId: string) => void;
  clearError: () => void;
  isGenerating: () => boolean;
}

const RESET_STATE = {
  phase: "idle" as const,
  runId: null,
  previewDocument: null,
  error: null,
};

export const useAiGenerationStore = create<AiGenerationStore>((set, get) => ({
  ...RESET_STATE,

  begin: (runId) =>
    set({
      phase: "analyzing",
      runId,
      previewDocument: null,
      error: null,
    }),

  setPhase: (runId, phase) => {
    if (get().runId !== runId) return;
    set({ phase });
  },

  setPreview: (runId, document) => {
    if (get().runId !== runId) return;
    set({ phase: "revealing", previewDocument: document, error: null });
  },

  fail: (runId, message) => {
    if (get().runId !== runId) return;
    set({ phase: "error", previewDocument: null, error: message });
  },

  cancel: (runId) => {
    if (runId != null && get().runId !== runId) return;
    set(RESET_STATE);
  },

  complete: (runId) => {
    if (get().runId !== runId) return;
    set(RESET_STATE);
  },

  clearError: () => {
    if (get().phase !== "error") return;
    set(RESET_STATE);
  },

  isGenerating: () => {
    const phase = get().phase;
    return (
      phase === "analyzing" ||
      phase === "structuring" ||
      phase === "linking" ||
      phase === "revealing"
    );
  },
}));
