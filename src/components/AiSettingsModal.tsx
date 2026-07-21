import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  PROVIDER_PRESETS,
  useAiSettingsStore,
} from "../ai/settingsStore";
import type { AiProviderId } from "../ai/types";

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

  useEffect(() => {
    if (!open) return;
    setApiKey(stored.apiKey);
    setProvider(stored.provider);
    setBaseUrl(stored.baseUrl);
    setModel(stored.model);
    setUseProxy(stored.useProxy);
  }, [open, stored.apiKey, stored.provider, stored.baseUrl, stored.model, stored.useProxy]);

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
    setProvider(next);
    if (next !== "custom") {
      const p = PROVIDER_PRESETS[next];
      setBaseUrl(p.baseUrl);
      setModel(p.defaultModel);
    }
  };

  const save = () => {
    stored.saveAll({
      apiKey: apiKey.trim(),
      provider,
      baseUrl: baseUrl.trim().replace(/\/$/, ""),
      model: model.trim(),
      useProxy,
    });
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
          API Key 只存在本機瀏覽器（localStorage），不會上傳到本專案伺服器。
          開啟代理時：本機走 Vite、Vercel 走 serverless，再轉發到供應商（避免 CORS）。
        </p>

        <label className="ai-settings-field">
          <span>API Key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="貼上你的 API Key"
          />
        </label>

        <label className="ai-settings-field">
          <span>供應商</span>
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as AiProviderId)}
          >
            <option value="xai">{PROVIDER_PRESETS.xai.label}</option>
            <option value="openai">{PROVIDER_PRESETS.openai.label}</option>
            <option value="deepseek">{PROVIDER_PRESETS.deepseek.label}</option>
            <option value="custom">Custom（OpenAI 相容）</option>
          </select>
        </label>

        <label className="ai-settings-field">
          <span>Base URL</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setProvider("custom");
            }}
            placeholder="https://api.x.ai/v1"
          />
        </label>

        <label className="ai-settings-field">
          <span>模型</span>
          {presetModels.length > 0 ? (
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {!presetModels.includes(model) && (
                <option value={model}>{model}</option>
              )}
              {presetModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="model-id"
            />
          )}
        </label>

        <label className="ai-settings-check">
          <input
            type="checkbox"
            checked={useProxy}
            onChange={(e) => setUseProxy(e.target.checked)}
          />
          <span>
            使用代理（建議，避免 CORS；本機 <code>npm run dev</code> / Vercel
            serverless）
          </span>
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
