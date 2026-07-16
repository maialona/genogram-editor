import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ChevronDown, Mic, Sparkles, X } from "lucide-react";

type ModelId = "gpt-4o" | "gpt-4o-mini" | "claude-sonnet";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MODELS: { id: ModelId; label: string }[] = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "claude-sonnet", label: "Claude Sonnet" },
];

const ICON = {
  size: 16,
  strokeWidth: 1.75,
} as const;

const MOCK_REPLIES = [
  "這是 AI 回覆的示意。之後可在此協助分析家系圖結構、建議符號，或從文字描述生成人物與關係。",
  "（Mock）我可以幫你：新增人物、標示指標個案、整理跨代關係，或解釋常見家系圖符號。",
  "（Mock）請描述你想調整的家族成員或關係，未來接上 API 後會直接操作畫布。",
];

export function AiChatbox() {
  const [model, setModel] = useState<ModelId>("gpt-4o");
  const [modelOpen, setModelOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);

  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    bottom: number;
    left: number;
  } | null>(null);

  const modelLabel =
    MODELS.find((m) => m.id === model)?.label ?? "GPT-4o";
  const canSend = input.trim().length > 0 && !mockBusy;

  useEffect(() => {
    if (!modelOpen) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const btn = modelBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [modelOpen]);

  useEffect(() => {
    if (!modelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (modelMenuRef.current?.contains(target)) return;
      if (modelBtnRef.current?.contains(target)) return;
      setModelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModelOpen(false);
        modelBtnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [modelOpen]);

  useEffect(() => {
    if (!panelOpen || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, panelOpen, mockBusy]);

  const send = () => {
    const text = input.trim();
    if (!text || mockBusy) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPanelOpen(true);
    setMockBusy(true);

    window.setTimeout(() => {
      const reply =
        MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
        },
      ]);
      setMockBusy(false);
    }, 700);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setPanelOpen(false);
    setMockBusy(false);
  };

  return (
    <div className="ai-chatbox-dock" aria-label="AI 對話（示意）">
      {panelOpen && messages.length > 0 && (
        <div className="ai-chat-panel" role="log" aria-live="polite">
          <div className="ai-chat-panel-head">
            <div className="ai-chat-panel-title">
              <Sparkles size={14} strokeWidth={1.75} aria-hidden />
              <span>AI 助手</span>
              <span className="ai-chat-badge">Mock</span>
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
            {mockBusy && (
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
          AI 訊息
        </label>
        <textarea
          id="ai-chat-input"
          ref={inputRef}
          className="ai-chatbox-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="AskChatGPT"
          disabled={mockBusy}
        />

        <div className="ai-chatbox-footer">
          <div className="ai-chatbox-footer-left">
            <button
              type="button"
              ref={modelBtnRef}
              className="ai-model-trigger"
              aria-haspopup="listbox"
              aria-expanded={modelOpen}
              onClick={() => setModelOpen((o) => !o)}
            >
              <span>{modelLabel}</span>
              <ChevronDown size={14} strokeWidth={2} aria-hidden />
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
              title="送出"
              aria-label="送出"
              disabled={!canSend}
              onClick={send}
            >
              <ArrowUp size={18} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>

      {modelOpen &&
        menuPos &&
        createPortal(
          <div
            ref={modelMenuRef}
            className="ai-model-menu"
            role="listbox"
            aria-label="選擇模型"
            style={{ bottom: menuPos.bottom, left: menuPos.left }}
          >
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={m.id === model}
                className={m.id === model ? "active" : undefined}
                onClick={() => {
                  setModel(m.id);
                  setModelOpen(false);
                }}
              >
                {m.label}
              </button>
            ))}
            <div className="ai-model-menu-note">示意選單 · 尚未接上 API</div>
          </div>,
          document.body
        )}
    </div>
  );
}
