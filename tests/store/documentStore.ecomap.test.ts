import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyDocument,
  createPerson,
} from "../../src/types/document";

const memory = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};
Object.assign(globalThis, {
  window: {
    localStorage: localStorageStub,
    setTimeout,
    clearTimeout,
    addEventListener() {},
    removeEventListener() {},
  },
  localStorage: localStorageStub,
  document: { body: { appendChild() {}, removeChild() {} } },
});

const { useDocumentStore } = await import("../../src/store/documentStore");

function reset() {
  useDocumentStore.setState({
    document: createEmptyDocument(),
    history: { past: [], future: [] },
    selectedIds: [],
    clipboard: null,
    interactionMode: "select",
    connectFromId: null,
    diagramMode: "genogram",
  });
}

test("deleting a person or system drops dangling eco-links", () => {
  reset();
  useDocumentStore.setState({
    document: {
      ...createEmptyDocument(),
      persons: [
        createPerson({ id: "p1", gender: "male", x: 0, y: 0, indexPerson: true }),
      ],
      householdPersonIds: ["p1"],
      ecoSystems: [
        {
          id: "s1",
          label: "學校",
          category: "school",
          notes: "",
          x: 120,
          y: 0,
        },
      ],
      ecoLinks: [
        {
          id: "l1",
          from: { kind: "person", personId: "p1" },
          to: "s1",
          strength: "moderate",
          quality: "supportive",
          flow: "none",
          notes: "",
        },
      ],
    },
  });

  useDocumentStore.getState().select(["s1"]);
  useDocumentStore.getState().deleteSelected();
  assert.equal(useDocumentStore.getState().document.ecoSystems.length, 0);
  assert.equal(useDocumentStore.getState().document.ecoLinks.length, 0);

  useDocumentStore.getState().undo();
  useDocumentStore.getState().select(["p1"]);
  useDocumentStore.getState().deleteSelected();
  assert.equal(useDocumentStore.getState().document.persons.length, 0);
  assert.equal(useDocumentStore.getState().document.ecoLinks.length, 0);
  assert.deepEqual(
    useDocumentStore.getState().document.householdPersonIds,
    []
  );
});

test("switching to ecomap seeds household and keeps existing coordinates", () => {
  reset();
  useDocumentStore.setState({
    document: {
      ...createEmptyDocument(),
      persons: [
        createPerson({
          id: "p1",
          gender: "male",
          x: 40,
          y: 40,
          indexPerson: true,
          ecomapX: 5,
          ecomapY: 6,
        }),
        createPerson({ id: "p2", gender: "female", x: 140, y: 40 }),
      ],
      relationships: [{ id: "m", from: "p1", to: "p2", type: "marriage" }],
    },
  });

  useDocumentStore.getState().setDiagramMode("ecomap");
  const doc = useDocumentStore.getState().document;
  assert.deepEqual(doc.householdPersonIds, ["p1", "p2"]);
  assert.equal(doc.persons.find((p) => p.id === "p1")?.ecomapX, 5);
  assert.equal(typeof doc.persons.find((p) => p.id === "p2")?.ecomapX, "number");
  assert.equal(useDocumentStore.getState().diagramMode, "ecomap");
});

test("adding a person in ecomap mode joins the household", () => {
  reset();
  useDocumentStore.setState({ diagramMode: "ecomap" });
  const id = useDocumentStore.getState().addPerson("female", 12, 34);
  const doc = useDocumentStore.getState().document;
  const person = doc.persons.find((p) => p.id === id);
  assert.equal(person?.gender, "female");
  assert.equal(person?.ecomapX, 12);
  assert.equal(person?.ecomapY, 34);
  assert.deepEqual(doc.householdPersonIds, [id]);
});

test("ecomap mode can add a household family relationship", () => {
  reset();
  useDocumentStore.setState({ diagramMode: "ecomap" });
  const a = useDocumentStore.getState().addPerson("male", 0, 0);
  const b = useDocumentStore.getState().addPerson("female", 80, 0);
  useDocumentStore.getState().setPendingRelationshipType("marriage");
  const relId = useDocumentStore.getState().addRelationship(a, b, "marriage");
  const rel = useDocumentStore
    .getState()
    .document.relationships.find((r) => r.id === relId);
  assert.equal(rel?.type, "marriage");
  assert.equal(useDocumentStore.getState().connectIntent, "family");
});
