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

test("family-only model output still commits an ecomap when the user asked for one", async () => {
  let committedSystems = 0;
  let committedMode = "";

  await runAiGeneration({
    description:
      "請畫生態圖。小明 30 歲，妻子美華，女兒小華上幼兒園適應有壓力。小明和朋友互相支持。小明在工廠上班連結弱。全家已不再參加籃球社。",
    settings,
    signal: new AbortController().signal,
    timings: { structuringMs: 1, linkingMs: 2, minimumMs: 0, revealMs: 0 },
    generate: async () => ({
      draft: {
        persons: [
          { id: "p1", name: "小明", gender: "male", generation: 0, indexPerson: true },
          { id: "p2", name: "美華", gender: "female", generation: 0 },
          { id: "p3", name: "小華", gender: "female", generation: 1 },
        ],
        relationships: [
          { from: "p1", to: "p2", type: "marriage" },
          { from: "p1", to: "p3", type: "parent" },
          { from: "p2", to: "p3", type: "parent" },
        ],
      },
      warnings: [],
      rawContent: "{}",
    }),
    onPreview: () => {},
    onCommit: (document) => {
      committedMode = String(document.meta?.diagramMode ?? "");
      committedSystems = document.ecoSystems.length;
    },
  });

  assert.equal(committedMode, "ecomap");
  assert.equal(committedSystems, 4);
});

test("generation controller layouts an ecomap draft into ecomap mode", async () => {
  const ecomapResult: AiGenerateResult = {
    draft: {
      diagramMode: "ecomap",
      persons: [
        { id: "p1", name: "小明", gender: "male", generation: 0, indexPerson: true },
      ],
      relationships: [],
      householdPersonIds: ["p1"],
      ecoSystems: [{ id: "s1", label: "教會", category: "religion" }],
      ecoLinks: [{ from: { kind: "household" }, to: "s1", strength: "strong" }],
    },
    warnings: [],
    rawContent: "{}",
  };

  let committedMode: string | undefined;
  let systemCount = 0;

  await runAiGeneration({
    description: "請畫生態圖",
    settings,
    signal: new AbortController().signal,
    timings: { structuringMs: 1, linkingMs: 2, minimumMs: 0, revealMs: 0 },
    generate: async () => ecomapResult,
    onPreview: () => {},
    onCommit: (document) => {
      committedMode = String(document.meta?.diagramMode ?? "");
      systemCount = document.ecoSystems.length;
    },
  });

  assert.equal(committedMode, "ecomap");
  assert.equal(systemCount, 1);
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
