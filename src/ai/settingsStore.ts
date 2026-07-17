import { create } from "zustand";
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
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
  },
};

const DEFAULT_SETTINGS: AiSettings = {
  apiKey: "",
  provider: "xai",
  baseUrl: PROVIDER_PRESETS.xai.baseUrl,
  model: PROVIDER_PRESETS.xai.defaultModel,
  useProxy: true,
};

function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    const provider: AiProviderId =
      parsed.provider === "openai" ||
      parsed.provider === "deepseek" ||
      parsed.provider === "custom" ||
      parsed.provider === "xai"
        ? parsed.provider
        : "xai";

    const preset =
      provider === "custom" ? null : PROVIDER_PRESETS[provider];

    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      provider,
      baseUrl:
        typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()
          ? parsed.baseUrl.trim().replace(/\/$/, "")
          : (preset?.baseUrl ?? DEFAULT_SETTINGS.baseUrl),
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model.trim()
          : (preset?.defaultModel ?? DEFAULT_SETTINGS.model),
      useProxy:
        typeof parsed.useProxy === "boolean"
          ? parsed.useProxy
          : DEFAULT_SETTINGS.useProxy,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(settings: AiSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota / private mode
  }
}

interface AiSettingsStore extends AiSettings {
  setApiKey: (apiKey: string) => void;
  setProvider: (provider: AiProviderId) => void;
  setBaseUrl: (baseUrl: string) => void;
  setModel: (model: string) => void;
  setUseProxy: (useProxy: boolean) => void;
  saveAll: (partial: Partial<AiSettings>) => void;
  hasApiKey: () => boolean;
}

export const useAiSettingsStore = create<AiSettingsStore>((set, get) => {
  const initial = loadSettings();
  return {
    ...initial,

    setApiKey: (apiKey) => {
      const next = { ...snapshot(get()), apiKey };
      persist(next);
      set({ apiKey });
    },

    setProvider: (provider) => {
      const preset =
        provider === "custom" ? null : PROVIDER_PRESETS[provider];
      const next: AiSettings = {
        apiKey: get().apiKey,
        provider,
        baseUrl: preset?.baseUrl ?? get().baseUrl,
        model: preset?.defaultModel ?? get().model,
        useProxy: get().useProxy,
      };
      persist(next);
      set(next);
    },

    setBaseUrl: (baseUrl) => {
      const cleaned = baseUrl.trim().replace(/\/$/, "");
      const next: AiSettings = {
        ...snapshot(get()),
        baseUrl: cleaned,
        provider: "custom",
      };
      persist(next);
      set({ baseUrl: cleaned, provider: "custom" });
    },

    setModel: (model) => {
      const next = { ...snapshot(get()), model: model.trim() };
      persist(next);
      set({ model: model.trim() });
    },

    setUseProxy: (useProxy) => {
      const next = { ...snapshot(get()), useProxy };
      persist(next);
      set({ useProxy });
    },

    saveAll: (partial) => {
      const next: AiSettings = {
        apiKey: partial.apiKey ?? get().apiKey,
        provider: partial.provider ?? get().provider,
        baseUrl: (partial.baseUrl ?? get().baseUrl).replace(/\/$/, ""),
        model: partial.model ?? get().model,
        useProxy: partial.useProxy ?? get().useProxy,
      };
      persist(next);
      set(next);
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
