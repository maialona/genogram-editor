import type {
  EcoLinkFlow,
  EcoLinkQuality,
  EcoLinkStrength,
} from "../types/document";
import { ECO_LINK_COLOR, ECO_LINK_WIDTH } from "./ecoLinkGeometry";

const INK = "currentColor";

/** Mini preview of link strength — matches canvas stroke width and dash. */
export function EcoStrengthGlyph({ value }: { value: EcoLinkStrength }) {
  const width = value === "strong" ? 3.4 : value === "moderate" ? 2 : 1.25;
  const dash = value === "weak" ? "3.5 2.6" : undefined;
  return (
    <svg
      className="eco-link-glyph"
      width={36}
      height={16}
      viewBox="0 0 36 16"
      aria-hidden="true"
    >
      <line
        x1={3}
        y1={8}
        x2={33}
        y2={8}
        stroke={INK}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mini preview of link quality — matches canvas color and ornaments. */
export function EcoQualityGlyph({ value }: { value: EcoLinkQuality }) {
  const color = ECO_LINK_COLOR[value];
  const width = ECO_LINK_WIDTH.moderate;
  return (
    <svg
      className="eco-link-glyph"
      width={36}
      height={16}
      viewBox="0 0 36 16"
      aria-hidden="true"
    >
      {value === "stressful" ? (
        <path
          d="M3 8 L8 3.2 L13 12.8 L18 3.2 L23 12.8 L28 3.2 L33 8"
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinejoin="miter"
          strokeLinecap="round"
        />
      ) : (
        <line
          x1={3}
          y1={8}
          x2={33}
          y2={8}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={value === "cutoff" ? "3.5 2.6" : undefined}
          strokeLinecap="round"
        />
      )}
      {value === "mixed" ? (
        <>
          <line x1={11} y1={4} x2={15} y2={12} stroke={color} strokeWidth={1.4} />
          <line x1={17} y1={4} x2={21} y2={12} stroke={color} strokeWidth={1.4} />
          <line x1={23} y1={4} x2={27} y2={12} stroke={color} strokeWidth={1.4} />
        </>
      ) : null}
      {value === "cutoff" ? (
        <>
          <line x1={15} y1={4} x2={21} y2={12} stroke={color} strokeWidth={1.7} />
          <line x1={21} y1={4} x2={15} y2={12} stroke={color} strokeWidth={1.7} />
        </>
      ) : null}
    </svg>
  );
}

/** Mini preview of energy-flow arrows. */
export function EcoFlowGlyph({ value }: { value: EcoLinkFlow }) {
  return (
    <svg
      className="eco-link-glyph"
      width={36}
      height={16}
      viewBox="0 0 36 16"
      aria-hidden="true"
    >
      <line
        x1={value === "inward" ? 10 : 4}
        y1={8}
        x2={value === "outward" ? 26 : value === "none" ? 32 : 26}
        y2={8}
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {value === "outward" || value === "both" ? (
        <path d="M25 4 L33 8 L25 12 Z" fill={INK} />
      ) : null}
      {value === "inward" || value === "both" ? (
        <path d="M11 4 L3 8 L11 12 Z" fill={INK} />
      ) : null}
    </svg>
  );
}
