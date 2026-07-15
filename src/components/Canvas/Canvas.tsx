import { useCallback, useEffect, useRef, useState } from "react";
import type { Gender, RelationshipType } from "../../types/document";
import { useDocumentStore } from "../../store/documentStore";
import { SvgRenderer } from "../../renderers/SvgRenderer";
import { Grid } from "../../renderers/Grid";
import { PERSON_HALF } from "../../renderers/constants";

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
const ZOOM_SENSITIVITY = 0.0015;

const REL_LABELS: Record<RelationshipType, string> = {
  marriage: "婚姻",
  divorce: "離婚",
  separation: "分居",
  cohabitation: "同居",
  engagement: "訂婚",
  parent: "親子",
  harmony: "和諧",
  close: "親密",
  conflict: "衝突",
  hostile: "疏離/敵對",
  abuse: "暴力/虐待",
};

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

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [drag, setDrag] = useState<DragKind>({ type: "none" });
  /** Cursor in world space for rubber-band preview (click-click mode). */
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(
    null
  );

  const document = useDocumentStore((s) => s.document);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const connectFromId = useDocumentStore((s) => s.connectFromId);
  const pendingRelationshipType = useDocumentStore((s) => s.pendingRelationshipType);

  const setViewport = useDocumentStore((s) => s.setViewport);
  const select = useDocumentStore((s) => s.select);
  const clearSelection = useDocumentStore((s) => s.clearSelection);
  const addPerson = useDocumentStore((s) => s.addPerson);
  const movePersons = useDocumentStore((s) => s.movePersons);
  const pushHistory = useDocumentStore((s) => s.pushHistory);
  const persist = useDocumentStore((s) => s.persist);
  const addRelationship = useDocumentStore((s) => s.addRelationship);
  const setConnectFromId = useDocumentStore((s) => s.setConnectFromId);
  const setInteractionMode = useDocumentStore((s) => s.setInteractionMode);

  const { viewport } = document;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (1 + delta)));
      const ratio = nextScale / scale;
      const nextOffsetX = local.x - (local.x - offsetX) * ratio;
      const nextOffsetY = local.y - (local.y - offsetY) * ratio;
      setViewport({ scale: nextScale, offsetX: nextOffsetX, offsetY: nextOffsetY });
    },
    [getLocalPoint, setViewport, viewport]
  );

  const beginConnectFrom = useCallback(
    (personId: string, worldX: number, worldY: number) => {
      setConnectFromId(personId);
      select([personId]);
      setDrag({
        type: "connect-drag",
        fromId: personId,
        worldX,
        worldY,
        hoverPersonId: null,
      });
    },
    [setConnectFromId, select]
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

      const world = toWorld(e.clientX, e.clientY);

      // Connect mode: drag from A → drop on B (or click A then click B)
      if (interactionMode === "connect") {
        if (connectFromId && connectFromId !== personId && drag.type !== "connect-drag") {
          // Second click in click-click flow
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
      const already = selectedIds.includes(personId);
      let nextSelection = selectedIds;
      if (additive) {
        select([personId], true);
        nextSelection = already
          ? selectedIds.filter((id) => id !== personId)
          : [...selectedIds, personId];
      } else if (!already) {
        select([personId]);
        nextSelection = [personId];
      }

      const personIds = nextSelection.filter((id) =>
        document.persons.some((p) => p.id === id)
      );
      if (personIds.length === 0) personIds.push(personId);

      setDrag({
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
      drag.type,
      completeConnect,
      beginConnectFrom,
      toWorld,
      selectedIds,
      select,
      document.persons,
    ]
  );

  const onRelationshipPointerDown = useCallback(
    (e: React.PointerEvent, relationshipId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (interactionMode === "connect") return;
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      select([relationshipId], additive);
    },
    [select, interactionMode]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || spaceDown || interactionMode === "pan" || e.button === 2) {
        e.preventDefault();
        setDrag({
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
        setDrag({ type: "none" });
        return;
      }

      const local = getLocalPoint(e.clientX, e.clientY);
      setDrag({
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
    ]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const world = toWorld(e.clientX, e.clientY);

      if (interactionMode === "connect" && connectFromId && drag.type !== "connect-drag") {
        setCursorWorld(world);
      }

      if (drag.type === "none") return;

      if (drag.type === "pan") {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        setViewport({
          offsetX: drag.originOffsetX + dx,
          offsetY: drag.originOffsetY + dy,
        });
        return;
      }

      if (drag.type === "connect-drag") {
        const hover = hitTestPerson(world.x, world.y, document.persons, drag.fromId);
        setDrag({
          ...drag,
          worldX: world.x,
          worldY: world.y,
          hoverPersonId: hover,
        });
        setCursorWorld(world);
        return;
      }

      if (drag.type === "move") {
        const dx = world.x - drag.lastWorldX;
        const dy = world.y - drag.lastWorldY;
        if (dx !== 0 || dy !== 0) {
          if (!drag.pushedHistory) {
            pushHistory();
            setDrag({ ...drag, pushedHistory: true, lastWorldX: world.x, lastWorldY: world.y });
          } else {
            setDrag({ ...drag, lastWorldX: world.x, lastWorldY: world.y });
          }
          movePersons(drag.personIds, dx, dy);
        }
        return;
      }

      if (drag.type === "marquee") {
        const local = getLocalPoint(e.clientX, e.clientY);
        setDrag({
          ...drag,
          currentScreenX: local.x,
          currentScreenY: local.y,
        });
      }
    },
    [
      drag,
      toWorld,
      interactionMode,
      connectFromId,
      setViewport,
      document.persons,
      pushHistory,
      movePersons,
      getLocalPoint,
    ]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (drag.type === "connect-drag") {
        const world = toWorld(e.clientX, e.clientY);
        const target =
          drag.hoverPersonId ??
          hitTestPerson(world.x, world.y, document.persons, drag.fromId);

        if (target) {
          completeConnect(drag.fromId, target);
        } else {
          // Released on empty space: keep click-click mode with rubber band
          setConnectFromId(drag.fromId);
          setCursorWorld(world);
        }
        setDrag({ type: "none" });
        return;
      }

      if (drag.type === "move") {
        if (drag.pushedHistory) persist();
        setDrag({ type: "none" });
        return;
      }

      if (drag.type === "pan") {
        setDrag({ type: "none" });
        return;
      }

      if (drag.type === "marquee") {
        const x1 = Math.min(drag.startScreenX, drag.currentScreenX);
        const y1 = Math.min(drag.startScreenY, drag.currentScreenY);
        const x2 = Math.max(drag.startScreenX, drag.currentScreenX);
        const y2 = Math.max(drag.startScreenY, drag.currentScreenY);
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
          if (drag.additive) {
            select(hits, true);
          } else {
            select(hits);
          }
        }
        setDrag({ type: "none" });
        return;
      }

      setDrag({ type: "none" });
    },
    [
      drag,
      toWorld,
      document.persons,
      completeConnect,
      setConnectFromId,
      persist,
      interactionMode,
      clearSelection,
      viewport,
      select,
    ]
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

  // Rubber-band preview
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
        ? hitTestPerson(cursorWorld.x, cursorWorld.y, document.persons, connectFromId)
        : null;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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
                x2={"id" in previewTo ? previewTo.x : previewTo.x}
                y2={"id" in previewTo ? previewTo.y : previewTo.y}
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

      <div className="canvas-hint">
        {interactionMode === "connect" || drag.type === "connect-drag" ? (
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
                setDrag({ type: "none" });
              }}
            >
              結束拉線 (Esc)
            </button>
          </span>
        ) : (
          <span>
            左側點「婚姻 / 親子」後從人物拖到人物 · Alt+拖曳快速拉線 · 空白鍵平移
          </span>
        )}
        <span className="zoom-label">{Math.round(viewport.scale * 100)}%</span>
      </div>
    </div>
  );
}
