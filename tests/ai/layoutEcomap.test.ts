import assert from "node:assert/strict";
import test from "node:test";
import { layoutGenogram } from "../../src/ai/layoutGenogram";
import type { AiGenogramDraft } from "../../src/ai/types";
import { householdCircle } from "../../src/renderers/ecomapLayout";

const ecomapDraft: AiGenogramDraft = {
  title: "小明生態圖",
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
  householdPersonIds: ["p1", "p2", "p3"],
  ecoSystems: [
    { id: "s1", label: "幼兒園", category: "school" },
    { id: "s2", label: "工廠", category: "work" },
    { id: "s3", label: "朋友", category: "friends" },
    { id: "s4", label: "籃球社", category: "recreation" },
  ],
  ecoLinks: [
    {
      from: { kind: "person", personId: "p3" },
      to: "s1",
      strength: "moderate",
      quality: "stressful",
      notes: "適應壓力",
    },
    {
      from: { kind: "person", personId: "p1" },
      to: "s2",
      strength: "weak",
      quality: "supportive",
      flow: "outward",
    },
    {
      from: { kind: "household" },
      to: "s4",
      quality: "cutoff",
    },
  ],
};

test("AI ecomap layout switches mode and remaps household plus system links", () => {
  const document = layoutGenogram(ecomapDraft);
  const byName = Object.fromEntries(document.persons.map((p) => [p.name, p]));

  assert.equal(document.meta?.diagramMode, "ecomap");
  assert.equal(document.meta?.source, "ai-ecomap");
  assert.equal(document.householdPersonIds.length, 3);
  assert.equal(document.ecoSystems.length, 4);
  assert.equal(document.ecoLinks.length, 3);

  const school = document.ecoSystems.find((s) => s.label === "幼兒園");
  const factory = document.ecoSystems.find((s) => s.label === "工廠");
  const club = document.ecoSystems.find((s) => s.label === "籃球社");
  assert.ok(school && factory && club);

  const childLink = document.ecoLinks.find((l) => l.to === school.id);
  const workLink = document.ecoLinks.find((l) => l.to === factory.id);
  const clubLink = document.ecoLinks.find((l) => l.to === club.id);

  assert.equal(childLink?.from.kind, "person");
  assert.equal(
    childLink?.from.kind === "person" ? childLink.from.personId : "",
    byName["小華"]?.id
  );
  assert.equal(childLink?.quality, "stressful");
  assert.equal(workLink?.flow, "outward");
  assert.deepEqual(clubLink?.from, { kind: "household" });
  assert.equal(clubLink?.quality, "cutoff");
});

test("AI ecomap layout places systems outside the household circle", () => {
  const document = layoutGenogram(ecomapDraft);
  const circle = householdCircle(document);
  assert.ok(circle);

  for (const system of document.ecoSystems) {
    const dist = Math.hypot(system.x - circle.cx, system.y - circle.cy);
    assert.ok(
      dist > circle.r,
      `${system.label} sits inside the household (d=${dist.toFixed(1)}, r=${circle.r})`
    );
  }
});

test("plain genogram drafts do not gain ecomap systems", () => {
  const document = layoutGenogram({
    persons: [{ id: "p1", name: "小明", gender: "male", generation: 0 }],
    relationships: [],
  });
  assert.notEqual(document.meta?.diagramMode, "ecomap");
  assert.equal(document.ecoSystems.length, 0);
  assert.equal(document.ecoLinks.length, 0);
});
