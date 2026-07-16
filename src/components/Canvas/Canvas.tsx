import { useCallback, useEffect, useRef, useState } from "react";
import type { Gender } from "../../types/document";
import { RELATIONSHIP_LABELS } from "../../types/relationshipCatalog";
import { useDocumentStore } from "../../store/documentStore";
import { createSampleGenogram } from "../../data/sampleGenogram";
import { showToast } from "../../store/toastStore";
import { SvgRenderer } from "../../renderers/SvgRenderer";
import { Grid } from "../../renderers/Grid";
import { PERSON_HALF } from "../../renderers/constants";

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
const ZOOM_SENSITIVITY = 0.0015;

const REL_LABELS = RELATIONSHIP_LABELS;

type DragKind =
  | { type: "none" }
  | {
      type: "pan";
      startX: number;
      startY: number;
      originOffsetX: number;
      originOffsetY: number;
    }
  | {
      type: "move";
      startWorldX: number;
      startWorldY: number;
      lastWorldX: number;
      lastWorldY: number;
      personIds: string[];
      pushedHistory: boolean;
    }
  | {
      type: "marquee";
      startScreenX: number;
      startScreenY: number;
      currentScreenX: number;
      currentScreenY: number;
      additive: boolean;
    }
  | {
      type: "connect-drag";
      fromId: string;
      worldX: number;
      worldY: number;
      hoverPersonId: string | null;
    };

function screenToWorld(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}

function hitTestPerson(
  worldX: number,
  worldY: number,
  persons: { id: string; x: number; y: number }[],
  excludeId?: string
): string | null {
  const r = PERSON_HALF + 10;
  let best: string | null = null;
  let bestDist = r;
  for (const p of persons) {
    if (excludeId && p.id === excludeId) continue;
    const d = Math.hypot(p.x - worldX, p.y - worldY);
    if (d <= bestDist) {
      bestDist = d;
      best = p.id;
    }
  }
  return best;
}

function isDeleteKeyEvent(e: { key: string; code: string }): boolean {
  return (
    e.code === "Delete" ||
    e.code === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Backspace" ||
    e.key === "Del"
  );
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [drag, setDrag] = useState<DragKind>({ type: "none" });
  /** Cursor in world space for rubber-band preview (click-click mode). */
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(
    null
  );

  /** Sync ref so pointerup never misreads stale drag state. */
  const dragRef = useRef<DragKind>({ type: "none" });
  const setDragSafe = useCallback((next: DragKind) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const document = useDocumentStore((s) => s.document);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const connectFromId = useDocumentStore((s) => s.connectFromId);
  const pendingRelationshipType = useDocumentStore((s) => s.pendingRelationshipType);

  const setViewport = useDocumentStore((s) => s.setViewport);
  const setCanvasSize = useDocumentStore((s) => s.setCanvasSize);
  const select = useDocumentStore((s) => s.select);
  const clearSelection = useDocumentStore((s) => s.clearSelection);
  const deleteSelected = useDocumentStore((s) => s.deleteSelected);
  const addPerson = useDocumentStore((s) => s.addPerson);
  const movePersons = useDocumentStore((s) => s.movePersons);
  const pushHistory = useDocumentStore((s) => s.pushHistory);
  const persist = useDocumentStore((s) => s.persist);
  const addRelationship = useDocumentStore((s) => s.addRelationship);
  const setConnectFromId = useDocumentStore((s) => s.setConnectFromId);
  const setInteractionMode = useDocumentStore((s) => s.setInteractionMode);
  const loadDocumentData = useDocumentStore((s) => s.loadDocumentData);
  const requestFitToContent = useDocumentStore((s) => s.requestFitToContent);

  const { viewport } = document;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
      setCanvasSize(width, height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setCanvasSize]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const getLocalPoint = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  /**
   * Return keyboard focus to the canvas after selecting / interacting.
   * Person pointerdown uses preventDefault, which otherwise leaves focus
   * stuck in PropertyPanel inputs — Delete/Backspace then edit text instead
   * of deleting the selected object.
   */
  const focusCanvas = useCallback(() => {
    // Note: store field is also named `document` — use window.document for DOM
    const active = window.document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== containerRef.current &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable)
    ) {
      active.blur();
    }
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const local = getLocalPoint(clientX, clientY);
      return screenToWorld(
        local.x,
        local.y,
        viewport.offsetX,
        viewport.offsetY,
        viewport.scale
      );
    },
    [getLocalPoint, viewport]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const local = getLocalPoint(e.clientX, e.clientY);
      const { scale, offsetX, offsetY } = viewport;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, scale * (1 + delta))
      );
      const ratio = nextScale / scale;
      const nextOffsetX = local.x - (local.x - offsetX) * ratio;
      const nextOffsetY = local.y - (local.y - offsetY) * ratio;
      setViewport({
        scale: nextScale,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      });
    },
    [getLocalPoint, setViewport, viewport]
  );

  const beginConnectFrom = useCallback(
    (personId: string, worldX: number, worldY: number) => {
      setConnectFromId(personId);
      select([personId]);
      setDragSafe({
        type: "connect-drag",
        fromId: personId,
        worldX,
        worldY,
        hoverPersonId: null,
      });
    },
    [setConnectFromId, select, setDragSafe]
  );

  const completeConnect = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      addRelationship(fromId, toId, pendingRelationshipType);
      setCursorWorld(null);
    },
    [addRelationship, pendingRelationshipType]
  );

  const onPersonPointerDown = useCallback(
    (e: React.PointerEvent, personId: string) => {
      e.stopPropagation();
      e.preventDefault();
      focusCanvas();

      const world = toWorld(e.clientX, e.clientY);

      // Connect mode: drag from A → drop on B (or click A then click B)
      if (interactionMode === "connect") {
        if (
          connectFromId &&
          connectFromId !== personId &&
          dragRef.current.type !== "connect-drag"
        ) {
          completeConnect(connectFromId, personId);
          return;
        }
        beginConnectFrom(personId, world.x, world.y);
        try {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }

      // Alt / Option + drag = quick connect with current relationship type
      if (e.altKey) {
        useDocumentStore.getState().setInteractionMode("connect");
        beginConnectFrom(personId, world.x, world.y);
        try {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }

      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const liveIds = useDocumentStore.getState().selectedIds;
      const already = liveIds.includes(personId);
      let nextSelection = liveIds;
      if (additive) {
        select([personId], true);
        nextSelection = already
          ? liveIds.filter((id) => id !== personId)
          : [...liveIds, personId];
      } else if (!already) {
        select([personId]);
        nextSelection = [personId];
      }
      // If already selected (and not additive), keep current selection
      // so multi-select group drag still works.

      const personIds = nextSelection.filter((id) =>
        document.persons.some((p) => p.id === id)
      );
      if (personIds.length === 0) personIds.push(personId);

      setDragSafe({
        type: "move",
        startWorldX: world.x,
        startWorldY: world.y,
        lastWorldX: world.x,
        lastWorldY: world.y,
        personIds,
        pushedHistory: false,
      });
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [
      interactionMode,
      connectFromId,
      completeConnect,
      beginConnectFrom,
      toWorld,
      select,
      document.persons,
      focusCanvas,
      setDragSafe,
    ]
  );

  const onRelationshipPointerDown = useCallback(
    (e: React.PointerEvent, relationshipId: string) => {
      e.stopPropagation();
      e.preventDefault();
      focusCanvas();
      if (interactionMode === "connect") return;
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      select([relationshipId], additive);
    },
    [select, interactionMode, focusCanvas]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      focusCanvas();

      if (
        e.button === 1 ||
        spaceDown ||
        interactionMode === "pan" ||
        e.button === 2
      ) {
        e.preventDefault();
        setDragSafe({
          type: "pan",
          startX: e.clientX,
          startY: e.clientY,
          originOffsetX: viewport.offsetX,
          originOffsetY: viewport.offsetY,
        });
        return;
      }

      if (e.button !== 0) return;

      // In connect mode, empty click cancels the first endpoint
      if (interactionMode === "connect" && connectFromId) {
        setConnectFromId(null);
        setCursorWorld(null);
        setDragSafe({ type: "none" });
        return;
      }

      const local = getLocalPoint(e.clientX, e.clientY);
      setDragSafe({
        type: "marquee",
        startScreenX: local.x,
        startScreenY: local.y,
        currentScreenX: local.x,
        currentScreenY: local.y,
        additive: e.shiftKey || e.metaKey || e.ctrlKey,
      });
    },
    [
      spaceDown,
      interactionMode,
      connectFromId,
      setConnectFromId,
      viewport,
      getLocalPoint,
      focusCanvas,
      setDragSafe,
    ]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const world = toWorld(e.clientX, e.clientY);
      const current = dragRef.current;

      if (
        interactionMode === "connect" &&
        connectFromId &&
        current.type !== "connect-drag"
      ) {
        setCursorWorld(world);
      }

      if (current.type === "none") return;

      if (current.type === "pan") {
        const dx = e.clientX - current.startX;
        const dy = e.clientY - current.startY;
        setViewport({
          offsetX: current.originOffsetX + dx,
          offsetY: current.originOffsetY + dy,
        });
        return;
      }

      if (current.type === "connect-drag") {
        const hover = hitTestPerson(
          world.x,
          world.y,
          document.persons,
          current.fromId
        );
        setDragSafe({
          ...current,
          worldX: world.x,
          worldY: world.y,
          hoverPersonId: hover,
        });
        setCursorWorld(world);
        return;
      }

      if (current.type === "move") {
        const dx = world.x - current.lastWorldX;
        const dy = world.y - current.lastWorldY;
        if (dx !== 0 || dy !== 0) {
          if (!current.pushedHistory) {
            pushHistory();
            setDragSafe({
              ...current,
              pushedHistory: true,
              lastWorldX: world.x,
              lastWorldY: world.y,
            });
          } else {
            setDragSafe({
              ...current,
              lastWorldX: world.x,
              lastWorldY: world.y,
            });
          }
          movePersons(current.personIds, dx, dy);
        }
        return;
      }

      if (current.type === "marquee") {
        const local = getLocalPoint(e.clientX, e.clientY);
        setDragSafe({
          ...current,
          currentScreenX: local.x,
          currentScreenY: local.y,
        });
      }
    },
    [
      toWorld,
      interactionMode,
      connectFromId,
      setViewport,
      document.persons,
      pushHistory,
      movePersons,
      getLocalPoint,
      setDragSafe,
    ]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const current = dragRef.current;

      if (current.type === "connect-drag") {
        const world = toWorld(e.clientX, e.clientY);
        const target =
          current.hoverPersonId ??
          hitTestPerson(world.x, world.y, document.persons, current.fromId);

        if (target) {
          completeConnect(current.fromId, target);
        } else {
          setConnectFromId(current.fromId);
          setCursorWorld(world);
        }
        setDragSafe({ type: "none" });
        return;
      }

      if (current.type === "move") {
        if (current.pushedHistory) persist();
        setDragSafe({ type: "none" });
        return;
      }

      if (current.type === "pan") {
        setDragSafe({ type: "none" });
        return;
      }

      if (current.type === "marquee") {
        const x1 = Math.min(current.startScreenX, current.currentScreenX);
        const y1 = Math.min(current.startScreenY, current.currentScreenY);
        const x2 = Math.max(current.startScreenX, current.currentScreenX);
        const y2 = Math.max(current.startScreenY, current.currentScreenY);
        const w = x2 - x1;
        const h = y2 - y1;

        if (w < 4 && h < 4) {
          if (interactionMode !== "connect") {
            clearSelection();
          }
        } else {
          const hits: string[] = [];
          for (const p of document.persons) {
            const sx = p.x * viewport.scale + viewport.offsetX;
            const sy = p.y * viewport.scale + viewport.offsetY;
            if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
              hits.push(p.id);
            }
          }
          if (current.additive) {
            select(hits, true);
          } else {
            select(hits);
          }
        }
        setDragSafe({ type: "none" });
        return;
      }

      setDragSafe({ type: "none" });
    },
    [
      toWorld,
      document.persons,
      completeConnect,
      setConnectFromId,
      persist,
      interactionMode,
      clearSelection,
      viewport,
      select,
      setDragSafe,
    ]
  );

  const onCanvasKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.nativeEvent.isComposing) return;
      if (!isDeleteKeyEvent(e)) return;
      if (useDocumentStore.getState().selectedIds.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      deleteSelected();
    },
    [deleteSelected]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/genogram-symbol");
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as { kind: string; gender?: Gender };
        if (data.kind === "person" && data.gender) {
          const world = toWorld(e.clientX, e.clientY);
          addPerson(data.gender, world.x, world.y);
        }
      } catch {
        /* ignore */
      }
    },
    [toWorld, addPerson]
  );

  const cursor =
    spaceDown || interactionMode === "pan" || drag.type === "pan"
      ? "grab"
      : interactionMode === "connect" || drag.type === "connect-drag"
        ? "crosshair"
        : "default";

  let marqueeRect: { x: number; y: number; w: number; h: number } | null = null;
  if (drag.type === "marquee") {
    marqueeRect = {
      x: Math.min(drag.startScreenX, drag.currentScreenX),
      y: Math.min(drag.startScreenY, drag.currentScreenY),
      w: Math.abs(drag.currentScreenX - drag.startScreenX),
      h: Math.abs(drag.currentScreenY - drag.startScreenY),
    };
  }

  const fromPerson =
    connectFromId || drag.type === "connect-drag"
      ? document.persons.find(
          (p) =>
            p.id ===
            (drag.type === "connect-drag" ? drag.fromId : connectFromId)
        )
      : null;

  const previewTo =
    drag.type === "connect-drag"
      ? drag.hoverPersonId
        ? document.persons.find((p) => p.id === drag.hoverPersonId)
        : { x: drag.worldX, y: drag.worldY }
      : cursorWorld;

  const hoverId =
    drag.type === "connect-drag"
      ? drag.hoverPersonId
      : connectFromId && cursorWorld
        ? hitTestPerson(
            cursorWorld.x,
            cursorWorld.y,
            document.persons,
            connectFromId
          )
        : null;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor }}
      tabIndex={0}
      aria-label="家系圖畫布"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onCanvasKeyDown}
      onPointerLeave={() => {
        /* don't cancel connect-drag on leave */
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        className="canvas-svg"
        width={size.width}
        height={size.height}
        style={{ display: "block", width: "100%", height: "100%" }}
        role="img"
        aria-label={`家系圖，共 ${document.persons.length} 位人物、${document.relationships.length} 條關係`}
      >
        <Grid viewport={viewport} width={size.width} height={size.height} />

        <g
          transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}
        >
          <SvgRenderer
            document={document}
            selectedIds={selectedIds}
            connectFromId={
              drag.type === "connect-drag" ? drag.fromId : connectFromId
            }
            hoverPersonId={hoverId}
            onPersonPointerDown={onPersonPointerDown}
            onRelationshipPointerDown={onRelationshipPointerDown}
          />

          {fromPerson && previewTo && (
            <g className="connect-preview" pointerEvents="none">
              <line
                x1={fromPerson.x}
                y1={fromPerson.y}
                x2={previewTo.x}
                y2={previewTo.y}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.9}
              />
              <circle
                cx={fromPerson.x}
                cy={fromPerson.y}
                r={4}
                fill="#3b82f6"
              />
            </g>
          )}
        </g>

        {marqueeRect && marqueeRect.w > 0 && marqueeRect.h > 0 && (
          <rect
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.w}
            height={marqueeRect.h}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </svg>

      {document.persons.length === 0 && (
        <div className="canvas-empty" role="status">
          <div className="canvas-empty-card">
            <h2 className="canvas-empty-title">開始建立家系圖</h2>
            <p className="canvas-empty-body">
              從左側符號庫拖曳「男性／女性」到畫布，再點「婚姻」或「親子」連線。
            </p>
            <div className="canvas-empty-actions">
              <button
                type="button"
                className="canvas-empty-primary"
                onClick={() => {
                  loadDocumentData(createSampleGenogram());
                  requestFitToContent();
                  showToast("已載入示範家系圖", {
                    tone: "success",
                    durationMs: 2500,
                  });
                }}
              >
                載入示範
              </button>
            </div>
            <p className="canvas-empty-foot">
              完成後可從工具列「匯出」下載 PNG / SVG / JSON
            </p>
          </div>
        </div>
      )}

      {(interactionMode === "connect" || drag.type === "connect-drag") && (
        <div className="canvas-hint">
          <span>
            <strong className="hint-type">
              {REL_LABELS[pendingRelationshipType]}
            </strong>
            {" · "}
            {connectFromId || drag.type === "connect-drag"
              ? "拖到或點擊第二個人物完成連線"
              : "從人物拖曳到另一人物（或點一下再點一下）"}
            {" · "}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setInteractionMode("select");
                setCursorWorld(null);
                setDragSafe({ type: "none" });
              }}
            >
              結束拉線 (Esc)
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
