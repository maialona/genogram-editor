import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  DiagramMode,
  Document,
  EcoLink,
  EcoLinkEndpoint,
  EcoLinkFlow,
  EcoLinkQuality,
  EcoLinkStrength,
  EcoSystem,
  EcoSystemCategory,
  Gender,
  Person,
  Relationship,
  RelationshipType,
  SelectableId,
  Viewport,
} from "../types/document";
import {
  createEmptyDocument,
  createEcoLink,
  createEcoSystem,
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
  type ContentBounds,
} from "../utils/viewport";
import { HOUSEHOLD_ID } from "../types/ecomapCatalog";
import { ECO_SYSTEM_LABELS } from "../types/ecomapCatalog";
import {
  ECO_SYSTEM_RADIUS,
  personEcomapPosition,
  seedEcomapLayout,
} from "../renderers/ecomapLayout";

const MAX_HISTORY = 100;
const PERSON_SIZE = 48;

interface HistoryState {
  past: Document[];
  future: Document[];
}

interface ClipboardData {
  persons: Person[];
  relationships: Relationship[];
  ecoSystems: EcoSystem[];
  ecoLinks: EcoLink[];
}

export type InteractionMode = "select" | "pan" | "connect";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface PendingEcoLink {
  strength: EcoLinkStrength;
  quality: EcoLinkQuality;
  flow: EcoLinkFlow;
}

interface DocumentStore {
  document: Document;
  history: HistoryState;
  selectedIds: SelectableId[];
  clipboard: ClipboardData | null;
  interactionMode: InteractionMode;
  /** When connecting: first person id, household, or null. */
  connectFromId: string | null;
  pendingRelationshipType: RelationshipType;
  pendingEcoLink: PendingEcoLink;
  diagramMode: DiagramMode;
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

  setDiagramMode: (mode: DiagramMode) => void;
  setPendingEcoLink: (patch: Partial<PendingEcoLink>) => void;
  addEcoSystem: (
    category: EcoSystemCategory,
    x: number,
    y: number,
    label?: string
  ) => string;
  updateEcoSystem: (
    id: string,
    patch: Partial<EcoSystem>,
    options?: { recordHistory?: boolean }
  ) => void;
  addEcoLink: (from: EcoLinkEndpoint, to: string) => string;
  updateEcoLink: (
    id: string,
    patch: Partial<EcoLink>,
    options?: { recordHistory?: boolean }
  ) => void;
  toggleHouseholdMember: (personId: string) => void;

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

function getEcomapBounds(document: Document): ContentBounds | null {
  const household = new Set(document.householdPersonIds);
  const personPts = document.persons
    .filter((p) => household.has(p.id))
    .map((p) => personEcomapPosition(p));
  const systemPts = document.ecoSystems.map((s) => ({
    x: s.x,
    y: s.y,
  }));
  const points = [...personPts, ...systemPts];
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of personPts) {
    minX = Math.min(minX, p.x - 24);
    maxX = Math.max(maxX, p.x + 24);
    minY = Math.min(minY, p.y - 24);
    maxY = Math.max(maxY, p.y + 60);
  }
  for (const s of systemPts) {
    minX = Math.min(minX, s.x - ECO_SYSTEM_RADIUS);
    maxX = Math.max(maxX, s.x + ECO_SYSTEM_RADIUS);
    minY = Math.min(minY, s.y - ECO_SYSTEM_RADIUS);
    maxY = Math.max(maxY, s.y + ECO_SYSTEM_RADIUS + 16);
  }
  return { minX, minY, maxX, maxY };
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
        | "pendingEcoLink"
        | "diagramMode"
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
    pendingEcoLink: {
      strength: "moderate",
      quality: "supportive",
      flow: "none",
    },
    diagramMode: "genogram",
    saveStatus: "idle",
    lastSavedAt: null,
    canvasSize: { width: 0, height: 0 },
    pendingFitToContent: false,

    hydrate: () => {
      const doc = loadDocument();
      const mode = doc.meta?.diagramMode;
      set({
        document: doc,
        history: { past: [], future: [] },
        selectedIds: [],
        saveStatus: "saved",
        lastSavedAt: Date.now(),
        diagramMode: mode === "ecomap" ? "ecomap" : "genogram",
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
      const current = get().document;
      const key =
        get().diagramMode === "ecomap" ? "ecomapViewport" : "viewport";
      const document = {
        ...current,
        [key]: { ...current[key], ...viewport },
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
      const { document, canvasSize, diagramMode } = get();
      const bounds =
        diagramMode === "ecomap"
          ? getEcomapBounds(document)
          : getPersonsBounds(document.persons);
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
      const ecomap = get().diagramMode === "ecomap";
      const person = createPerson({
        id,
        gender,
        x: ecomap ? x : x,
        y: ecomap ? y : y,
        ecomapX: ecomap ? x : null,
        ecomapY: ecomap ? y : null,
        name: "",
      });
      const current = get().document;
      const document: Document = {
        ...current,
        persons: [...current.persons, person],
        householdPersonIds: ecomap
          ? [...current.householdPersonIds, id]
          : current.householdPersonIds,
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
      const ecomap = get().diagramMode === "ecomap";
      const current = get().document;
      const document: Document = {
        ...current,
        persons: current.persons.map((p) => {
          if (!idSet.has(p.id)) return p;
          if (ecomap) {
            const pos = personEcomapPosition(p);
            return { ...p, ecomapX: pos.x + dx, ecomapY: pos.y + dy };
          }
          return { ...p, x: p.x + dx, y: p.y + dy };
        }),
        ecoSystems: current.ecoSystems.map((s) =>
          idSet.has(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s
        ),
      };
      set({ document });
    },

    setPersonPosition: (id, x, y) => {
      const ecomap = get().diagramMode === "ecomap";
      const document: Document = {
        ...get().document,
        persons: get().document.persons.map((p) =>
          p.id === id
            ? ecomap
              ? { ...p, ecomapX: x, ecomapY: y }
              : { ...p, x, y }
            : p
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

    setDiagramMode: (mode) => {
      const current = get().document;
      const nextDoc =
        mode === "ecomap" ? seedEcomapLayout(current) : current;
      const document: Document = {
        ...nextDoc,
        meta: { ...nextDoc.meta, diagramMode: mode },
      };
      set({
        document,
        diagramMode: mode,
        selectedIds: [],
        connectFromId: null,
        interactionMode: "select",
      });
      saveDocument(document);
    },

    setPendingEcoLink: (patch) =>
      set({
        pendingEcoLink: { ...get().pendingEcoLink, ...patch },
        interactionMode: "connect",
        connectFromId: null,
      }),

    addEcoSystem: (category, x, y, label) => {
      get().pushHistory();
      const id = uuidv4();
      const system = createEcoSystem({
        id,
        category,
        x,
        y,
        label: label ?? ECO_SYSTEM_LABELS[category],
      });
      const document: Document = {
        ...get().document,
        ecoSystems: [...get().document.ecoSystems, system],
      };
      commit(document, { selectedIds: [id] });
      return id;
    },

    updateEcoSystem: (id, patch, options) => {
      if (options?.recordHistory !== false) {
        get().pushHistory();
      }
      const document: Document = {
        ...get().document,
        ecoSystems: get().document.ecoSystems.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      };
      commit(document);
    },

    addEcoLink: (from, to) => {
      const current = get().document;
      if (!current.ecoSystems.some((s) => s.id === to)) return "";
      if (from.kind === "person" && !current.persons.some((p) => p.id === from.personId)) {
        return "";
      }
      const exists = current.ecoLinks.some(
        (l) =>
          l.to === to &&
          ((l.from.kind === "household" && from.kind === "household") ||
            (l.from.kind === "person" &&
              from.kind === "person" &&
              l.from.personId === from.personId))
      );
      if (exists) return "";

      get().pushHistory();
      const id = uuidv4();
      const { pendingEcoLink } = get();
      const link = createEcoLink({
        id,
        from,
        to,
        ...pendingEcoLink,
      });
      const document: Document = {
        ...current,
        ecoLinks: [...current.ecoLinks, link],
      };
      commit(document, {
        selectedIds: [id],
        connectFromId: null,
        interactionMode: "connect",
      });
      return id;
    },

    updateEcoLink: (id, patch, options) => {
      if (options?.recordHistory !== false) {
        get().pushHistory();
      }
      const document: Document = {
        ...get().document,
        ecoLinks: get().document.ecoLinks.map((l) =>
          l.id === id ? { ...l, ...patch } : l
        ),
      };
      commit(document);
    },

    toggleHouseholdMember: (personId) => {
      const current = get().document;
      if (!current.persons.some((p) => p.id === personId)) return;
      get().pushHistory();
      const inHouse = current.householdPersonIds.includes(personId);
      const householdPersonIds = inHouse
        ? current.householdPersonIds.filter((id) => id !== personId)
        : [...current.householdPersonIds, personId];
      const ecoLinks = inHouse
        ? current.ecoLinks.filter(
            (l) =>
              !(l.from.kind === "person" && l.from.personId === personId)
          )
        : current.ecoLinks;
      commit({ ...current, householdPersonIds, ecoLinks });
    },

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
        ecoSystems: document.ecoSystems.filter((s) => !idSet.has(s.id)),
        householdPersonIds: document.householdPersonIds.filter(
          (id) => !idSet.has(id)
        ),
        ecoLinks: document.ecoLinks.filter((l) => {
          if (idSet.has(l.id) || idSet.has(l.to)) return false;
          if (l.from.kind === "person" && idSet.has(l.from.personId)) {
            return false;
          }
          return true;
        }),
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
      const persons = document.persons
        .filter((p) => personIds.has(p.id))
        .map((p) => structuredClone(p));
      const relationships = document.relationships
        .filter((r) => personIds.has(r.from) && personIds.has(r.to))
        .map((r) => structuredClone(r));
      const ecoSystems = document.ecoSystems
        .filter((s) => selectedIds.includes(s.id))
        .map((s) => structuredClone(s));
      const systemIds = new Set(ecoSystems.map((s) => s.id));
      const ecoLinks = document.ecoLinks
        .filter((l) => {
          if (!systemIds.has(l.to)) return false;
          if (l.from.kind === "household") {
            return selectedIds.includes(HOUSEHOLD_ID);
          }
          return personIds.has(l.from.personId);
        })
        .map((l) => structuredClone(l));
      if (persons.length === 0 && ecoSystems.length === 0) {
        set({ clipboard: null });
        return;
      }
      set({ clipboard: { persons, relationships, ecoSystems, ecoLinks } });
      const n = persons.length + ecoSystems.length;
      showToast(`已複製 ${n} 個物件`, { tone: "success", durationMs: 2000 });
    },

    pasteClipboard: () => {
      const { clipboard } = get();
      if (
        !clipboard ||
        (clipboard.persons.length === 0 &&
          (clipboard.ecoSystems?.length ?? 0) === 0)
      )
        return;
      get().pushHistory();

      const idMap = new Map<string, string>();
      const offset = 40;
      const newPersons = clipboard.persons.map((p) => {
        const newId = uuidv4();
        idMap.set(p.id, newId);
        return {
          ...p,
          id: newId,
          x: p.x + offset,
          y: p.y + offset,
          ecomapX: p.ecomapX != null ? p.ecomapX + offset : null,
          ecomapY: p.ecomapY != null ? p.ecomapY + offset : null,
        };
      });
      const newRelationships = clipboard.relationships
        .map((r) => {
          const from = idMap.get(r.from);
          const to = idMap.get(r.to);
          if (!from || !to) return null;
          return { ...r, id: uuidv4(), from, to };
        })
        .filter((r): r is Relationship => r !== null);

      const systemIdMap = new Map<string, string>();
      const newSystems = (clipboard.ecoSystems ?? []).map((s) => {
        const newId = uuidv4();
        systemIdMap.set(s.id, newId);
        return { ...s, id: newId, x: s.x + offset, y: s.y + offset };
      });
      const newLinks = (clipboard.ecoLinks ?? [])
        .map((l) => {
          const to = systemIdMap.get(l.to);
          if (!to) return null;
          const from =
            l.from.kind === "household"
              ? l.from
              : idMap.has(l.from.personId)
                ? { kind: "person" as const, personId: idMap.get(l.from.personId)! }
                : null;
          if (!from) return null;
          return { ...l, id: uuidv4(), from, to };
        })
        .filter((l): l is EcoLink => l !== null);

      const current = get().document;
      const document: Document = {
        ...current,
        persons: [...current.persons, ...newPersons],
        relationships: [...current.relationships, ...newRelationships],
        ecoSystems: [...current.ecoSystems, ...newSystems],
        ecoLinks: [...current.ecoLinks, ...newLinks],
        householdPersonIds: [
          ...current.householdPersonIds,
          ...clipboard.persons
            .filter((src) => current.householdPersonIds.includes(src.id))
            .map((src) => idMap.get(src.id))
            .filter((id): id is string => Boolean(id)),
        ],
      };
      commit(document, {
        selectedIds: [
          ...newPersons.map((p) => p.id),
          ...newSystems.map((s) => s.id),
        ],
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
        diagramMode: "genogram",
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
        diagramMode: next.meta?.diagramMode === "ecomap" ? "ecomap" : "genogram",
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
          diagramMode: next.meta?.diagramMode === "ecomap" ? "ecomap" : "genogram",
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
        d.annotations.length > 0 ||
        d.ecoSystems.length > 0 ||
        d.ecoLinks.length > 0
      );
    },
  };
});

export { PERSON_SIZE };
