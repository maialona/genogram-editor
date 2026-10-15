import { create } from "zustand";
import {
  getApiKey,
  loadApiKeyring,
  normalizeApiBaseUrl,
  updateApiKey,
  type AiApiKeyring,
} from "./apiKeyring";
import type { AiProviderId, AiSettings } from "./types";

const STORAGE_KEY = "genogram-editor-ai-settings-v1";

export const PROVIDER_PRESETS: Record<
  Exclude<AiProviderId, "custom">,
  { label: string; baseUrl: string; defaultModel: string; models: string[] }
> = {
  xai: {
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
    models: [
      "grok-4.5",
      "grok-4.20-0309-reasoning",
      "grok-4.20-0309-non-reasoning",
    ],
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-6-luna",
    models: ["gpt-6-luna"],
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
  },
  anthropic: {
    label: "Claude (Anthropic)",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-5",
    models: ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"],
  },
};

const DEFAULT_SETTINGS: AiSettings = {
  apiKey: "",
  provider: "openai",
  baseUrl: PROVIDER_PRESETS.openai.baseUrl,
  model: PROVIDER_PRESETS.openai.defaultModel,
  useProxy: true,
};

interface PersistedAiSettings extends Partial<AiSettings> {
  apiKeys?: unknown;
  customBaseUrl?: unknown;
  customModel?: unknown;
}

interface LoadedSettings {
  settings: AiSettings;
  apiKeys: AiApiKeyring;
  customBaseUrl: string;
  customModel: string;
}

function defaultLoadedSettings(): LoadedSettings {
  return {
    settings: { ...DEFAULT_SETTINGS },
    apiKeys: {},
    customBaseUrl: "",
    customModel: "",
  };
}

function loadSettings(): LoadedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLoadedSettings();
    const parsed = JSON.parse(raw) as PersistedAiSettings;
    const provider: AiProviderId =
      parsed.provider === "openai" ||
      parsed.provider === "deepseek" ||
      parsed.provider === "anthropic" ||
      parsed.provider === "custom" ||
      parsed.provider === "xai"
        ? parsed.provider
        : "openai";

    const preset =
      provider === "custom" ? null : PROVIDER_PRESETS[provider];
    const baseUrl =
      typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()
        ? normalizeApiBaseUrl(parsed.baseUrl)
        : (preset?.baseUrl ?? DEFAULT_SETTINGS.baseUrl);
    const storedModel =
      typeof parsed.model === "string" ? parsed.model.trim() : "";
    const model =
      provider === "openai" && storedModel.startsWith("gpt-4")
        ? PROVIDER_PRESETS.openai.defaultModel
        : storedModel || preset?.defaultModel || DEFAULT_SETTINGS.model;
    const apiKeys = loadApiKeyring(parsed.apiKeys, {
      provider,
      baseUrl,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    });

    return {
      settings: {
        apiKey: getApiKey(apiKeys, provider, baseUrl),
        provider,
        baseUrl,
        model,
        useProxy:
          typeof parsed.useProxy === "boolean"
            ? parsed.useProxy
            : DEFAULT_SETTINGS.useProxy,
      },
      apiKeys,
      customBaseUrl:
        typeof parsed.customBaseUrl === "string"
          ? normalizeApiBaseUrl(parsed.customBaseUrl)
          : provider === "custom"
            ? baseUrl
            : "",
      customModel:
        typeof parsed.customModel === "string"
          ? parsed.customModel.trim()
          : provider === "custom"
            ? model
            : "",
    };
  } catch {
    return defaultLoadedSettings();
  }
}

function persist(
  settings: AiSettings,
  apiKeys: AiApiKeyring,
  customBaseUrl: string,
  customModel: string
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        provider: settings.provider,
        baseUrl: settings.baseUrl,
        model: settings.model,
        useProxy: settings.useProxy,
        apiKeys,
        customBaseUrl,
        customModel,
      })
    );
  } catch {
    // ignore quota / private mode
  }
}

interface AiSettingsStore extends AiSettings {
  apiKeys: AiApiKeyring;
  customBaseUrl: string;
  customModel: string;
  getApiKey: (provider: AiProviderId, baseUrl: string) => string;
  setApiKey: (apiKey: string) => void;
  setProvider: (provider: AiProviderId) => void;
  setBaseUrl: (baseUrl: string) => void;
  setModel: (model: string) => void;
  setUseProxy: (useProxy: boolean) => void;
  saveAll: (partial: Partial<AiSettings>, apiKeys?: AiApiKeyring) => void;
  hasApiKey: () => boolean;
}

export const useAiSettingsStore = create<AiSettingsStore>((set, get) => {
  const initial = loadSettings();
  return {
    ...initial.settings,
    apiKeys: initial.apiKeys,
    customBaseUrl: initial.customBaseUrl,
    customModel: initial.customModel,

    getApiKey: (provider, baseUrl) =>
      getApiKey(get().apiKeys, provider, baseUrl),

    setApiKey: (apiKey) => {
      const cleaned = apiKey.trim();
      const apiKeys = updateApiKey(
        get().apiKeys,
        get().provider,
        get().baseUrl,
        cleaned
      );
      const next = { ...snapshot(get()), apiKey: cleaned };
      persist(next, apiKeys, get().customBaseUrl, get().customModel);
      set({ apiKey: cleaned, apiKeys });
    },

    setProvider: (provider) => {
      const preset =
        provider === "custom" ? null : PROVIDER_PRESETS[provider];
      const baseUrl = preset?.baseUrl ?? get().customBaseUrl;
      const model = preset?.defaultModel ?? get().customModel;
      const next: AiSettings = {
        apiKey: getApiKey(get().apiKeys, provider, baseUrl),
        provider,
        baseUrl,
        model,
        useProxy: get().useProxy,
      };
      persist(next, get().apiKeys, get().customBaseUrl, get().customModel);
      set(next);
    },

    setBaseUrl: (baseUrl) => {
      const cleaned = normalizeApiBaseUrl(baseUrl);
      const next: AiSettings = {
        ...snapshot(get()),
        apiKey: getApiKey(get().apiKeys, "custom", cleaned),
        baseUrl: cleaned,
        provider: "custom",
      };
      persist(next, get().apiKeys, cleaned, get().customModel);
      set({ ...next, customBaseUrl: cleaned });
    },

    setModel: (model) => {
      const next = { ...snapshot(get()), model: model.trim() };
      const customModel =
        get().provider === "custom" ? model.trim() : get().customModel;
      persist(next, get().apiKeys, get().customBaseUrl, customModel);
      set({ model: model.trim(), customModel });
    },

    setUseProxy: (useProxy) => {
      const next = { ...snapshot(get()), useProxy };
      persist(next, get().apiKeys, get().customBaseUrl, get().customModel);
      set({ useProxy });
    },

    saveAll: (partial, draftApiKeys) => {
      const provider = partial.provider ?? get().provider;
      const baseUrl = normalizeApiBaseUrl(partial.baseUrl ?? get().baseUrl);
      const sourceApiKeys = draftApiKeys ?? get().apiKeys;
      const apiKey = (
        partial.apiKey ?? getApiKey(sourceApiKeys, provider, baseUrl)
      ).trim();
      const apiKeys = updateApiKey(
        sourceApiKeys,
        provider,
        baseUrl,
        apiKey
      );
      const next: AiSettings = {
        apiKey,
        provider,
        baseUrl,
        model: partial.model ?? get().model,
        useProxy: partial.useProxy ?? get().useProxy,
      };
      const customBaseUrl =
        provider === "custom" ? baseUrl : get().customBaseUrl;
      const customModel =
        provider === "custom" ? next.model : get().customModel;
      persist(next, apiKeys, customBaseUrl, customModel);
      set({ ...next, apiKeys, customBaseUrl, customModel });
    },

    hasApiKey: () => get().apiKey.trim().length > 0,
  };
});

function snapshot(s: AiSettingsStore): AiSettings {
  return {
    apiKey: s.apiKey,
    provider: s.provider,
    baseUrl: s.baseUrl,
    model: s.model,
    useProxy: s.useProxy,
  };
}

export function getAiSettingsSnapshot(): AiSettings {
  const s = useAiSettingsStore.getState();
  return snapshot(s);
}
