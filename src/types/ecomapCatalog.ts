import type {
  EcoLinkFlow,
  EcoLinkQuality,
  EcoLinkStrength,
  EcoSystemCategory,
  RelationshipType,
} from "./document";

/** Reserved selectable id for the household circle endpoint. */
export const HOUSEHOLD_ID = "household";

export const ECO_SYSTEM_LABELS: Record<EcoSystemCategory, string> = {
  school: "學校／教育",
  work: "職場／工作",
  religion: "宗教場所",
  friends: "朋友",
  health: "醫療／心理健康",
  socialService: "社福機構",
  recreation: "休閒／社團",
  legal: "司法／執法",
  community: "鄰居／社區",
  extendedFamily: "擴展家庭",
  custom: "自訂系統",
};

export const ECO_SYSTEM_PRESETS: {
  category: EcoSystemCategory;
  label: string;
}[] = (
  Object.keys(ECO_SYSTEM_LABELS) as EcoSystemCategory[]
).map((category) => ({
  category,
  label: ECO_SYSTEM_LABELS[category],
}));

/** Family ties the ecomap view actually draws inside the household circle. */
export const ECO_FAMILY_REL_OPTIONS: {
  value: Extract<
    RelationshipType,
    "marriage" | "parent" | "adoptiveParent" | "twin"
  >;
  label: string;
}[] = [
  { value: "marriage", label: "婚姻" },
  { value: "parent", label: "親子" },
  { value: "adoptiveParent", label: "收養親子" },
  { value: "twin", label: "雙胞胎" },
];

export const ECO_FAMILY_REL_TYPES = new Set<RelationshipType>(
  ECO_FAMILY_REL_OPTIONS.map((o) => o.value)
);

export const ECO_STRENGTH_OPTIONS: {
  value: EcoLinkStrength;
  label: string;
  detail: string;
}[] = [
  { value: "strong", label: "強", detail: "粗實線" },
  { value: "moderate", label: "中", detail: "一般實線" },
  { value: "weak", label: "弱", detail: "細虛線" },
];

export const ECO_QUALITY_OPTIONS: {
  value: EcoLinkQuality;
  label: string;
  detail: string;
}[] = [
  { value: "supportive", label: "支持", detail: "直線" },
  { value: "stressful", label: "壓力", detail: "鋸齒線" },
  { value: "mixed", label: "強但有壓力", detail: "直線＋斜線" },
  { value: "cutoff", label: "已中斷", detail: "線上打叉" },
];

export const ECO_FLOW_OPTIONS: {
  value: EcoLinkFlow;
  label: string;
  detail: string;
}[] = [
  { value: "none", label: "無流向", detail: "無箭頭" },
  { value: "inward", label: "流入家庭", detail: "箭頭指向人／家庭圈" },
  { value: "outward", label: "流出家庭", detail: "箭頭指向系統" },
  { value: "both", label: "互惠", detail: "雙向箭頭" },
];

export const ECO_STRENGTH_LABELS: Record<EcoLinkStrength, string> =
  Object.fromEntries(
    ECO_STRENGTH_OPTIONS.map((o) => [o.value, o.label])
  ) as Record<EcoLinkStrength, string>;

export const ECO_QUALITY_LABELS: Record<EcoLinkQuality, string> =
  Object.fromEntries(
    ECO_QUALITY_OPTIONS.map((o) => [o.value, o.label])
  ) as Record<EcoLinkQuality, string>;

export const ECO_FLOW_LABELS: Record<EcoLinkFlow, string> = Object.fromEntries(
  ECO_FLOW_OPTIONS.map((o) => [o.value, o.label])
) as Record<EcoLinkFlow, string>;
