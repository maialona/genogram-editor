import assert from "node:assert/strict";
import test from "node:test";
import { parseAiGenogramDraft } from "../../src/ai/parseAiResponse";

test("AI parser preserves twin and adoptive relationship metadata", () => {
  const content = JSON.stringify({
    persons: [
      { id: "father", name: "林建志", gender: "male", generation: 1 },
      { id: "mother", name: "王雅婷", gender: "female", generation: 1 },
      {
        id: "child",
        name: "林子恩",
        gender: "male",
        generation: 2,
        twinGroup: "twins-1",
      },
    ],
    relationships: [
      {
        from: "father",
        to: "child",
        type: "parent",
        parentKind: "adoptive",
      },
      {
        from: "mother",
        to: "child",
        type: "parent",
        parentKind: "adoptive",
      },
    ],
  });

  const { draft } = parseAiGenogramDraft(content);
  const child = draft.persons.find((person) => person.id === "child") as
    | (typeof draft.persons[number] & { twinGroup?: string })
    | undefined;
  const parentRel = draft.relationships[0] as
    | (typeof draft.relationships[number] & { parentKind?: string })
    | undefined;

  assert.equal(child?.twinGroup, "twins-1");
  assert.equal(parentRel?.parentKind, "adoptive");
});

test("AI parser fills missing parent links across a twin group", () => {
  const content = JSON.stringify({
    persons: [
      { id: "father", name: "林建宏", gender: "male", generation: 1 },
      { id: "mother", name: "陳怡君", gender: "female", generation: 1 },
      {
        id: "twin-a",
        name: "林宇翔",
        gender: "male",
        generation: 2,
        twinGroup: "twins-1",
      },
      {
        id: "twin-b",
        name: "林宇晴",
        gender: "female",
        generation: 2,
        twinGroup: "twins-1",
      },
    ],
    relationships: [
      { from: "father", to: "twin-a", type: "parent" },
      { from: "mother", to: "twin-a", type: "parent" },
    ],
  });

  const { draft, warnings } = parseAiGenogramDraft(content);
  const twinBParents = draft.relationships
    .filter((rel) => rel.type === "parent" && rel.to === "twin-b")
    .map((rel) => rel.from)
    .sort();

  assert.deepEqual(twinBParents, ["father", "mother"]);
  assert.ok(warnings.some((warning) => warning.includes("雙胞胎")));
});

test("AI parser keeps divorce as the final state of a former marriage", () => {
  const content = JSON.stringify({
    persons: [
      { id: "a", name: "林雅玲", gender: "female", generation: 1 },
      { id: "b", name: "張國強", gender: "male", generation: 1 },
    ],
    relationships: [
      { from: "a", to: "b", type: "marriage" },
      { from: "a", to: "b", type: "divorce" },
    ],
  });

  const { draft } = parseAiGenogramDraft(content);
  assert.deepEqual(
    draft.relationships.map((rel) => rel.type),
    ["divorce"]
  );
});
