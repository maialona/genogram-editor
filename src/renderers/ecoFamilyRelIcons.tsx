import type { RelationshipType } from "../types/document";

const INK = "currentColor";

/** Mini family-tie previews used in the ecomap library. Match MiniRel. */
export function EcoFamilyRelGlyph({ type }: { type: RelationshipType }) {
  return (
    <svg
      className="eco-link-glyph"
      width={36}
      height={20}
      viewBox="0 0 36 20"
      aria-hidden="true"
    >
      {type === "parent" ? (
        <>
          <line x1={18} y1={2} x2={18} y2={18} stroke={INK} strokeWidth={2} />
          <line x1={10} y1={18} x2={26} y2={18} stroke={INK} strokeWidth={2} />
        </>
      ) : type === "adoptiveParent" ? (
        <>
          <line x1={16} y1={2} x2={16} y2={18} stroke={INK} strokeWidth={2} />
          <line
            x1={21}
            y1={2}
            x2={21}
            y2={18}
            stroke={INK}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        </>
      ) : type === "twin" ? (
        <>
          <line x1={18} y1={2} x2={18} y2={8} stroke={INK} strokeWidth={2} />
          <line x1={18} y1={8} x2={9} y2={18} stroke={INK} strokeWidth={2} />
          <line x1={18} y1={8} x2={27} y2={18} stroke={INK} strokeWidth={2} />
        </>
      ) : (
        <line x1={2} y1={10} x2={34} y2={10} stroke={INK} strokeWidth={2} />
      )}
    </svg>
  );
}
