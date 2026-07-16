import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Document,
  Gender,
  Person,
  Relationship,
  RelationshipType,
  SelectableId,
  Viewport,
} from "../types/document";
import {
  createEmptyDocument,
  createPerson,
  createRelationship,
} from "../types/document";
import {
  loadDocument,
  normalizeDocument,
  saveDocument,
  type SaveResult,
} from "../storage/storageManager";
import { showToast } from "./toastStore";
import {
  getPersonsBounds,
  viewportToFitContent,
} from "../utils/viewport";

const MAX_HISTORY = 100;
const PERSON_SIZE = 48;

interface HistoryState {
  past: Document[];
  future: Document[];
}

interface ClipboardData {
  persons: Person[];
  relationships: Relationship[];
}

export type InteractionMode = "select" | "pan" | "connect";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DocumentStore {
  document: Document;
  history: HistoryState;
  selectedIds: SelectableId[];
  clipboard: ClipboardData | null;
  interactionMode: InteractionMode;
  /** When connecting relationships: first person id, or null. */
  connectFromId: string | null;
  pendingRelationshipType: RelationshipType;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  /** Last measured canvas size (for fit-to-content after load). */
  canvasSize: { width: number; height: number };
  /** When true, fit once canvas has a valid size. */
  pendingFitToContent: boolean;

  // Lifecycle
  hydrate: () => void;
  persist: () => SaveResult;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Viewport (not part of undo history by default — independent save)
  setViewport: (viewport: Partial<Viewport>) => void;
  setCanvasSize: (width: number, height: number) => void;
  /** Center + scale content into the current canvas. */
  fitViewportToContent: () => boolean;
  /** Fit now, or queue until canvas size is known. */
  requestFitToContent: () => void;

  // Selection
  select: (ids: SelectableId[], additive?: boolean) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  // Persons
  addPerson: (gender: Gender, x: number, y: number) => string;
  updatePerson: (
    id: string,
    patch: Partial<Person>,
    options?: { recordHistory?: boolean }
  ) => void;
  movePersons: (ids: string[], dx: number, dy: number) => void;
  setPersonPosition: (id: string, x: number, y: number) => void;

  // Relationships
  addRelationship: (from: string, to: string, type: RelationshipType) => string;
  updateRelationship: (
    id: string,
    patch: Partial<Relationship>,
    options?: { recordHistory?: boolean }
  ) => void;
  setPendingRelationshipType: (type: RelationshipType) => void;
  setConnectFromId: (id: string | null) => void;
  setInteractionMode: (mode: InteractionMode) => void;

  // Delete / clipboard
  deleteSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;

  // Document identity / reset / import
  setTitle: (title: string) => void;
  newDocument: () => void;
  loadDocumentData: (document: Document) => void;
  importDocumentJson: (raw: string) => { ok: true } | { ok: false; error: string };
  hasContent: () => boolean;
}

function cloneDocument(doc: Document): Document {
  return structuredClone(doc);
}

function documentWithoutSelectionNoise(doc: Document): Document {
  return cloneDocument(doc);
}

function withTimestamp(doc: Document): Document {
  return { ...doc, updatedAt: Date.now() };
}

function saveFailureMessage(result: SaveResult): string {
  if (result.ok) return "";
  if (result.reason === "quota") {
    return "本機儲存空間不足，變更可能未保存";
  }
  if (result.reason === "unavailable") {
    return "無法寫入本機儲存（可能為隱私模式），變更可能未保存";
  }
  return "自動儲存失敗，變更可能未保存";
}

export const useDocumentStore = create<DocumentStore>((set, get) => {
  const commit = (
    document: Document,
    extra?: Partial<
      Pick<
        DocumentStore,
        | "selectedIds"
        | "history"
        | "connectFromId"
        | "interactionMode"
        | "pendingRelationshipType"
        | "clipboard"
      >
    >,
    options?: { toastOnError?: boolean }
  ): SaveResult => {
    const next = withTimestamp(document);
    set({
      document: next,
      saveStatus: "saving",
      ...extra,
    });
    const result = saveDocument(next);
    if (result.ok) {
      set({ saveStatus: "saved", lastSavedAt: Date.now() });
    } else {
      set({ saveStatus: "error" });
      if (options?.toastOnError !== false) {
        showToast(saveFailureMessage(result), { tone: "error", durationMs: 6000 });
      }
    }
    return result;
  };

  return {
    document: createEmptyDocument(),
    history: { past: [], future: [] },
    selectedIds: [],
    clipboard: null,
    interactionMode: "select",
    connectFromId: null,
    pendingRelationshipType: "marriage",
    saveStatus: "idle",
    lastSavedAt: null,
    canvasSize: { width: 0, height: 0 },
    pendingFitToContent: false,

    hydrate: () => {
      const doc = loadDocument();
      set({
        document: doc,
        history: { past: [], future: [] },
        selectedIds: [],
        saveStatus: "saved",
        lastSavedAt: Date.now(),
      });
    },

    persist: () => {
      const { document } = get();
      set({ saveStatus: "saving" });
      const result = saveDocument(document);
      if (result.ok) {
        set({ saveStatus: "saved", lastSavedAt: Date.now() });
      } else {
        set({ saveStatus: "error" });
        showToast(saveFailureMessage(result), { tone: "error", durationMs: 6000 });
      }
      return result;
    },

    pushHistory: () => {
      const { document, history } = get();
      const past = [
        ...history.past,
        documentWithoutSelectionNoise(document),
      ].slice(-MAX_HISTORY);
      set({ history: { past, future: [] } });
    },

    undo: () => {
      const { document, history } = get();
      if (history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      const past = history.past.slice(0, -1);
      const future = [cloneDocument(document), ...history.future].slice(
        0,
        MAX_HISTORY
      );
      commit(previous, {
        history: { past, future },
        selectedIds: [],
      });
    },

    redo: () => {
      const { document, history } = get();
      if (history.future.length === 0) return;
      const next = history.future[0];
      const future = history.future.slice(1);
      const past = [...history.past, cloneDocument(document)].slice(-MAX_HISTORY);
      commit(next, {
        history: { past, future },
        selectedIds: [],
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    setViewport: (viewport) => {
      const document = {
        ...get().document,
        viewport: { ...get().document.viewport, ...viewport },
      };
      // Viewport-only changes: save quietly without bumping content updatedAt noise
      set({ document, saveStatus: "saving" });
      const result = saveDocument(document);
      if (result.ok) {
        set({ saveStatus: "saved", lastSavedAt: Date.now() });
      } else {
        set({ saveStatus: "error" });
      }
    },

    setCanvasSize: (width, height) => {
      const prev = get().canvasSize;
      if (
        Math.abs(prev.width - width) < 0.5 &&
        Math.abs(prev.height - height) < 0.5
      ) {
        return;
      }
      set({ canvasSize: { width, height } });
      if (get().pendingFitToContent && width > 0 && height > 0) {
        get().fitViewportToContent();
      }
    },

    fitViewportToContent: () => {
      const { document, canvasSize } = get();
      const bounds = getPersonsBounds(document.persons);
      if (!bounds) {
        set({ pendingFitToContent: false });
        return false;
      }
      const next = viewportToFitContent(
        bounds,
        canvasSize.width,
        canvasSize.height
      );
      if (!next) return false;
      set({ pendingFitToContent: false });
      get().setViewport(next);
      return true;
    },

    requestFitToContent: () => {
      const { canvasSize } = get();
      if (canvasSize.width > 0 && canvasSize.height > 0) {
        if (!get().fitViewportToContent()) {
          set({ pendingFitToContent: true });
        }
        return;
      }
      set({ pendingFitToContent: true });
    },

    select: (ids, additive = false) => {
      if (additive) {
        const current = new Set(get().selectedIds);
        for (const id of ids) {
          if (current.has(id)) current.delete(id);
          else current.add(id);
        }
        set({ selectedIds: Array.from(current) });
      } else {
        set({ selectedIds: [...ids] });
      }
    },

    clearSelection: () => set({ selectedIds: [] }),

    isSelected: (id) => get().selectedIds.includes(id),

    addPerson: (gender, x, y) => {
      get().pushHistory();
      const id = uuidv4();
      const person = createPerson({
        id,
        gender,
        x,
        y,
        name: "",
      });
      const document: Document = {
        ...get().document,
        persons: [...get().document.persons, person],
      };
      commit(document, { selectedIds: [id] });
      return id;
    },

    updatePerson: (id, patch, options) => {
      if (options?.recordHistory !== false) {
        get().pushHistory();
      }
      const document: Document = {
        ...get().document,
        persons: get().document.persons.map((p) =>
          p.id === id ? { ...p, ...patch } : p
        ),
      };
      commit(document);
    },

    movePersons: (ids, dx, dy) => {
      if (dx === 0 && dy === 0) return;
      const idSet = new Set(ids);
      const document: Document = {
        ...get().document,
        persons: get().document.persons.map((p) =>
          idSet.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p
        ),
      };
      set({ document });
    },

    setPersonPosition: (id, x, y) => {
      const document: Document = {
        ...get().document,
        persons: get().document.persons.map((p) =>
          p.id === id ? { ...p, x, y } : p
        ),
      };
      commit(document);
    },

    addRelationship: (from, to, type) => {
      if (from === to) return "";
      const exists = get().document.relationships.some(
        (r) =>
          r.type === type &&
          ((r.from === from && r.to === to) || (r.from === to && r.to === from))
      );
      if (exists) return "";

      get().pushHistory();
      const id = uuidv4();
      const relationship = createRelationship({ id, from, to, type });
      const document: Document = {
        ...get().document,
        relationships: [...get().document.relationships, relationship],
      };
      // Stay in connect mode so user can keep drawing more lines.
      commit(document, {
        selectedIds: [id],
        connectFromId: null,
        interactionMode: "connect",
        pendingRelationshipType: type,
      });
      return id;
    },

    updateRelationship: (id, patch, options) => {
      if (options?.recordHistory !== false) {
        get().pushHistory();
      }
      const document: Document = {
        ...get().document,
        relationships: get().document.relationships.map((r) =>
          r.id === id ? { ...r, ...patch } : r
        ),
      };
      commit(document);
    },

    setPendingRelationshipType: (type) =>
      set({
        pendingRelationshipType: type,
        interactionMode: "connect",
        connectFromId: null,
      }),

    setConnectFromId: (id) => set({ connectFromId: id }),

    setInteractionMode: (mode) =>
      set({ interactionMode: mode, connectFromId: null }),

    deleteSelected: () => {
      const { selectedIds, document } = get();
      if (selectedIds.length === 0) return;
      get().pushHistory();
      const idSet = new Set(selectedIds);
      const next: Document = {
        ...document,
        persons: document.persons.filter((p) => !idSet.has(p.id)),
        relationships: document.relationships.filter(
          (r) => !idSet.has(r.id) && !idSet.has(r.from) && !idSet.has(r.to)
        ),
        annotations: document.annotations.filter((a) => !idSet.has(a.id)),
      };
      commit(next, { selectedIds: [] });
      showToast("已刪除選取項目", {
        tone: "info",
        durationMs: 5000,
        action: {
          label: "復原",
          onClick: () => get().undo(),
        },
      });
    },

    copySelected: () => {
      const { selectedIds, document } = get();
      const personIds = new Set(
        document.persons
          .filter((p) => selectedIds.includes(p.id))
          .map((p) => p.id)
      );
      if (personIds.size === 0) {
        set({ clipboard: null });
        return;
      }
      const persons = document.persons
        .filter((p) => personIds.has(p.id))
        .map((p) => structuredClone(p));
      const relationships = document.relationships
        .filter((r) => personIds.has(r.from) && personIds.has(r.to))
        .map((r) => structuredClone(r));
      set({ clipboard: { persons, relationships } });
      showToast(`已複製 ${persons.length} 個人物`, { tone: "success", durationMs: 2000 });
    },

    pasteClipboard: () => {
      const { clipboard } = get();
      if (!clipboard || clipboard.persons.length === 0) return;
      get().pushHistory();

      const idMap = new Map<string, string>();
      const offset = 40;
      const newPersons = clipboard.persons.map((p) => {
        const newId = uuidv4();
        idMap.set(p.id, newId);
        return { ...p, id: newId, x: p.x + offset, y: p.y + offset };
      });
      const newRelationships = clipboard.relationships
        .map((r) => {
          const from = idMap.get(r.from);
          const to = idMap.get(r.to);
          if (!from || !to) return null;
          return { ...r, id: uuidv4(), from, to };
        })
        .filter((r): r is Relationship => r !== null);

      const document: Document = {
        ...get().document,
        persons: [...get().document.persons, ...newPersons],
        relationships: [...get().document.relationships, ...newRelationships],
      };
      commit(document, {
        selectedIds: newPersons.map((p) => p.id),
      });
    },

    setTitle: (title) => {
      const trimmed = title.trim().slice(0, 120) || get().document.title;
      if (trimmed === get().document.title) return;
      // Title edits do not push undo stack (like Figma file rename)
      const document: Document = {
        ...get().document,
        title: trimmed,
      };
      commit(document);
    },

    newDocument: () => {
      get().pushHistory();
      const document = createEmptyDocument();
      commit(document, {
        selectedIds: [],
        connectFromId: null,
        interactionMode: "select",
      });
      showToast("已建立新文件", { tone: "success", durationMs: 2500 });
    },

    loadDocumentData: (document) => {
      get().pushHistory();
      const next = normalizeDocument(cloneDocument(document));
      commit(next, {
        selectedIds: [],
        connectFromId: null,
        interactionMode: "select",
        history: { past: get().history.past, future: [] },
      });
    },

    importDocumentJson: (raw) => {
      try {
        const parsed = JSON.parse(raw) as Partial<Document>;
        if (
          !parsed ||
          typeof parsed !== "object" ||
          (!Array.isArray(parsed.persons) && !Array.isArray(parsed.relationships))
        ) {
          return { ok: false, error: "不是有效的家系圖 JSON" };
        }
        const next = normalizeDocument(parsed);
        get().pushHistory();
        commit(next, {
          selectedIds: [],
          connectFromId: null,
          interactionMode: "select",
          history: { past: get().history.past, future: [] },
        });
        showToast(`已匯入「${next.title}」`, { tone: "success" });
        return { ok: true };
      } catch {
        return { ok: false, error: "JSON 解析失敗，請確認檔案格式" };
      }
    },

    hasContent: () => {
      const d = get().document;
      return (
        d.persons.length > 0 ||
        d.relationships.length > 0 ||
        d.annotations.length > 0
      );
    },
  };
});

export { PERSON_SIZE };
