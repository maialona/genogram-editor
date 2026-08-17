import type { EcoLinkEndpoint } from "../../types/document";
import { HOUSEHOLD_ID } from "../../types/ecomapCatalog";

export type EcomapConnectAction =
  | { kind: "ecoLink"; from: EcoLinkEndpoint; to: string }
  | { kind: "relationship"; from: string; to: string }
  | { kind: "none" };

/** Route an ecomap drag by endpoints: people make family ties, systems make eco-links. */
export function resolveEcomapConnect(
  fromId: string,
  toId: string,
  systemIds: ReadonlySet<string>
): EcomapConnectAction {
  if (!fromId || !toId || fromId === toId) return { kind: "none" };

  const fromSystem = systemIds.has(fromId);
  const toSystem = systemIds.has(toId);
  const fromHousehold = fromId === HOUSEHOLD_ID;
  const toHousehold = toId === HOUSEHOLD_ID;

  if (toSystem && !fromSystem) {
    return {
      kind: "ecoLink",
      from: fromHousehold
        ? { kind: "household" }
        : { kind: "person", personId: fromId },
      to: toId,
    };
  }
  if (fromSystem && toHousehold) {
    return { kind: "ecoLink", from: { kind: "household" }, to: fromId };
  }
  if (fromSystem && !toSystem && !toHousehold) {
    return {
      kind: "ecoLink",
      from: { kind: "person", personId: toId },
      to: fromId,
    };
  }
  if (!fromSystem && !toSystem && !fromHousehold && !toHousehold) {
    return { kind: "relationship", from: fromId, to: toId };
  }
  return { kind: "none" };
}
