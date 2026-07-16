import assert from "node:assert/strict";
import test from "node:test";
import { layoutGenogram } from "../../src/ai/layoutGenogram";
import { parseAiGenogramDraft } from "../../src/ai/parseAiResponse";
import {
  buildFamilyUnits,
  layoutFamilyUnit,
} from "../../src/renderers/familyUnits";

test("complex AI family keeps twins, adoption, divorce, and remarriage distinct", () => {
  const content = JSON.stringify({
    persons: [
      { id: "p1", name: "林正雄", gender: "male", generation: 0 },
      { id: "p2", name: "黃美惠", gender: "female", generation: 0 },
      { id: "p3", name: "林建宏", gender: "male", generation: 1 },
      { id: "p4", name: "林建志", gender: "male", generation: 1 },
      { id: "p5", name: "林雅玲", gender: "female", generation: 1 },
      { id: "p6", name: "陳怡君", gender: "female", generation: 1 },
      { id: "p7", name: "王雅婷", gender: "female", generation: 1 },
      { id: "p8", name: "張國強", gender: "male", generation: 1 },
      { id: "p9", name: "陳志豪", gender: "male", generation: 1 },
      {
        id: "p10",
        name: "林宇翔",
        gender: "male",
        generation: 2,
        twinGroup: "twins-1",
      },
      {
        id: "p11",
        name: "林宇晴",
        gender: "female",
        generation: 2,
        twinGroup: "twins-1",
      },
      { id: "p12", name: "林子恩", gender: "male", generation: 2 },
      { id: "p13", name: "張欣怡", gender: "female", generation: 2 },
      { id: "p14", name: "陳柏宇", gender: "male", generation: 2 },
    ],
    relationships: [
      { from: "p1", to: "p2", type: "marriage" },
      ...["p3", "p4", "p5"].flatMap((child) => [
        { from: "p1", to: child, type: "parent" },
        { from: "p2", to: child, type: "parent" },
      ]),
      { from: "p3", to: "p6", type: "marriage" },
      { from: "p3", to: "p10", type: "parent" },
      { from: "p6", to: "p10", type: "parent" },
      { from: "p4", to: "p7", type: "marriage" },
      {
        from: "p4",
        to: "p12",
        type: "parent",
        parentKind: "adoptive",
      },
      {
        from: "p7",
        to: "p12",
        type: "parent",
        parentKind: "adoptive",
      },
      { from: "p5", to: "p8", type: "marriage" },
      { from: "p5", to: "p8", type: "divorce" },
      { from: "p5", to: "p13", type: "parent" },
      { from: "p8", to: "p13", type: "parent" },
      { from: "p9", to: "p5", type: "marriage" },
      { from: "p5", to: "p14", type: "parent" },
      { from: "p9", to: "p14", type: "parent" },
    ],
  });

  const { draft } = parseAiGenogramDraft(content);
  const document = layoutGenogram(draft);
  const { units } = buildFamilyUnits(document);
  const nameById = new Map(document.persons.map((person) => [person.id, person.name]));
  const familyWith = (name: string) =>
    units.find(
      (unit) =>
        nameById.get(unit.partnerA.id) === name ||
        nameById.get(unit.partnerB?.id ?? "") === name
    );

  const twinFamily = familyWith("林建宏");
  const adoptiveFamily = familyWith("林建志");
  const formerFamily = units.find((unit) => unit.coupleRel?.type === "divorce");
  const remarriedFamily = units.find(
    (unit) =>
      unit.coupleRel?.type === "marriage" &&
      [unit.partnerA, unit.partnerB].some(
        (person) => person && nameById.get(person.id) === "陳志豪"
      )
  );

  assert.deepEqual(
    twinFamily?.children.map((child) => child.name),
    ["林宇翔", "林宇晴"]
  );
  assert.equal(layoutFamilyUnit(twinFamily!).twinBranches.length, 1);
  assert.equal(
    layoutFamilyUnit(adoptiveFamily!).childDrops[0]?.parentKind,
    "adoptive"
  );
  assert.deepEqual(formerFamily?.children.map((child) => child.name), ["張欣怡"]);
  assert.deepEqual(remarriedFamily?.children.map((child) => child.name), ["陳柏宇"]);
});
