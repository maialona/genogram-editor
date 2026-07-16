import { generateGenogramDraft } from "./client";
import { layoutGenogram } from "./layoutGenogram";
import type { AiGenerationPhase } from "../store/aiGenerationStore";
import type { Document } from "../types/document";
import type { AiGenerateResult, AiSettings } from "./types";

interface GenerationTimings {
  structuringMs: number;
  linkingMs: number;
  minimumMs: number;
  revealMs: number;
}

interface RunAiGenerationOptions {
  description: string;
  settings: AiSettings;
  signal: AbortSignal;
  timings?: Partial<GenerationTimings>;
  generate?: typeof generateGenogramDraft;
  onPhase?: (phase: AiGenerationPhase) => void;
  onPreview: (document: Document, result: AiGenerateResult) => void;
  onCommit: (document: Document, result: AiGenerateResult) => void;
}

const DEFAULT_TIMINGS: GenerationTimings = {
  structuringMs: 160,
  linkingMs: 320,
  minimumMs: 450,
  revealMs: 900,
};

function abortError() {
  return new DOMException("Aborted", "AbortError");
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runAiGeneration({
  description,
  settings,
  signal,
  timings: timingOverrides,
  generate = generateGenogramDraft,
  onPhase,
  onPreview,
  onCommit,
}: RunAiGenerationOptions): Promise<{
  document: Document;
  result: AiGenerateResult;
}> {
  const timings = { ...DEFAULT_TIMINGS, ...timingOverrides };
  const startedAt = Date.now();
  const phaseTimers = [
    globalThis.setTimeout(
      () => onPhase?.("structuring"),
      timings.structuringMs
    ),
    globalThis.setTimeout(() => onPhase?.("linking"), timings.linkingMs),
  ];

  try {
    const result = await generate(description, settings, signal);
    const elapsed = Date.now() - startedAt;
    await wait(Math.max(0, timings.minimumMs - elapsed), signal);
    if (signal.aborted) throw abortError();

    const document = layoutGenogram(result.draft);
    onPreview(document, result);
    await wait(timings.revealMs, signal);
    if (signal.aborted) throw abortError();
    onCommit(document, result);
    return { document, result };
  } finally {
    phaseTimers.forEach((timer) => globalThis.clearTimeout(timer));
  }
}
