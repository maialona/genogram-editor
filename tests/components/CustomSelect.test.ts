import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomSelect } from "../../src/components/CustomSelect";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("custom select renders an accessible combobox without a native select", () => {
  const markup = renderToStaticMarkup(
    createElement(CustomSelect, {
      ariaLabel: "供應商",
      value: "openai",
      options: [
        { value: "openai", label: "OpenAI" },
        { value: "deepseek", label: "DeepSeek" },
      ],
      onChange: () => {},
    })
  );

  assert.match(markup, /role="combobox"/);
  assert.match(markup, /aria-haspopup="listbox"/);
  assert.match(markup, />OpenAI</);
  assert.doesNotMatch(markup, /<select/);
});
