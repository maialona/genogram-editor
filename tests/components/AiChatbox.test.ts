import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiGenerationStatus } from "../../src/components/AiChatbox";
import { getAiChatboxClassName } from "../../src/components/aiChatboxClassName";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("chatbox shows a compact generation chip without a conversation panel", () => {
  const markup = renderToStaticMarkup(
    createElement(AiGenerationStatus, {
      phase: "analyzing",
      error: null,
      onDismissError: () => {},
    })
  );
  assert.match(markup, /ai-generation-chip/);
  assert.match(markup, /理解描述/);
  assert.doesNotMatch(markup, /ai-chat-panel/);
});

test("chatbox marks the composer as generating only during an active run", () => {
  assert.equal(getAiChatboxClassName(true), "ai-chatbox is-generating");
  assert.equal(getAiChatboxClassName(false), "ai-chatbox");
});
