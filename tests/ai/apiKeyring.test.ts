import assert from "node:assert/strict";
import test from "node:test";
import {
  getApiKey,
  getApiKeySlot,
  loadApiKeyring,
  updateApiKey,
} from "../../src/ai/apiKeyring";
import {
  PROVIDER_PRESETS,
  useAiSettingsStore,
} from "../../src/ai/settingsStore";

test("OpenAI preset exposes only GPT-6 Luna", () => {
  assert.equal(PROVIDER_PRESETS.openai.defaultModel, "gpt-6-luna");
  assert.deepEqual(PROVIDER_PRESETS.openai.models, ["gpt-6-luna"]);
});

test("keeps a separate API key for each provider", () => {
  let keyring = updateApiKey(
    {},
    "openai",
    "https://api.openai.com/v1",
    "openai-key"
  );
  keyring = updateApiKey(
    keyring,
    "deepseek",
    "https://api.deepseek.com",
    "deepseek-key"
  );

  assert.equal(getApiKey(keyring, "openai", "ignored"), "openai-key");
  assert.equal(getApiKey(keyring, "deepseek", "ignored"), "deepseek-key");
});

test("keeps custom endpoint keys separate by normalized base URL", () => {
  let keyring = updateApiKey(
    {},
    "custom",
    "https://one.example/v1/",
    "one-key"
  );
  keyring = updateApiKey(
    keyring,
    "custom",
    "https://two.example/v1",
    "two-key"
  );

  assert.equal(
    getApiKey(keyring, "custom", "https://one.example/v1"),
    "one-key"
  );
  assert.equal(
    getApiKey(keyring, "custom", "https://two.example/v1/"),
    "two-key"
  );
  assert.notEqual(
    getApiKeySlot("custom", "https://one.example/v1"),
    getApiKeySlot("custom", "https://two.example/v1")
  );
});

test("migrates the legacy single API key into the active provider slot", () => {
  const keyring = loadApiKeyring(undefined, {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: " legacy-key ",
  });

  assert.equal(getApiKey(keyring, "openai", "ignored"), "legacy-key");
});

test("clearing one API key preserves the other provider keys", () => {
  const keyring = updateApiKey(
    { openai: "openai-key", anthropic: "anthropic-key" },
    "openai",
    "ignored",
    ""
  );

  assert.equal(getApiKey(keyring, "openai", "ignored"), "");
  assert.equal(getApiKey(keyring, "anthropic", "ignored"), "anthropic-key");
});

test("switching provider activates its saved API key", () => {
  const original = useAiSettingsStore.getState();

  try {
    useAiSettingsStore.setState(
      {
        ...original,
        apiKey: "openai-key",
        provider: "openai",
        baseUrl: PROVIDER_PRESETS.openai.baseUrl,
        model: PROVIDER_PRESETS.openai.defaultModel,
        apiKeys: { openai: "openai-key", deepseek: "deepseek-key" },
      },
      true
    );

    useAiSettingsStore.getState().setProvider("deepseek");

    const switched = useAiSettingsStore.getState();
    assert.equal(switched.provider, "deepseek");
    assert.equal(switched.apiKey, "deepseek-key");
    assert.equal(switched.model, PROVIDER_PRESETS.deepseek.defaultModel);
  } finally {
    useAiSettingsStore.setState(original, true);
  }
});
