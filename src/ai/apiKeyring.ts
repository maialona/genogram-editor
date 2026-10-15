import type { AiProviderId } from "./types";

export type AiApiKeyring = Record<string, string>;

export function normalizeApiBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function getApiKeySlot(
  provider: AiProviderId,
  baseUrl: string
): string {
  return provider === "custom"
    ? `custom:${normalizeApiBaseUrl(baseUrl)}`
    : provider;
}

export function getApiKey(
  keyring: AiApiKeyring,
  provider: AiProviderId,
  baseUrl: string
): string {
  return keyring[getApiKeySlot(provider, baseUrl)] ?? "";
}

export function updateApiKey(
  keyring: AiApiKeyring,
  provider: AiProviderId,
  baseUrl: string,
  apiKey: string
): AiApiKeyring {
  const next = { ...keyring };
  const slot = getApiKeySlot(provider, baseUrl);
  const cleaned = apiKey.trim();
  if (cleaned) next[slot] = cleaned;
  else delete next[slot];
  return next;
}

export function loadApiKeyring(
  value: unknown,
  legacy?: { provider: AiProviderId; baseUrl: string; apiKey: string }
): AiApiKeyring {
  const keyring: AiApiKeyring = {};

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [slot, apiKey] of Object.entries(value)) {
      if (typeof apiKey === "string" && apiKey.trim()) {
        keyring[slot] = apiKey.trim();
      }
    }
  }

  if (legacy?.apiKey.trim()) {
    const slot = getApiKeySlot(legacy.provider, legacy.baseUrl);
    keyring[slot] ??= legacy.apiKey.trim();
  }

  return keyring;
}
