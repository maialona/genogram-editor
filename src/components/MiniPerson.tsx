import type { Gender } from "../types/document";

const SYM = {
  stroke: "currentColor",
  fill: "var(--sym-fill, #fff)",
} as const;

/** Mini square / circle / diamond — matches the genogram person glyphs. */
export function MiniPerson({ gender }: { gender: Gender }) {
  const s = 22;
  const h = s / 2;
  if (gender === "male") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <rect
          x={-h}
          y={-h}
          width={s}
          height={s}
          fill={SYM.fill}
          stroke={SYM.stroke}
          strokeWidth={2}
        />
      </svg>
    );
  }
  if (gender === "female") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <circle r={h} fill={SYM.fill} stroke={SYM.stroke} strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={28} height={28} viewBox="-14 -14 28 28">
      <path
        d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`}
        fill={SYM.fill}
        stroke={SYM.stroke}
        strokeWidth={2}
      />
    </svg>
  );
}
