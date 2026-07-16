import { useEffect, useState } from "react";
import { useDocumentStore } from "../store/documentStore";

function formatRelative(savedAt: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (sec < 8) return "剛剛";
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  return new Date(savedAt).toLocaleString("zh-Hant", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaveStatus() {
  const saveStatus = useDocumentStore((s) => s.saveStatus);
  const lastSavedAt = useDocumentStore((s) => s.lastSavedAt);
  const persist = useDocumentStore((s) => s.persist);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  if (saveStatus === "saving") {
    return (
      <span
        id="save-status-live"
        className="save-status saving"
        title="正在寫入本機"
        role="status"
        aria-live="polite"
      >
        <span className="save-dot" aria-hidden="true" />
        儲存中…
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <button
        type="button"
        id="save-status-live"
        className="save-status error"
        title="點擊重試"
        onClick={() => persist()}
        aria-live="assertive"
      >
        <span className="save-dot" aria-hidden="true" />
        儲存失敗 · 重試
      </button>
    );
  }

  if (saveStatus === "saved" && lastSavedAt) {
    return (
      <span
        id="save-status-live"
        className="save-status saved"
        title={new Date(lastSavedAt).toLocaleString("zh-Hant")}
        role="status"
        aria-live="polite"
      >
        <span className="save-dot" aria-hidden="true" />
        已儲存 · {formatRelative(lastSavedAt, now)}
      </span>
    );
  }

  return (
    <span
      id="save-status-live"
      className="save-status idle"
      title="尚未寫入本機"
      role="status"
    >
      <span className="save-dot" aria-hidden="true" />
      本機草稿
    </span>
  );
}
