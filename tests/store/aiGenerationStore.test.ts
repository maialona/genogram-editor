import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyDocument } from "../../src/types/document";
import { useAiGenerationStore } from "../../src/store/aiGenerationStore";

function resetStore() {
  useAiGenerationStore.setState({
    phase: "idle",
    runId: null,
    previewDocument: null,
    error: null,
  });
}

test("generation store ignores stale runs and exposes lock state", () => {
  resetStore();
  const store = useAiGenerationStore.getState();

  store.begin("run-1");
  assert.equal(useAiGenerationStore.getState().phase, "analyzing");
  assert.equal(useAiGenerationStore.getState().isGenerating(), true);

  useAiGenerationStore.getState().setPhase("stale", "structuring");
  assert.equal(useAiGenerationStore.getState().phase, "analyzing");

  useAiGenerationStore.getState().setPhase("run-1", "linking");
  assert.equal(useAiGenerationStore.getState().phase, "linking");

  const preview = createEmptyDocument();
  useAiGenerationStore.getState().setPreview("run-1", preview);
  assert.equal(useAiGenerationStore.getState().phase, "revealing");
  assert.equal(useAiGenerationStore.getState().previewDocument, preview);
});

test("cancel and failure unlock generation without accepting late completion", () => {
  resetStore();
  useAiGenerationStore.getState().begin("run-2");
  useAiGenerationStore.getState().cancel("run-2");

  assert.equal(useAiGenerationStore.getState().phase, "idle");
  assert.equal(useAiGenerationStore.getState().isGenerating(), false);
  assert.equal(useAiGenerationStore.getState().previewDocument, null);

  useAiGenerationStore.getState().complete("run-2");
  assert.equal(useAiGenerationStore.getState().phase, "idle");

  useAiGenerationStore.getState().begin("run-3");
  useAiGenerationStore.getState().fail("run-3", "network error");
  assert.equal(useAiGenerationStore.getState().phase, "error");
  assert.equal(useAiGenerationStore.getState().error, "network error");
  assert.equal(useAiGenerationStore.getState().isGenerating(), false);
});
