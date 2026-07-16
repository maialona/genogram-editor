import type { Gender, SpecialPersonType } from "../../types/document";
import {
  MEDICAL_BY_ID,
  resolveMedicalMarker,
  type MedicalMarkerDef,
  type MedicalRegion,
} from "../../types/medicalCatalog";
import {
  PERSON_HALF,
  PERSON_SIZE,
  STROKE,
  STROKE_COLOR,
} from "../constants";

interface MedicalLayerProps {
  conditions: string[];
  gender: Gender;
  specialType?: SpecialPersonType;
  personId: string;
}

/**
 * Medical markers: monochrome regions, colored disease quadrants, letter badges.
 * Clipped to the person base shape (square / circle).
 */
export function MedicalLayer({
  conditions,
  gender,
  specialType = "none",
  personId,
}: MedicalLayerProps) {
  if (!conditions || conditions.length === 0) return null;

  const markers: MedicalMarkerDef[] = [];
  const unknown: string[] = [];

  for (const c of conditions) {
    const m = resolveMedicalMarker(c) ?? MEDICAL_BY_ID.get(c) ?? null;
    if (m) markers.push(m);
    else if (c.trim()) unknown.push(c.trim());
  }

  if (markers.length === 0 && unknown.length === 0) return null;

  const clipId = `med-clip-${personId}`;
  const shape = shapeKind(gender, specialType);
  const h = PERSON_HALF;

  return (
    <g className="medical-layer" pointerEvents="none">
      <defs>
        <clipPath id={clipId}>{clipShape(shape, h)}</clipPath>
        <pattern
          id={`hatch-${personId}`}
          patternUnits="userSpaceOnUse"
          width={6}
          height={6}
          patternTransform="rotate(45)"
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={6}
            stroke={STROKE_COLOR}
            strokeWidth={1.5}
          />
        </pattern>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {markers.map((m, i) => (
          <RegionFill
            key={`${m.id}-${i}`}
            region={m.region}
            fill={m.fill}
            hatchId={`hatch-${personId}`}
            h={h}
          />
        ))}
      </g>

      {/* Non-clipped overlays: cross, split, question, center dot, badges */}
      {markers.map((m, i) => (
        <RegionOverlay key={`ov-${m.id}-${i}`} marker={m} h={h} />
      ))}

      {/* Unknown free-text → small badge dots (fallback) */}
      {unknown.map((label, i) => {
        const angle = -Math.PI / 2 + i * (Math.PI / 3);
        const r = h + 10;
        return (
          <g
            key={`unk-${label}-${i}`}
            transform={`translate(${Math.cos(angle) * r}, ${Math.sin(angle) * r})`}
          >
            <circle r={5} fill="#fef3c7" stroke={STROKE_COLOR} strokeWidth={1} />
            <title>{label}</title>
          </g>
        );
      })}
    </g>
  );
}

function shapeKind(
  gender: Gender,
  specialType: SpecialPersonType
): "rect" | "circle" | "diamond" | "triangle" {
  if (specialType === "pet") return "diamond";
  if (specialType === "pregnancy") return "triangle";
  if (specialType === "stillbirth") {
    return gender === "female" ? "circle" : "triangle";
  }
  if (gender === "female") return "circle";
  if (gender === "unknown") return "diamond";
  return "rect";
}

function clipShape(
  shape: "rect" | "circle" | "diamond" | "triangle",
  h: number
): React.ReactNode {
  if (shape === "circle") {
    return <circle cx={0} cy={0} r={h} />;
  }
  if (shape === "diamond") {
    return <path d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`} />;
  }
  if (shape === "triangle") {
    return <path d={`M 0 ${-h} L ${h} ${h} L ${-h} ${h} Z`} />;
  }
  return (
    <rect x={-h} y={-h} width={PERSON_SIZE} height={PERSON_SIZE} />
  );
}

function RegionFill({
  region,
  fill,
  hatchId,
  h,
}: {
  region: MedicalRegion;
  fill: MedicalMarkerDef["fill"];
  hatchId: string;
  h: number;
}) {
  if (fill.kind === "none") return null;
  if (
    region === "cross" ||
    region === "verticalSplit" ||
    region === "question" ||
    region === "centerDot"
  ) {
    return null;
  }

  const paint =
    fill.kind === "hatch" ? `url(#${hatchId})` : fill.color;

  const rects = regionRects(region, h);
  return (
    <g>
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={paint}
          stroke="none"
        />
      ))}
    </g>
  );
}

function regionRects(
  region: MedicalRegion,
  h: number
): { x: number; y: number; w: number; h: number }[] {
  const s = h * 2;
  switch (region) {
    case "leftHalf":
      return [{ x: -h, y: -h, w: h, h: s }];
    case "bottomHalf":
      return [{ x: -h, y: 0, w: s, h: h }];
    case "topLeft":
      return [{ x: -h, y: -h, w: h, h: h }];
    case "topRight":
      return [{ x: 0, y: -h, w: h, h: h }];
    case "bottomLeft":
      return [{ x: -h, y: 0, w: h, h: h }];
    case "bottomRight":
      return [{ x: 0, y: 0, w: h, h: h }];
    case "leftAndBottom":
      return [
        { x: -h, y: -h, w: h, h: s },
        { x: 0, y: 0, w: h, h: h },
      ];
    default:
      return [];
  }
}

function RegionOverlay({
  marker,
  h,
}: {
  marker: MedicalMarkerDef;
  h: number;
}) {
  const nodes: React.ReactNode[] = [];

  if (marker.region === "centerDot") {
    nodes.push(
      <circle
        key="dot"
        cx={0}
        cy={0}
        r={h * 0.28}
        fill={marker.fill.kind === "solid" ? marker.fill.color : STROKE_COLOR}
      />
    );
  }

  if (marker.region === "cross") {
    nodes.push(
      <line
        key="v"
        x1={0}
        y1={-h}
        x2={0}
        y2={h}
        stroke={STROKE_COLOR}
        strokeWidth={STROKE}
      />,
      <line
        key="hz"
        x1={-h}
        y1={0}
        x2={h}
        y2={0}
        stroke={STROKE_COLOR}
        strokeWidth={STROKE}
      />
    );
  }

  if (marker.region === "verticalSplit") {
    nodes.push(
      <line
        key="vs"
        x1={0}
        y1={-h}
        x2={0}
        y2={h}
        stroke={STROKE_COLOR}
        strokeWidth={STROKE}
      />
    );
  }

  if (marker.region === "question" && !marker.badge) {
    nodes.push(
      <text
        key="q"
        x={0}
        y={6}
        textAnchor="middle"
        fontSize={18}
        fontWeight={700}
        fill={STROKE_COLOR}
        fontFamily="system-ui, sans-serif"
      >
        ?
      </text>
    );
  }

  if (marker.badge) {
    nodes.push(
      <text
        key="badge"
        x={h + 2}
        y={h + 2}
        fontSize={14}
        fontWeight={700}
        fill={STROKE_COLOR}
        fontFamily="system-ui, sans-serif"
      >
        {marker.badge}
      </text>
    );
  }

  // Divider lines for half/quadrant fills (clarity on solid fills)
  if (
    marker.region === "leftHalf" ||
    marker.region === "bottomHalf" ||
    marker.region === "topLeft" ||
    marker.region === "topRight" ||
    marker.region === "bottomLeft" ||
    marker.region === "bottomRight" ||
    marker.region === "leftAndBottom"
  ) {
    if (marker.fill.kind !== "none") {
      // light internal dividers for quadrant clarity
      if (
        marker.region === "topLeft" ||
        marker.region === "topRight" ||
        marker.region === "bottomLeft" ||
        marker.region === "bottomRight" ||
        marker.region === "leftAndBottom"
      ) {
        nodes.push(
          <line
            key="div-v"
            x1={0}
            y1={-h}
            x2={0}
            y2={h}
            stroke={STROKE_COLOR}
            strokeWidth={1}
            opacity={0.35}
          />,
          <line
            key="div-h"
            x1={-h}
            y1={0}
            x2={h}
            y2={0}
            stroke={STROKE_COLOR}
            strokeWidth={1}
            opacity={0.35}
          />
        );
      } else if (marker.region === "leftHalf") {
        nodes.push(
          <line
            key="div-v"
            x1={0}
            y1={-h}
            x2={0}
            y2={h}
            stroke={STROKE_COLOR}
            strokeWidth={1}
            opacity={0.45}
          />
        );
      } else if (marker.region === "bottomHalf") {
        nodes.push(
          <line
            key="div-h"
            x1={-h}
            y1={0}
            x2={h}
            y2={0}
            stroke={STROKE_COLOR}
            strokeWidth={1}
            opacity={0.45}
          />
        );
      }
    }
  }

  if (nodes.length === 0) return null;
  return <g>{nodes}</g>;
}
