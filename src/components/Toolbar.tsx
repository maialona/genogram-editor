import { useDocumentStore } from "../store/documentStore";
import { createSampleGenogram } from "../data/sampleGenogram";
import type { RelationshipType } from "../types/document";

const REL_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "marriage", label: "婚姻" },
  { value: "parent", label: "親子" },
  { value: "divorce", label: "離婚" },
  { value: "separation", label: "分居" },
  { value: "cohabitation", label: "同居" },
  { value: "conflict", label: "衝突" },
  { value: "close", label: "親密" },
  { value: "abuse", label: "虐待" },
];

export function Toolbar() {
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const history = useDocumentStore((s) => s.history);
  const deleteSelected = useDocumentStore((s) => s.deleteSelected);
  const copySelected = useDocumentStore((s) => s.copySelected);
  const pasteClipboard = useDocumentStore((s) => s.pasteClipboard);
  const newDocument = useDocumentStore((s) => s.newDocument);
  const loadDocumentData = useDocumentStore((s) => s.loadDocumentData);
  const setInteractionMode = useDocumentStore((s) => s.setInteractionMode);
  const setPendingRelationshipType = useDocumentStore(
    (s) => s.setPendingRelationshipType
  );
  const pendingRelationshipType = useDocumentStore(
    (s) => s.pendingRelationshipType
  );
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const setViewport = useDocumentStore((s) => s.setViewport);
  const viewport = useDocumentStore((s) => s.document.viewport);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const clipboard = useDocumentStore((s) => s.clipboard);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const zoomBy = (factor: number) => {
    const next = Math.min(4, Math.max(0.15, viewport.scale * factor));
    setViewport({ scale: next });
  };

  const resetView = () => {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="brand-mark" aria-hidden>
          ⧉
        </span>
        <h1>Genogram Editor</h1>
        <span className="brand-sub">家庭關係譜圖</span>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={newDocument} title="新建文件">
          新建
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "載入示範家系圖？（會覆蓋目前畫布，可用復原還原）"
              )
            ) {
              loadDocumentData(createSampleGenogram());
            }
          }}
          title="載入附圖風格的示範家系圖"
        >
          載入範例
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={undo} disabled={!canUndo} title="復原 (Ctrl+Z)">
          復原
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="重做 (Ctrl+Y)">
          重做
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={copySelected} disabled={selectedIds.length === 0} title="複製 (Ctrl+C)">
          複製
        </button>
        <button
          type="button"
          onClick={pasteClipboard}
          disabled={!clipboard || clipboard.persons.length === 0}
          title="貼上 (Ctrl+V)"
        >
          貼上
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selectedIds.length === 0}
          title="刪除 (Delete)"
        >
          刪除
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className={interactionMode === "select" ? "active" : ""}
          onClick={() => setInteractionMode("select")}
          title="選取工具"
        >
          選取
        </button>
        <button
          type="button"
          className={interactionMode === "pan" ? "active" : ""}
          onClick={() => setInteractionMode("pan")}
          title="平移畫布"
        >
          平移
        </button>
        <button
          type="button"
          className={interactionMode === "connect" ? "active" : ""}
          onClick={() => setPendingRelationshipType(pendingRelationshipType)}
          title="拉線：從人物拖到另一人物"
        >
          拉線
        </button>
        <select
          className="toolbar-select"
          value={pendingRelationshipType}
          onChange={(e) =>
            setPendingRelationshipType(e.target.value as RelationshipType)
          }
          title="目前拉線的關係類型"
        >
          {REL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={() => zoomBy(1 / 1.15)} title="縮小">
          −
        </button>
        <button type="button" onClick={resetView} title="重設檢視" className="zoom-display">
          {Math.round(viewport.scale * 100)}%
        </button>
        <button type="button" onClick={() => zoomBy(1.15)} title="放大">
          +
        </button>
      </div>
    </header>
  );
}
