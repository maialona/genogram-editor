import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Hand,
  Minus,
  MousePointer2,
  Plus,
  Waypoints,
} from "lucide-react";
import { useDocumentStore } from "../store/documentStore";
import type { RelationshipType } from "../types/document";
import { ALL_REL_OPTIONS } from "../types/relationshipCatalog";

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;

const ICON = {
  size: 18,
  strokeWidth: 1.75,
} as const;

export function CanvasToolbar() {
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const setInteractionMode = useDocumentStore((s) => s.setInteractionMode);
  const pendingRelationshipType = useDocumentStore(
    (s) => s.pendingRelationshipType
  );
  const setPendingRelationshipType = useDocumentStore(
    (s) => s.setPendingRelationshipType
  );
  const viewport = useDocumentStore((s) => s.document.viewport);
  const setViewport = useDocumentStore((s) => s.setViewport);

  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomBtnRef = useRef<HTMLButtonElement>(null);
  const zoomMenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const zoomPct = Math.round(viewport.scale * 100);

  const setScale = (scale: number) => {
    setViewport({ scale: Math.min(4, Math.max(0.15, scale)) });
  };

  const zoomBy = (factor: number) => {
    setScale(viewport.scale * factor);
  };

  const resetView = () => {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  useEffect(() => {
    if (!zoomOpen) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const btn = zoomBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuW = 148;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - menuW / 2),
        window.innerWidth - menuW - 8
      );
      setMenuPos({
        top: rect.bottom + 8,
        left,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [zoomOpen]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (zoomMenuRef.current?.contains(t)) return;
      if (zoomBtnRef.current?.contains(t)) return;
      setZoomOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomOpen(false);
        zoomBtnRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomOpen]);

  return (
    <div
      className="canvas-toolbar-dock float-bar-tc"
      role="toolbar"
      aria-label="畫布工具"
    >
      <div className="canvas-toolbar">
        <div className="canvas-toolbar-cluster" role="group" aria-label="工具">
          <button
            type="button"
            className={
              interactionMode === "select"
                ? "canvas-tool active"
                : "canvas-tool"
            }
            aria-pressed={interactionMode === "select"}
            title="選取 (V)"
            aria-label="選取工具"
            onClick={() => setInteractionMode("select")}
          >
            <MousePointer2 {...ICON} />
          </button>
          <button
            type="button"
            className={
              interactionMode === "pan" ? "canvas-tool active" : "canvas-tool"
            }
            aria-pressed={interactionMode === "pan"}
            title="平移 (H / 空白鍵)"
            aria-label="平移工具"
            onClick={() => setInteractionMode("pan")}
          >
            <Hand {...ICON} />
          </button>
          <button
            type="button"
            className={
              interactionMode === "connect"
                ? "canvas-tool active"
                : "canvas-tool"
            }
            aria-pressed={interactionMode === "connect"}
            title="拉線：從人物拖到另一人物"
            aria-label="拉線工具"
            onClick={() => setPendingRelationshipType(pendingRelationshipType)}
          >
            <Waypoints {...ICON} />
          </button>
        </div>

        <div className="canvas-toolbar-divider" aria-hidden="true" />

        <div className="canvas-toolbar-cluster" role="group" aria-label="縮放">
          <button
            type="button"
            className="canvas-tool canvas-tool-sm"
            title="縮小"
            aria-label="縮小"
            onClick={() => zoomBy(1 / 1.15)}
          >
            <Minus size={16} strokeWidth={1.75} />
          </button>
          <button
            ref={zoomBtnRef}
            type="button"
            className="canvas-zoom-trigger"
            aria-haspopup="menu"
            aria-expanded={zoomOpen}
            aria-controls={zoomOpen ? "canvas-zoom-menu" : undefined}
            title="縮放選項"
            onClick={() => setZoomOpen((o) => !o)}
          >
            <span className="canvas-zoom-pct">{zoomPct}%</span>
            <ChevronDown size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="canvas-tool canvas-tool-sm"
            title="放大"
            aria-label="放大"
            onClick={() => zoomBy(1.15)}
          >
            <Plus size={16} strokeWidth={1.75} />
          </button>
        </div>

        {interactionMode === "connect" && (
          <>
            <div className="canvas-toolbar-divider" aria-hidden="true" />
            <label className="sr-only" htmlFor="canvas-rel-type">
              關係類型
            </label>
            <select
              id="canvas-rel-type"
              className="canvas-toolbar-select"
              value={pendingRelationshipType}
              onChange={(e) =>
                setPendingRelationshipType(e.target.value as RelationshipType)
              }
              title="目前拉線的關係類型"
            >
              {ALL_REL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {zoomOpen &&
        menuPos &&
        createPortal(
          <div
            ref={zoomMenuRef}
            id="canvas-zoom-menu"
            className="canvas-zoom-menu"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {ZOOM_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitem"
                className={
                  Math.abs(viewport.scale - s) < 0.01
                    ? "canvas-zoom-item active"
                    : "canvas-zoom-item"
                }
                onClick={() => {
                  setScale(s);
                  setZoomOpen(false);
                }}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
            <div className="canvas-zoom-sep" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="canvas-zoom-item"
              onClick={() => {
                resetView();
                setZoomOpen(false);
              }}
            >
              重設檢視
            </button>
          </div>,
          globalThis.document.body
        )}
    </div>
  );
}
