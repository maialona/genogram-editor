import { PERSON_HALF, STROKE_COLOR } from "../constants";

interface MedicalLayerProps {
  conditions: string[];
}

/**
 * Medical markers as small filled sectors / badges.
 * First version: show up to 4 condition chips around the symbol.
 * Architecture reserved for richer medical symbols later.
 */
export function MedicalLayer({ conditions }: MedicalLayerProps) {
  if (!conditions || conditions.length === 0) return null;

  const shown = conditions.slice(0, 4);
  const r = PERSON_HALF + 8;

  return (
    <g className="medical-layer" pointerEvents="none">
      {shown.map((label, i) => {
        const angle = (-Math.PI / 2) + (i * (Math.PI / 2));
        const cx = Math.cos(angle) * r;
        const cy = Math.sin(angle) * r;
        return (
          <g key={`${label}-${i}`} transform={`translate(${cx}, ${cy})`}>
            <circle
              r={6}
              fill="#fef3c7"
              stroke={STROKE_COLOR}
              strokeWidth={1}
            />
            <title>{label}</title>
          </g>
        );
      })}
    </g>
  );
}
