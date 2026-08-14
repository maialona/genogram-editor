import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureEcomapDraft,
  extractEcomapHints,
  inferDiagramIntent,
} from "../../src/ai/diagramIntent";
import { layoutGenogram } from "../../src/ai/layoutGenogram";
import { buildSystemPrompt, buildUserContent } from "../../src/ai/systemPrompt";

const USER_PROMPT = `請畫生態圖。指標個案小明 30 歲，已婚，妻子美華 29 歲，女兒小華 5 歲同住。小華上幼兒園適應有壓力。小明和朋友關係很好、互相支持。小明在工廠上班，工作投入但連結弱。全家以前參加籃球社，現已不再參加。

應出現：一家三口在家庭圈；幼兒園（壓力，連小華）；朋友（強、互惠，連小明）；工廠（弱、流出，連小明）；籃球社（已中斷，連家庭圈）。`;

const FAMILY_ONLY_DRAFT = {
  title: "小明家系圖",
  diagramMode: "genogram" as const,
  persons: [
    { id: "p1", name: "小明", gender: "male" as const, generation: 0, indexPerson: true },
    { id: "p2", name: "美華", gender: "female" as const, generation: 0 },
    { id: "p3", name: "小華", gender: "female" as const, generation: 1 },
  ],
  relationships: [
    { from: "p1", to: "p2", type: "marriage" as const },
    { from: "p1", to: "p3", type: "parent" as const },
    { from: "p2", to: "p3", type: "parent" as const },
  ],
};

test("explicit ecomap prompt is detected even with a checklist appended", () => {
  assert.equal(inferDiagramIntent(USER_PROMPT), "ecomap");
  assert.equal(
    inferDiagramIntent(
      "指標個案小明，男，30歲。父親王大明、母親林美華已婚。小明有妹妹小華。"
    ),
    "genogram"
  );
});

test("hint extractor reads the four systems from the smoke-test narrative", () => {
  const hints = extractEcomapHints(USER_PROMPT);
  assert.deepEqual(
    hints.map((hint) => hint.label),
    ["幼兒園", "朋友", "工廠", "籃球社"]
  );
  assert.deepEqual(hints[0], {
    label: "幼兒園",
    category: "school",
    from: { name: "小華" },
    strength: "moderate",
    quality: "stressful",
    flow: "none",
    notes: "適應壓力",
  });
  assert.equal(hints[1].strength, "strong");
  assert.equal(hints[1].flow, "both");
  assert.deepEqual(hints[1].from, { name: "小明" });
  assert.equal(hints[2].strength, "weak");
  assert.equal(hints[2].flow, "outward");
  assert.equal(hints[3].quality, "cutoff");
  assert.equal(hints[3].from, "household");
});

test("family-only model JSON still becomes an ecomap for the smoke-test prompt", () => {
  const { draft, warnings } = ensureEcomapDraft(FAMILY_ONLY_DRAFT, USER_PROMPT);
  const document = layoutGenogram(draft);

  assert.equal(draft.diagramMode, "ecomap");
  assert.equal(draft.ecoSystems?.length, 4);
  assert.ok(warnings.some((warning) => warning.includes("補上")));
  assert.equal(document.meta?.diagramMode, "ecomap");
  assert.equal(document.ecoSystems.length, 4);
  assert.equal(document.householdPersonIds.length, 3);

  const school = document.ecoSystems.find((system) => system.label === "幼兒園");
  const child = document.persons.find((person) => person.name === "小華");
  const schoolLink = document.ecoLinks.find((link) => link.to === school?.id);
  assert.equal(schoolLink?.quality, "stressful");
  assert.equal(
    schoolLink?.from.kind === "person" ? schoolLink.from.personId : "",
    child?.id
  );
});

test("ecomap user message forbids a family-only reply", () => {
  const hints = extractEcomapHints(USER_PROMPT);
  const user = buildUserContent(USER_PROMPT, "ecomap", hints);
  const prompt = buildSystemPrompt("ecomap");
  assert.match(user, /禁止只輸出家人/);
  assert.match(user, /幼兒園、朋友、工廠、籃球社/);
  assert.match(prompt, /只輸出家人視為錯誤/);
});
