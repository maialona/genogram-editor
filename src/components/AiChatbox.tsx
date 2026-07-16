import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Mic,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { generateGenogramDraft } from "../ai/client";
import { layoutGenogram } from "../ai/layoutGenogram";
import { getAiSettingsSnapshot, useAiSettingsStore } from "../ai/settingsStore";
import { AiClientError } from "../ai/types";
import { useDocumentStore } from "../store/documentStore";
import { showToast } from "../store/toastStore";
import { AiSettingsModal } from "./AiSettingsModal";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ICON = {
  size: 16,
  strokeWidth: 1.75,
} as const;

export function AiChatbox() {
  const model = useAiSettingsStore((s) => s.model);
  const apiKey = useAiSettingsStore((s) => s.apiKey);
  const keyReady = apiKey.trim().length > 0;
  const loadDocumentData = useDocumentStore((s) => s.loadDocumentData);
  const requestFitToContent = useDocumentStore((s) => s.requestFitToContent);
  const hasContent = useDocumentStore((s) => s.hasContent);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSend = input.trim().length > 0 && !busy;

  useEffect(() => {
    if (!panelOpen || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, panelOpen, busy]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const appendMessage = (role: ChatMessage["role"], content: string) => {
    const msg: ChatMessage = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
    };
    setMessages((prev) => [...prev, msg]);
    setPanelOpen(true);
    return msg;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

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

    setInput("");
    appendMessage("user", text);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const settings = getAiSettingsSnapshot();
      const { draft, warnings } = await generateGenogramDraft(
        text,
        settings,
        controller.signal
      );
      const doc = layoutGenogram(draft);
      loadDocumentData(doc);
      // Fit after layout paints / canvas size known
      requestAnimationFrame(() => {
        requestFitToContent();
      });

      const n = doc.persons.length;
      const m = doc.relationships.length;
      const summary =
        draft.summary?.trim() ||
        `已根據描述產生家系圖：${n} 人、${m} 條關係。`;
      const warnText =
        warnings.length > 0
          ? `\n\n注意：${warnings.slice(0, 4).join("；")}`
          : "";
      appendMessage(
        "assistant",
        `${summary}${warnText}\n\n可在畫布上繼續編輯；Ctrl+Z 可還原上一版。`
      );
      showToast(`已產生 ${n} 人 · ${m} 條關係`, {
        tone: "success",
        durationMs: 3200,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message =
        err instanceof AiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "產生家系圖時發生未知錯誤";
      appendMessage("assistant", `無法產生家系圖：${message}`);
      showToast(message, { tone: "error", durationMs: 5000 });
      if (err instanceof AiClientError && err.code === "no_key") {
        setSettingsOpen(true);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setPanelOpen(false);
    setBusy(false);
  };

  return (
    <div className="ai-chatbox-dock" aria-label="AI 家系圖產生">
      {panelOpen && messages.length > 0 && (
        <div className="ai-chat-panel" role="log" aria-live="polite">
          <div className="ai-chat-panel-head">
            <div className="ai-chat-panel-title">
              <Sparkles size={14} strokeWidth={1.75} aria-hidden />
              <span>AI 助手</span>
            </div>
            <button
              type="button"
              className="ai-chat-icon-btn"
              onClick={clearChat}
              title="關閉對話"
              aria-label="關閉對話"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
          <div className="ai-chat-messages" ref={listRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`ai-chat-bubble ai-chat-bubble-${m.role}`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="ai-chat-bubble ai-chat-bubble-assistant ai-chat-typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ai-chatbox">
        <label className="sr-only" htmlFor="ai-chat-input">
          描述個案家庭關係
        </label>
        <textarea
          id="ai-chat-input"
          ref={inputRef}
          className="ai-chatbox-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="描述個案家庭關係，AI 將產生家系圖…"
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
            >
              <Settings size={14} strokeWidth={2} aria-hidden />
              <span className="ai-model-label">{model || "設定模型"}</span>
              {!keyReady && (
                <span className="ai-key-dot" title="尚未設定 API Key" />
              )}
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
              className={`ai-send-btn${canSend ? " ready" : ""}`}
              title="產生家系圖"
              aria-label="產生家系圖"
              disabled={!canSend}
              onClick={() => void send()}
            >
              <ArrowUp size={18} strokeWidth={2.25} />
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
