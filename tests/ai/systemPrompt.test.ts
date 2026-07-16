import assert from "node:assert/strict";
import test from "node:test";
import { buildSystemPrompt } from "../../src/ai/systemPrompt";

test("system prompt requires adoption, twins, complete child links, and final couple state", () => {
  const prompt = buildSystemPrompt();

  assert.match(prompt, /parentKind/);
  assert.match(prompt, /twinGroup/);
  assert.match(prompt, /每一位.*子女/);
  assert.match(prompt, /最終狀態/);
});
