/**
 * Medical genogram markers matching standard reference charts.
 * - Monochrome: hatch / solid region / letter badges
 * - Colored: quadrant disease colors
 */

export type MedicalRegion =
  | "leftHalf"
  | "bottomHalf"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "leftAndBottom" // L-shape (drug + physical)
  | "centerDot"
  | "cross" // four quadrants (affected)
  | "verticalSplit" // suspected affected
  | "question";

export type MedicalFill =
  | { kind: "hatch" }
  | { kind: "solid"; color: string }
  | { kind: "none" };

export interface MedicalMarkerDef {
  id: string;
  label: string;
  /** zh label for UI */
  labelZh: string;
  group: "monochrome" | "colored" | "badge";
  region: MedicalRegion;
  fill: MedicalFill;
  /** Letter badge at lower-right (S / L / O). */
  badge?: string;
}

const DARK = "#4b5563";

export const MEDICAL_MARKERS: MedicalMarkerDef[] = [
  // ── Monochrome illness / substance ──────────────────────
  {
    id: "suspectedIllness",
    label: "Suspected Physical/Psychological Illness",
    labelZh: "疑似身心疾病",
    group: "monochrome",
    region: "leftHalf",
    fill: { kind: "hatch" },
  },
  {
    id: "seriousIllness",
    label: "Serious Physical/Psychological Illness",
    labelZh: "嚴重身心疾病",
    group: "monochrome",
    region: "leftHalf",
    fill: { kind: "solid", color: DARK },
  },
  {
    id: "recoveryIllness",
    label: "In Recovery from Physical/Psychological Illness",
    labelZh: "身心疾病復原中",
    group: "monochrome",
    region: "bottomLeft",
    fill: { kind: "solid", color: DARK },
  },
  {
    id: "suspectedSubstance",
    label: "Suspected Alcohol or Drug Abuse",
    labelZh: "疑似酒藥濫用",
    group: "monochrome",
    region: "bottomHalf",
    fill: { kind: "hatch" },
  },
  {
    id: "confirmedSubstance",
    label: "Confirmed Alcohol or Drug Abuse",
    labelZh: "確認酒藥濫用",
    group: "monochrome",
    region: "bottomHalf",
    fill: { kind: "solid", color: DARK },
  },
  {
    id: "recoverySubstance",
    label: "In Recovery from Drug or Alcohol Abuse",
    labelZh: "酒藥濫用復原中",
    group: "monochrome",
    region: "bottomLeft",
    fill: { kind: "solid", color: DARK },
  },
  {
    id: "substanceAndIllness",
    label: "Drug/Alcohol Abuse and Physical or Mental Problem",
    labelZh: "酒藥+身心問題",
    group: "monochrome",
    region: "leftAndBottom",
    fill: { kind: "solid", color: DARK },
  },
  {
    id: "recoveryBoth",
    label: "In Recovery from Drug/Alcohol and Physical/Mental Problem",
    labelZh: "酒藥+身心復原中",
    group: "monochrome",
    region: "bottomLeft",
    fill: { kind: "solid", color: DARK },
  },
  // ── Letter badges ───────────────────────────────────────
  {
    id: "smoker",
    label: "Smoker",
    labelZh: "吸菸 (S)",
    group: "badge",
    region: "question",
    fill: { kind: "none" },
    badge: "S",
  },
  {
    id: "languageProblem",
    label: "Language Problem",
    labelZh: "語言問題 (L)",
    group: "badge",
    region: "question",
    fill: { kind: "none" },
    badge: "L",
  },
  {
    id: "obesity",
    label: "Obesity",
    labelZh: "肥胖 (O)",
    group: "badge",
    region: "question",
    fill: { kind: "none" },
    badge: "O",
  },
  // ── Genetic / affected ──────────────────────────────────
  {
    id: "carrier",
    label: "Carrier",
    labelZh: "帶因者",
    group: "monochrome",
    region: "centerDot",
    fill: { kind: "solid", color: DARK },
  },
  {
    id: "affected",
    label: "Affected",
    labelZh: "受影響",
    group: "monochrome",
    region: "cross",
    fill: { kind: "none" },
  },
  {
    id: "suspectedAffected",
    label: "Suspected Affected",
    labelZh: "疑似受影響",
    group: "monochrome",
    region: "verticalSplit",
    fill: { kind: "none" },
  },
  {
    id: "possiblyAffected",
    label: "Possibly Affected",
    labelZh: "可能受影響 (?)",
    group: "monochrome",
    region: "question",
    fill: { kind: "none" },
  },
  // ── Colored disease quadrants ───────────────────────────
  {
    id: "heartDisease",
    label: "Heart Disease",
    labelZh: "心臟病",
    group: "colored",
    region: "topLeft",
    fill: { kind: "solid", color: "#dc2626" },
  },
  {
    id: "diabetes",
    label: "Diabetes",
    labelZh: "糖尿病",
    group: "colored",
    region: "bottomLeft",
    fill: { kind: "solid", color: "#16a34a" },
  },
  {
    id: "cancer",
    label: "Cancer",
    labelZh: "癌症",
    group: "colored",
    region: "topRight",
    fill: { kind: "solid", color: "#7c3aed" },
  },
  {
    id: "alzheimers",
    label: "Alzheimer's Disease",
    labelZh: "阿茲海默症",
    group: "colored",
    region: "topRight",
    fill: { kind: "solid", color: "#facc15" },
  },
  {
    id: "downSyndrome",
    label: "Down Syndrome",
    labelZh: "唐氏症",
    group: "colored",
    region: "bottomLeft",
    fill: { kind: "solid", color: "#1e3a8a" },
  },
  {
    id: "depression",
    label: "Depression",
    labelZh: "憂鬱症",
    group: "colored",
    region: "bottomRight",
    fill: { kind: "solid", color: "#93c5fd" },
  },
  {
    id: "anemia",
    label: "Anemia",
    labelZh: "貧血",
    group: "colored",
    region: "topLeft",
    fill: { kind: "solid", color: "#f9a8d4" },
  },
  {
    id: "asthma",
    label: "Asthma",
    labelZh: "氣喘",
    group: "colored",
    region: "bottomRight",
    fill: { kind: "solid", color: "#d6a06c" },
  },
  {
    id: "albinism",
    label: "Albinism",
    labelZh: "白化症",
    group: "colored",
    region: "topRight",
    fill: { kind: "solid", color: "#7dd3fc" },
  },
  {
    id: "autism",
    label: "Autism",
    labelZh: "自閉症",
    group: "colored",
    region: "bottomLeft",
    fill: { kind: "solid", color: "#86efac" },
  },
];

export const MEDICAL_BY_ID = new Map(
  MEDICAL_MARKERS.map((m) => [m.id, m] as const)
);

/** Resolve free-text or id to a marker definition when possible. */
export function resolveMedicalMarker(
  condition: string
): MedicalMarkerDef | null {
  const key = condition.trim();
  if (!key) return null;
  const byId = MEDICAL_BY_ID.get(key);
  if (byId) return byId;
  const lower = key.toLowerCase();
  for (const m of MEDICAL_MARKERS) {
    if (
      m.label.toLowerCase() === lower ||
      m.labelZh === key ||
      m.id.toLowerCase() === lower
    ) {
      return m;
    }
  }
  // Common Chinese / English aliases
  const aliases: Record<string, string> = {
    心臟病: "heartDisease",
    糖尿病: "diabetes",
    癌症: "cancer",
    阿茲海默: "alzheimers",
    阿茲海默症: "alzheimers",
    唐氏症: "downSyndrome",
    憂鬱: "depression",
    憂鬱症: "depression",
    貧血: "anemia",
    氣喘: "asthma",
    白化症: "albinism",
    自閉: "autism",
    自閉症: "autism",
    吸菸: "smoker",
    肥胖: "obesity",
    疾病: "seriousIllness",
    heart: "heartDisease",
    diabetes: "diabetes",
    cancer: "cancer",
  };
  const mapped = aliases[key] ?? aliases[lower];
  return mapped ? MEDICAL_BY_ID.get(mapped) ?? null : null;
}
