import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Settings, Sparkles, Square, X } from "lucide-react";
import { runAiGeneration } from "../ai/runAiGeneration";
import { getAiSettingsSnapshot, useAiSettingsStore } from "../ai/settingsStore";
import { AiClientError } from "../ai/types";
import {
  type AiGenerationPhase,
  useAiGenerationStore,
} from "../store/aiGenerationStore";
import { useDocumentStore } from "../store/documentStore";
import { showToast } from "../store/toastStore";
import { getAiChatboxClassName } from "./aiChatboxClassName";
import { AiSettingsModal } from "./AiSettingsModal";

const ICON = {
  size: 16,
  strokeWidth: 1.75,
} as const;

const PHASE_LABELS: Partial<Record<AiGenerationPhase, string>> = {
  analyzing: "理解描述",
  structuring: "整理人物",
  linking: "建立關係",
  revealing: "生成家系圖",
};

export function AiGenerationStatus({
  phase,
  error,
  onDismissError,
}: {
  phase: AiGenerationPhase;
  error: string | null;
  onDismissError: () => void;
}) {
  const busy =
    phase === "analyzing" ||
    phase === "structuring" ||
    phase === "linking" ||
    phase === "revealing";

  if (busy) {
    return (
      <div className="ai-generation-chip" role="status" aria-live="polite">
        <Sparkles size={13} strokeWidth={1.8} aria-hidden />
        <span>{PHASE_LABELS[phase]}</span>
        <span className="ai-generation-pulse" aria-hidden />
      </div>
    );
  }

  if (phase === "error" && error) {
    return (
      <div className="ai-generation-chip is-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onDismissError} aria-label="關閉錯誤訊息">
          <X size={13} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return null;
}

function createRunId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AiChatbox() {
  const model = useAiSettingsStore((s) => s.model);
  const apiKey = useAiSettingsStore((s) => s.apiKey);
  const keyReady = apiKey.trim().length > 0;
  const loadDocumentData = useDocumentStore((s) => s.loadDocumentData);
  const requestFitToContent = useDocumentStore((s) => s.requestFitToContent);
  const hasContent = useDocumentStore((s) => s.hasContent);

  const phase = useAiGenerationStore((s) => s.phase);
  const error = useAiGenerationStore((s) => s.error);
  const begin = useAiGenerationStore((s) => s.begin);
  const setPhase = useAiGenerationStore((s) => s.setPhase);
  const setPreview = useAiGenerationStore((s) => s.setPreview);
  const fail = useAiGenerationStore((s) => s.fail);
  const cancel = useAiGenerationStore((s) => s.cancel);
  const complete = useAiGenerationStore((s) => s.complete);
  const clearError = useAiGenerationStore((s) => s.clearError);

  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const submittedTextRef = useRef("");

  const busy =
    phase === "analyzing" ||
    phase === "structuring" ||
    phase === "linking" ||
    phase === "revealing";
  const canSend = input.trim().length > 0 && !busy;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      const runId = useAiGenerationStore.getState().runId;
      if (runId) useAiGenerationStore.getState().cancel(runId);
    };
  }, []);

  const cancelGeneration = () => {
    const runId = useAiGenerationStore.getState().runId;
    abortRef.current?.abort();
    abortRef.current = null;
    setInput(submittedTextRef.current);
    cancel(runId ?? undefined);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (phase === "error") clearError();

    if (!keyReady) {
      setSettingsOpen(true);
      showToast("請先設定 API Key", { tone: "info" });
      return;
    }

    if (hasContent()) {
      const ok = window.confirm(
        "將以 AI 產生的家系圖取代目前畫布內容（可按 Ctrl+Z 復原）。確定繼續？"
      );
      if (!ok) return;
    }

    const runId = createRunId();
    const controller = new AbortController();
    abortRef.current = controller;
    submittedTextRef.current = text;
    setInput("");
    begin(runId);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      await runAiGeneration({
        description: text,
        settings: getAiSettingsSnapshot(),
        signal: controller.signal,
        timings: reduceMotion ? { revealMs: 0 } : undefined,
        onPhase: (nextPhase) => setPhase(runId, nextPhase),
        onPreview: (previewDocument) => setPreview(runId, previewDocument),
        onCommit: (nextDocument, result) => {
          if (useAiGenerationStore.getState().runId !== runId) return;
          loadDocumentData(nextDocument);
          complete(runId);
          requestAnimationFrame(() => requestFitToContent());

          const n = nextDocument.persons.length;
          const m = nextDocument.relationships.length;
          showToast(`已產生 ${n} 人 · ${m} 條關係`, {
            tone: "success",
            durationMs: 3200,
          });
          if (result.warnings.length > 0) {
            const shown = result.warnings.slice(0, 2).join("；");
            const more = Math.max(0, result.warnings.length - 2);
            showToast(`注意：${shown}${more > 0 ? `；另有 ${more} 項` : ""}`, {
              tone: "info",
              durationMs: 7000,
            });
          }
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (useAiGenerationStore.getState().runId !== runId) return;

      const message =
        err instanceof AiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "產生家系圖時發生未知錯誤";
      setInput(submittedTextRef.current);
      fail(runId, message);
      if (
        err instanceof AiClientError &&
        (err.code === "no_key" || err.code === "invalid_key")
      ) {
        setSettingsOpen(true);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const onInputChange = (value: string) => {
    if (phase === "error") clearError();
    setInput(value);
  };

  return (
    <div className="ai-chatbox-dock" aria-label="AI 家系圖產生">
      <AiGenerationStatus
        phase={phase}
        error={error}
        onDismissError={clearError}
      />

      <div className={getAiChatboxClassName(busy)}>
        <label className="sr-only" htmlFor="ai-chat-input">
          描述個案家庭關係
        </label>
        <textarea
          id="ai-chat-input"
          ref={inputRef}
          className="ai-chatbox-input"
          rows={1}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={busy ? "AI 正在建立家系圖…" : "描述個案家庭關係，AI 將產生家系圖…"}
          disabled={busy}
        />

        <div className="ai-chatbox-footer">
          <div className="ai-chatbox-footer-left">
            <button
              type="button"
              className="ai-model-trigger"
              onClick={() => setSettingsOpen(true)}
              title="AI 設定"
              aria-label="開啟 AI 設定"
              disabled={busy}
            >
              <Settings size={14} strokeWidth={2} aria-hidden />
              <span className="ai-model-label">{model || "設定模型"}</span>
              {!keyReady && <span className="ai-key-dot" title="尚未設定 API Key" />}
            </button>
          </div>

          <div className="ai-chatbox-footer-right">
            <button
              type="button"
              className="ai-chat-icon-btn"
              title="語音輸入（即將推出）"
              aria-label="語音輸入（即將推出）"
              disabled
            >
              <Mic size={ICON.size} strokeWidth={ICON.strokeWidth} />
            </button>
            <button
              type="button"
              className={`ai-send-btn${busy ? " cancel" : canSend ? " ready" : ""}`}
              title={busy ? "停止產生" : "產生家系圖"}
              aria-label={busy ? "停止產生" : "產生家系圖"}
              disabled={!busy && !canSend}
              onClick={busy ? cancelGeneration : () => void send()}
            >
              {busy ? (
                <Square size={13} fill="currentColor" strokeWidth={1.5} />
              ) : (
                <ArrowUp size={18} strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>
      </div>

      <AiSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
