import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  ChevronDown,
  FilePlus2,
  Network,
  Upload,
} from "lucide-react";
import { useDocumentStore } from "../store/documentStore";
import { createSampleGenogram } from "../data/sampleGenogram";
import {
  exportJson,
  exportPng,
  exportSvg,
  type ExportFormat,
} from "../export/exportDocument";
import { showToast } from "../store/toastStore";
import { SaveStatus } from "./SaveStatus";

const ICON = {
  size: 18,
  strokeWidth: 1.75,
  absoluteStrokeWidth: false,
} as const;

interface MenuPos {
  top: number;
  left: number;
  minWidth: number;
}

export function Toolbar() {
  const newDocument = useDocumentStore((s) => s.newDocument);
  const loadDocumentData = useDocumentStore((s) => s.loadDocumentData);
  const requestFitToContent = useDocumentStore((s) => s.requestFitToContent);
  const importDocumentJson = useDocumentStore((s) => s.importDocumentJson);
  const hasContent = useDocumentStore((s) => s.hasContent);
  const title = useDocumentStore((s) => s.document.title);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const document = useDocumentStore((s) => s.document);

  const [titleDraft, setTitleDraft] = useState(title);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const exportTriggerRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(title);
  }, [title]);

  const updateMenuPosition = () => {
    const btn = exportTriggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 196);
    // Keep menu inside the viewport horizontally
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - menuWidth - 8
    );
    setMenuPos({
      top: rect.bottom + 6,
      left,
      minWidth: menuWidth,
    });
  };

  useLayoutEffect(() => {
    if (!exportOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [exportOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (exportMenuRef.current?.contains(target)) return;
      if (exportTriggerRef.current?.contains(target)) return;
      setExportOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportOpen(false);
        exportTriggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [exportOpen]);

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next) {
      setTitleDraft(title);
      return;
    }
    if (next !== title) setTitle(next);
  };

  const confirmIfDirty = (message: string): boolean => {
    if (!hasContent()) return true;
    return window.confirm(message);
  };

  const handleNew = () => {
    if (
      !confirmIfDirty(
        "建立新文件？（目前內容會清空，可用復原還原）"
      )
    ) {
      return;
    }
    newDocument();
  };

  const handleSample = () => {
    if (
      !confirmIfDirty(
        "載入示範家系圖？（會覆蓋目前畫布，可用復原還原）"
      )
    ) {
      return;
    }
    loadDocumentData(createSampleGenogram());
    requestFitToContent();
    showToast("已載入示範家系圖", { tone: "success", durationMs: 2500 });
  };

  const handleExport = async (format: ExportFormat) => {
    setExportOpen(false);
    if (format !== "json" && document.persons.length === 0) {
      showToast("畫布是空的，請先新增人物再匯出", { tone: "error" });
      return;
    }
    setExporting(true);
    try {
      if (format === "json") {
        exportJson(document);
        showToast("已下載 JSON", { tone: "success", durationMs: 2500 });
      } else if (format === "svg") {
        exportSvg(document);
        showToast("已下載 SVG", { tone: "success", durationMs: 2500 });
      } else {
        await exportPng(document);
        showToast("已下載 PNG", { tone: "success", durationMs: 2500 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "匯出失敗";
      showToast(msg, { tone: "error", durationMs: 5000 });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      if (hasContent()) {
        const ok = window.confirm(
          `匯入「${file.name}」會覆蓋目前畫布（可用復原還原）。繼續？`
        );
        if (!ok) return;
      }
      const result = importDocumentJson(text);
      if (!result.ok) {
        showToast(result.error, { tone: "error" });
      }
    } catch {
      showToast("無法讀取檔案", { tone: "error" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <header className="float-chrome" role="banner">
      {/* Top-left: identity + document title (Spline-style pill) */}
      <div className="float-bar float-bar-tl">
        <span className="brand-mark" aria-hidden="true">
          <Network size={15} strokeWidth={2} />
        </span>
        <div className="float-title-block">
          <label className="sr-only" htmlFor="doc-title">
            文件標題
          </label>
          <input
            id="doc-title"
            className="doc-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setTitleDraft(title);
                e.currentTarget.blur();
              }
            }}
            maxLength={120}
            spellCheck={false}
            title="點擊編輯文件名稱"
            aria-describedby="save-status-live"
          />
          <SaveStatus />
        </div>
      </div>

      {/* Top-right: document actions + export CTA */}
      <div className="float-bar float-bar-tr" role="group" aria-label="文件">
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={handleNew}
          title="新建文件"
          aria-label="新建文件"
        >
          <FilePlus2 {...ICON} />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={handleSample}
          title="載入示範家系圖"
          aria-label="載入示範家系圖"
        >
          <Network {...ICON} />
        </button>
        <button
          type="button"
          className="toolbar-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="從 JSON 匯入"
          aria-label="從 JSON 匯入"
        >
          <Upload {...ICON} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="選擇要匯入的 JSON 檔案"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
          }}
        />
        <div className="float-bar-sep" aria-hidden="true" />
        <div className="export-menu">
          <button
            ref={exportTriggerRef}
            type="button"
            className="export-cta"
            id="export-trigger"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            aria-controls={exportOpen ? "export-menu" : undefined}
            disabled={exporting}
            onClick={() => setExportOpen((o) => !o)}
            title={exporting ? "匯出中…" : "匯出檔案"}
            aria-label={exporting ? "匯出中" : "匯出檔案"}
          >
            <ArrowDownToLine size={15} strokeWidth={2} />
            <span>{exporting ? "匯出中…" : "匯出"}</span>
            <ChevronDown size={14} strokeWidth={2} />
          </button>
          {exportOpen &&
            menuPos &&
            createPortal(
              <div
                ref={exportMenuRef}
                id="export-menu"
                className="export-dropdown"
                role="menu"
                aria-labelledby="export-trigger"
                style={{
                  top: menuPos.top,
                  left: menuPos.left,
                  minWidth: menuPos.minWidth,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport("png")}
                >
                  PNG
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport("svg")}
                >
                  SVG
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExport("json")}
                >
                  JSON
                </button>
              </div>,
              globalThis.document.body
            )}
        </div>
      </div>
    </header>
  );
}
