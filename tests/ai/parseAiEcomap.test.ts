import assert from "node:assert/strict";
import test from "node:test";
import { parseAiGenogramDraft } from "../../src/ai/parseAiResponse";

test("AI parser extracts ecomap systems, household, and mixed endpoints", () => {
  const content = JSON.stringify({
    diagramMode: "ecomap",
    persons: [
      { id: "p1", name: "小明", gender: "male", generation: 0, indexPerson: true },
      { id: "p2", name: "美華", gender: "female", generation: 0 },
      { id: "p3", name: "小華", gender: "female", generation: 1 },
    ],
    relationships: [
      { from: "p1", to: "p2", type: "marriage" },
      { from: "p1", to: "p3", type: "parent" },
      { from: "p2", to: "p3", type: "parent" },
    ],
    householdPersonIds: ["p1", "p2", "p3", "ghost"],
    ecoSystems: [
      { id: "s1", label: "幼兒園", category: "school" },
      { id: "s2", label: "工廠", category: "工作" },
      { id: "s3", label: "籃球社", category: "recreation" },
    ],
    ecoLinks: [
      {
        from: { kind: "person", personId: "p3" },
        to: "s1",
        strength: "中",
        quality: "壓力",
        notes: "適應壓力",
      },
      { from: "p1", to: "s2", strength: "weak", quality: "supportive", flow: "流出" },
      { from: "家庭圈", to: "s3", quality: "已中斷" },
      { from: "p1", to: "missing" },
    ],
  });

  const { draft, warnings } = parseAiGenogramDraft(content);

  assert.equal(draft.diagramMode, "ecomap");
  assert.deepEqual(draft.householdPersonIds, ["p1", "p2", "p3"]);
  assert.equal(draft.ecoSystems?.length, 3);
  assert.equal(draft.ecoSystems?.[1]?.category, "work");
  assert.equal(draft.ecoLinks?.length, 3);
  assert.deepEqual(draft.ecoLinks?.[0]?.from, { kind: "person", personId: "p3" });
  assert.equal(draft.ecoLinks?.[0]?.quality, "stressful");
  assert.equal(draft.ecoLinks?.[1]?.flow, "outward");
  assert.deepEqual(draft.ecoLinks?.[2]?.from, { kind: "household" });
  assert.equal(draft.ecoLinks?.[2]?.quality, "cutoff");
  assert.ok(warnings.some((w) => w.includes("核心家庭")));
  assert.ok(warnings.some((w) => w.includes("系統端點")));
});

test("AI parser treats systems as enough signal to choose ecomap mode", () => {
  const content = JSON.stringify({
    persons: [{ id: "p1", name: "小明", gender: "male" }],
    relationships: [],
    ecoSystems: [{ id: "s1", label: "教會", category: "religion" }],
    ecoLinks: [{ from: "household", to: "s1", strength: "strong" }],
  });

  const { draft } = parseAiGenogramDraft(content);
  assert.equal(draft.diagramMode, "ecomap");
  assert.equal(draft.ecoSystems?.[0]?.category, "religion");
  assert.deepEqual(draft.ecoLinks?.[0]?.from, { kind: "household" });
});

test("AI parser falls unknown system category back to custom", () => {
  const content = JSON.stringify({
    persons: [{ id: "p1", name: "小明", gender: "male" }],
    ecoSystems: [{ id: "s1", label: "網咖", category: "arcade" }],
  });

  const { draft, warnings } = parseAiGenogramDraft(content);
  assert.equal(draft.ecoSystems?.[0]?.category, "custom");
  assert.ok(warnings.some((w) => w.includes("arcade")));
});
