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
import { loadDocument, saveDocument } from "../storage/storageManager";

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

interface DocumentStore {
  document: Document;
  history: HistoryState;
  selectedIds: SelectableId[];
  clipboard: ClipboardData | null;
  interactionMode: InteractionMode;
  /** When connecting relationships: first person id, or null. */
  connectFromId: string | null;
  pendingRelationshipType: RelationshipType;

  // Lifecycle
  hydrate: () => void;
  persist: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Viewport (not part of undo history by default — independent save)
  setViewport: (viewport: Partial<Viewport>) => void;

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

  // Document reset
  newDocument: () => void;
  loadDocumentData: (document: Document) => void;
}

function cloneDocument(doc: Document): Document {
  return structuredClone(doc);
}

function documentWithoutSelectionNoise(doc: Document): Document {
  return cloneDocument(doc);
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: createEmptyDocument(),
  history: { past: [], future: [] },
  selectedIds: [],
  clipboard: null,
  interactionMode: "select",
  connectFromId: null,
  pendingRelationshipType: "marriage",

  hydrate: () => {
    const doc = loadDocument();
    set({ document: doc, history: { past: [], future: [] }, selectedIds: [] });
  },

  persist: () => {
    saveDocument(get().document);
  },

  pushHistory: () => {
    const { document, history } = get();
    const past = [...history.past, documentWithoutSelectionNoise(document)].slice(
      -MAX_HISTORY
    );
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
    set({
      document: previous,
      history: { past, future },
      selectedIds: [],
    });
    saveDocument(previous);
  },

  redo: () => {
    const { document, history } = get();
    if (history.future.length === 0) return;
    const next = history.future[0];
    const future = history.future.slice(1);
    const past = [...history.past, cloneDocument(document)].slice(-MAX_HISTORY);
    set({
      document: next,
      history: { past, future },
      selectedIds: [],
    });
    saveDocument(next);
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  setViewport: (viewport) => {
    const document = {
      ...get().document,
      viewport: { ...get().document.viewport, ...viewport },
    };
    set({ document });
    saveDocument(document);
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
      name: gender === "male" ? "男" : gender === "female" ? "女" : "未知",
    });
    const document: Document = {
      ...get().document,
      persons: [...get().document.persons, person],
    };
    set({ document, selectedIds: [id] });
    saveDocument(document);
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
    set({ document });
    saveDocument(document);
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
    set({ document });
    saveDocument(document);
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
    set({
      document,
      selectedIds: [id],
      connectFromId: null,
      interactionMode: "connect",
      pendingRelationshipType: type,
    });
    saveDocument(document);
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
    set({ document });
    saveDocument(document);
  },

  setPendingRelationshipType: (type) =>
    set({ pendingRelationshipType: type, interactionMode: "connect", connectFromId: null }),

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
    set({ document: next, selectedIds: [] });
    saveDocument(next);
  },

  copySelected: () => {
    const { selectedIds, document } = get();
    const personIds = new Set(
      document.persons.filter((p) => selectedIds.includes(p.id)).map((p) => p.id)
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
    set({
      document,
      selectedIds: newPersons.map((p) => p.id),
    });
    saveDocument(document);
  },

  newDocument: () => {
    get().pushHistory();
    const document = createEmptyDocument();
    set({
      document,
      selectedIds: [],
      connectFromId: null,
      interactionMode: "select",
    });
    saveDocument(document);
  },

  loadDocumentData: (document) => {
    get().pushHistory();
    const next = cloneDocument(document);
    set({
      document: next,
      selectedIds: [],
      connectFromId: null,
      interactionMode: "select",
      history: { past: get().history.past, future: [] },
    });
    saveDocument(next);
  },
}));

export { PERSON_SIZE };
