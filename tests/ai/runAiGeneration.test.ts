import assert from "node:assert/strict";
import test from "node:test";
import { runAiGeneration } from "../../src/ai/runAiGeneration";
import type { AiGenerateResult, AiSettings } from "../../src/ai/types";

const settings: AiSettings = {
  apiKey: "test-key",
  provider: "openai",
  baseUrl: "https://example.com/v1",
  model: "test-model",
  useProxy: false,
};

const result: AiGenerateResult = {
  draft: {
    persons: [{ id: "p1", name: "小明", gender: "male", generation: 0 }],
    relationships: [],
  },
  warnings: [],
  rawContent: "{}",
};

test("generation controller advances phases, previews, then commits", async () => {
  const phases: string[] = [];
  let previewed = false;
  let committed = false;

  await runAiGeneration({
    description: "小明",
    settings,
    signal: new AbortController().signal,
    timings: { structuringMs: 1, linkingMs: 2, minimumMs: 0, revealMs: 0 },
    generate: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return result;
    },
    onPhase: (phase) => phases.push(phase),
    onPreview: () => {
      previewed = true;
    },
    onCommit: () => {
      committed = true;
    },
  });

  assert.deepEqual(phases, ["structuring", "linking"]);
  assert.equal(previewed, true);
  assert.equal(committed, true);
});

test("generation controller never previews or commits after abort", async () => {
  const controller = new AbortController();
  let previewed = false;
  let committed = false;

  const running = runAiGeneration({
    description: "小明",
    settings,
    signal: controller.signal,
    generate: async (_description, _settings, signal) =>
      await new Promise<AiGenerateResult>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    onPreview: () => {
      previewed = true;
    },
    onCommit: () => {
      committed = true;
    },
  });

  controller.abort();
  await assert.rejects(running, (error: unknown) => {
    return error instanceof DOMException && error.name === "AbortError";
  });
  assert.equal(previewed, false);
  assert.equal(committed, false);
});
