import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  getApiKey,
  updateApiKey,
  type AiApiKeyring,
} from "../ai/apiKeyring";
import {
  PROVIDER_PRESETS,
  useAiSettingsStore,
} from "../ai/settingsStore";
import type { AiProviderId } from "../ai/types";
import { CustomSelect } from "./CustomSelect";

const PROVIDER_OPTIONS: Array<{ value: AiProviderId; label: string }> = [
  { value: "xai", label: PROVIDER_PRESETS.xai.label },
  { value: "openai", label: PROVIDER_PRESETS.openai.label },
  { value: "deepseek", label: PROVIDER_PRESETS.deepseek.label },
  { value: "anthropic", label: PROVIDER_PRESETS.anthropic.label },
  { value: "custom", label: "Custom（OpenAI 相容）" },
];

interface AiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ open, onClose }: AiSettingsModalProps) {
  const titleId = useId();
  const stored = useAiSettingsStore();
  const [apiKey, setApiKey] = useState(stored.apiKey);
  const [provider, setProvider] = useState<AiProviderId>(stored.provider);
  const [baseUrl, setBaseUrl] = useState(stored.baseUrl);
  const [model, setModel] = useState(stored.model);
  const [useProxy, setUseProxy] = useState(stored.useProxy);
  const [apiKeys, setApiKeys] = useState<AiApiKeyring>(stored.apiKeys);
  const [customBaseUrl, setCustomBaseUrl] = useState(stored.customBaseUrl);
  const [customModel, setCustomModel] = useState(stored.customModel);

  useEffect(() => {
    if (!open) return;
    setApiKey(stored.apiKey);
    setProvider(stored.provider);
    setBaseUrl(stored.baseUrl);
    setModel(stored.model);
    setUseProxy(stored.useProxy);
    setApiKeys(stored.apiKeys);
    setCustomBaseUrl(stored.customBaseUrl);
    setCustomModel(stored.customModel);
  }, [
    open,
    stored.apiKey,
    stored.provider,
    stored.baseUrl,
    stored.model,
    stored.useProxy,
    stored.apiKeys,
    stored.customBaseUrl,
    stored.customModel,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const presetModels =
    provider === "custom"
      ? []
      : PROVIDER_PRESETS[provider].models;

  const onProviderChange = (next: AiProviderId) => {
    const nextApiKeys = updateApiKey(apiKeys, provider, baseUrl, apiKey);
    setApiKeys(nextApiKeys);
    if (provider === "custom") {
      setCustomBaseUrl(baseUrl);
      setCustomModel(model);
    }
    setProvider(next);
    if (next === "custom") {
      setBaseUrl(customBaseUrl);
      setModel(customModel);
      setApiKey(getApiKey(nextApiKeys, next, customBaseUrl));
    } else {
      const p = PROVIDER_PRESETS[next];
      setBaseUrl(p.baseUrl);
      setModel(p.defaultModel);
      setApiKey(getApiKey(nextApiKeys, next, p.baseUrl));
    }
  };

  const save = () => {
    const nextApiKeys = updateApiKey(apiKeys, provider, baseUrl, apiKey);
    stored.saveAll(
      {
        apiKey: apiKey.trim(),
        provider,
        baseUrl,
        model: model.trim(),
        useProxy,
      },
      nextApiKeys
    );
    onClose();
  };

  return createPortal(
    <div
      className="ai-settings-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ai-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ai-settings-head">
          <h2 id={titleId}>AI 設定</h2>
          <button
            type="button"
            className="ai-chat-icon-btn"
            onClick={onClose}
            aria-label="關閉"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <p className="ai-settings-hint">
          每個供應商的 API Key 會分開保存在本機瀏覽器（localStorage）。
        </p>

        <label className="ai-settings-field">
          <span>API Key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => {
              const nextKey = e.target.value;
              setApiKey(nextKey);
              setApiKeys((current) =>
                updateApiKey(current, provider, baseUrl, nextKey)
              );
            }}
            placeholder="貼上你的 API Key"
          />
          {apiKey && (
            <button
              type="button"
              className="ai-settings-clear-key"
              onClick={() => {
                setApiKey("");
                setApiKeys((current) =>
                  updateApiKey(current, provider, baseUrl, "")
                );
              }}
            >
              清除此供應商的 Key
            </button>
          )}
        </label>

        <label className="ai-settings-field">
          <span>供應商</span>
          <CustomSelect
            ariaLabel="供應商"
            value={provider}
            options={PROVIDER_OPTIONS}
            onChange={(next) => onProviderChange(next as AiProviderId)}
          />
        </label>

        <label className="ai-settings-field">
          <span>Base URL</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => {
              const nextBaseUrl = e.target.value;
              const nextApiKeys = updateApiKey(
                apiKeys,
                provider,
                baseUrl,
                apiKey
              );
              setApiKeys(nextApiKeys);
              setApiKey(getApiKey(nextApiKeys, "custom", nextBaseUrl));
              setBaseUrl(nextBaseUrl);
              setCustomBaseUrl(nextBaseUrl);
              setProvider("custom");
            }}
            placeholder="https://api.x.ai/v1"
          />
        </label>

        <label className="ai-settings-field">
          <span>模型</span>
          {presetModels.length > 0 ? (
            <CustomSelect
              ariaLabel="模型"
              value={model}
              options={[
                ...(!presetModels.includes(model)
                  ? [{ value: model, label: model }]
                  : []),
                ...presetModels.map((presetModel) => ({
                  value: presetModel,
                  label: presetModel,
                })),
              ]}
              onChange={setModel}
            />
          ) : (
            <input
              type="text"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setCustomModel(e.target.value);
              }}
              placeholder="model-id"
            />
          )}
        </label>

        <div className="ai-settings-actions">
          <button type="button" className="ai-settings-cancel" onClick={onClose}>
            取消
          </button>
          <button type="button" className="ai-settings-save" onClick={save}>
            儲存
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
