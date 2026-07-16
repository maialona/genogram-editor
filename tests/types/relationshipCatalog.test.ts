import assert from "node:assert/strict";
import test from "node:test";
import * as relationshipCatalog from "../../src/types/relationshipCatalog";

test("symbol panel relationship catalog exposes adoption and twins", () => {
  const values = relationshipCatalog.FAMILY_REL_OPTIONS.map(
    (option) => option.value as string
  );
  assert.ok(values.includes("adoptiveParent"));
  assert.ok(values.includes("twin"));
});

test("family relationship catalog exposes a manual notation legend", () => {
  const legend = (
    relationshipCatalog as typeof relationshipCatalog & {
      FAMILY_REL_LEGEND?: Array<{ key: string }>;
    }
  ).FAMILY_REL_LEGEND;

  assert.deepEqual(
    legend?.map((item) => item.key),
    ["biological", "adoptive", "twin"]
  );
});
