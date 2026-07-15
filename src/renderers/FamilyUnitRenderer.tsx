import type { RelationshipType } from "../types/document";
import type { FamilyUnitLayout } from "./familyUnits";
import { RELATIONSHIP_COLOR, SELECTION_COLOR, STROKE } from "./constants";

export interface FamilyUnitRendererProps {
  layout: FamilyUnitLayout;
  selectedIds: Set<string>;
  onPointerDown?: (e: React.PointerEvent, relationshipId: string) => void;
}

/**
 * Classic genogram family unit:
 *   ○─────────□   ← couple bar (marriage / divorce / …)
 *        │        ← stem
 *     ───┴───     ← children bar
 *     │  │  │
 *     ○  □  ○
 *
 * Pure renderer — layout comes from familyUnits helpers.
 */
export function FamilyUnitRenderer({
  layout,
  selectedIds,
  onPointerDown,
}: FamilyUnitRendererProps) {
  const { unit, couple, stem, childBar, childDrops } = layout;
  const coupleSelected = unit.coupleRel
    ? selectedIds.has(unit.coupleRel.id)
    : false;
  const anyParentSelected = unit.parentRels.some((r) => selectedIds.has(r.id));
  const selected = coupleSelected || anyParentSelected;

  const stroke = selected ? SELECTION_COLOR : RELATIONSHIP_COLOR;
  const strokeWidth = selected ? STROKE + 1 : STROKE;
  const coupleType: RelationshipType = unit.coupleRel?.type ?? "marriage";

  const hit = (relId: string) => (e: React.PointerEvent) => {
    onPointerDown?.(e, relId);
  };

  const primaryRelId =
    unit.coupleRel?.id ?? unit.parentRels[0]?.id ?? unit.id;

  return (
    <g className="family-unit" data-unit-id={unit.id}>
      {/* Couple bar */}
      {couple && unit.coupleRel && (
        <g className="couple-bar" onPointerDown={hit(unit.coupleRel.id)}>
          <line
            x1={couple.x1}
            y1={couple.y1}
            x2={couple.x2}
            y2={couple.y2}
            stroke="transparent"
            strokeWidth={14}
          />
          {renderCoupleLine(coupleType, couple, stroke, strokeWidth)}
        </g>
      )}

      {/* Stem + children tree */}
      {(stem || childBar || childDrops.length > 0) && (
        <g className="children-tree">
          {stem && (
            <g onPointerDown={hit(primaryRelId)}>
              <line
                x1={stem.x}
                y1={stem.y1}
                x2={stem.x}
                y2={stem.y2}
                stroke="transparent"
                strokeWidth={14}
              />
              <line
                x1={stem.x}
                y1={stem.y1}
                x2={stem.x}
                y2={stem.y2}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            </g>
          )}

          {childBar && (
            <g onPointerDown={hit(primaryRelId)}>
              <line
                x1={childBar.x1}
                y1={childBar.y}
                x2={childBar.x2}
                y2={childBar.y}
                stroke="transparent"
                strokeWidth={14}
              />
              <line
                x1={childBar.x1}
                y1={childBar.y}
                x2={childBar.x2}
                y2={childBar.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            </g>
          )}

          {childDrops.map((drop) => (
            <g key={drop.personId} onPointerDown={hit(drop.relId)}>
              <line
                x1={drop.x}
                y1={drop.y1}
                x2={drop.x}
                y2={drop.y2}
                stroke="transparent"
                strokeWidth={14}
              />
              <line
                x1={drop.x}
                y1={drop.y1}
                x2={drop.x}
                y2={drop.y2}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function renderCoupleLine(
  type: RelationshipType,
  couple: NonNullable<FamilyUnitLayout["couple"]>,
  stroke: string,
  strokeWidth: number
): React.ReactNode {
  const { x1, y1, x2, y2, midX, midY } = couple;
  const base = (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={
        type === "cohabitation"
          ? "8 4"
          : type === "engagement"
            ? "3 3"
            : undefined
      }
    />
  );

  if (type === "divorce") {
    return (
      <g>
        {base}
        {/* // marks */}
        <line
          x1={midX - 5}
          y1={midY - 8}
          x2={midX + 5}
          y2={midY + 8}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <line
          x1={midX - 1}
          y1={midY - 8}
          x2={midX + 9}
          y2={midY + 8}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </g>
    );
  }

  if (type === "separation") {
    return (
      <g>
        {base}
        <line
          x1={midX}
          y1={midY - 8}
          x2={midX}
          y2={midY + 8}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </g>
    );
  }

  return base;
}
