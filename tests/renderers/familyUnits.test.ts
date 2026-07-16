import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFamilyUnits,
  layoutFamilyUnit,
} from "../../src/renderers/familyUnits";
import { createPerson, type Document } from "../../src/types/document";

function person(id: string, name: string, x: number, y: number) {
  return createPerson({ id, name, gender: "unknown", x, y });
}

test("children belong only to the couple that shares both parent links", () => {
  const document: Document = {
    title: "再婚家庭",
    persons: [
      person("mother", "林雅玲", 300, 200),
      person("ex", "張國強", 430, 200),
      person("current", "陳志豪", 170, 200),
      person("daughter", "張欣怡", 380, 370),
      person("son", "陳柏宇", 220, 370),
    ],
    relationships: [
      { id: "old-couple", from: "mother", to: "ex", type: "divorce" },
      {
        id: "current-couple",
        from: "current",
        to: "mother",
        type: "marriage",
      },
      { id: "mother-daughter", from: "mother", to: "daughter", type: "parent" },
      { id: "ex-daughter", from: "ex", to: "daughter", type: "parent" },
      { id: "mother-son", from: "mother", to: "son", type: "parent" },
      { id: "current-son", from: "current", to: "son", type: "parent" },
    ],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };

  const { units } = buildFamilyUnits(document);
  const oldFamily = units.find((unit) => unit.coupleRel?.id === "old-couple");
  const currentFamily = units.find(
    (unit) => unit.coupleRel?.id === "current-couple"
  );

  assert.deepEqual(oldFamily?.children.map((child) => child.name), ["張欣怡"]);
  assert.deepEqual(currentFamily?.children.map((child) => child.name), ["陳柏宇"]);
});

test("twins share one branch junction instead of separate vertical drops", () => {
  const document: Document = {
    title: "雙胞胎家庭",
    persons: [
      person("father", "林建宏", 200, 200),
      person("mother", "陳怡君", 330, 200),
      {
        ...person("twin-a", "林宇翔", 200, 370),
        meta: { twinGroup: "twins-1" },
      },
      {
        ...person("twin-b", "林宇晴", 330, 370),
        meta: { twinGroup: "twins-1" },
      },
    ],
    relationships: [
      { id: "couple", from: "father", to: "mother", type: "marriage" },
      { id: "fa", from: "father", to: "twin-a", type: "parent" },
      { id: "ma", from: "mother", to: "twin-a", type: "parent" },
      { id: "fb", from: "father", to: "twin-b", type: "parent" },
      { id: "mb", from: "mother", to: "twin-b", type: "parent" },
    ],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };

  const unit = buildFamilyUnits(document).units[0];
  const layout = layoutFamilyUnit(unit) as ReturnType<typeof layoutFamilyUnit> & {
    twinBranches?: Array<{
      groupId: string;
      children: Array<{ personId: string }>;
    }>;
  };

  assert.equal(layout.twinBranches?.length, 1);
  assert.deepEqual(
    layout.twinBranches?.[0].children.map((child) => child.personId),
    ["twin-a", "twin-b"]
  );
  assert.equal(layout.childDrops.length, 0);
});

test("adoptive parent links mark the child drop as adoptive", () => {
  const document: Document = {
    title: "收養家庭",
    persons: [
      person("father", "林建志", 200, 200),
      person("mother", "王雅婷", 330, 200),
      person("child", "林子恩", 265, 370),
    ],
    relationships: [
      { id: "couple", from: "father", to: "mother", type: "marriage" },
      {
        id: "father-child",
        from: "father",
        to: "child",
        type: "parent",
        meta: { parentKind: "adoptive" },
      },
      {
        id: "mother-child",
        from: "mother",
        to: "child",
        type: "parent",
        meta: { parentKind: "adoptive" },
      },
    ],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };

  const unit = buildFamilyUnits(document).units[0];
  const layout = layoutFamilyUnit(unit) as ReturnType<typeof layoutFamilyUnit> & {
    childDrops: Array<{ parentKind?: string }>;
  };

  assert.equal(layout.childDrops[0]?.parentKind, "adoptive");
});

test("manual adoptive-parent relationships join a child to the family unit", () => {
  const document: Document = {
    title: "手動收養",
    persons: [
      person("father", "林建志", 200, 200),
      person("mother", "王雅婷", 330, 200),
      person("child", "林子恩", 265, 370),
    ],
    relationships: [
      { id: "couple", from: "father", to: "mother", type: "marriage" },
      {
        id: "father-child",
        from: "father",
        to: "child",
        type: "adoptiveParent" as never,
      },
      {
        id: "mother-child",
        from: "mother",
        to: "child",
        type: "adoptiveParent" as never,
      },
    ],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };

  const unit = buildFamilyUnits(document).units[0];
  assert.deepEqual(unit.children.map((child) => child.name), ["林子恩"]);
  assert.equal(layoutFamilyUnit(unit).childDrops[0]?.parentKind, "adoptive");
});

test("manual twin relationship creates a shared twin junction", () => {
  const document: Document = {
    title: "手動雙胞胎",
    persons: [
      person("father", "林建宏", 200, 200),
      person("mother", "陳怡君", 330, 200),
      person("twin-a", "林宇翔", 200, 370),
      person("twin-b", "林宇晴", 330, 370),
    ],
    relationships: [
      { id: "couple", from: "father", to: "mother", type: "marriage" },
      { id: "fa", from: "father", to: "twin-a", type: "parent" },
      { id: "ma", from: "mother", to: "twin-a", type: "parent" },
      { id: "fb", from: "father", to: "twin-b", type: "parent" },
      { id: "mb", from: "mother", to: "twin-b", type: "parent" },
      { id: "twins", from: "twin-a", to: "twin-b", type: "twin" as never },
    ],
    annotations: [],
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    updatedAt: 0,
  };

  const result = buildFamilyUnits(document);
  const layout = layoutFamilyUnit(result.units[0]);

  assert.equal(layout.twinBranches.length, 1);
  assert.ok(result.consumedRelIds.has("twins"));
});
