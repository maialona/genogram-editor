import { useCallback, useEffect, useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import type {
  CulturalMark,
  Gender,
  RelationshipType,
  Sexuality,
  SpecialPersonType,
  Transgender,
} from "../types/document";
import {
  EMOTION_REL_OPTIONS,
  FAMILY_REL_OPTIONS,
} from "../types/relationshipCatalog";
import { MEDICAL_MARKERS } from "../types/medicalCatalog";
import { useDocumentStore } from "../store/documentStore";

interface PersonSymbol {
  kind: "person";
  gender: Gender;
  label: string;
}

interface RelationshipSymbol {
  kind: "relationship";
  type: RelationshipType;
  label: string;
}

interface StatusSymbol {
  kind: "status";
  status: "deceased" | "indexPerson";
  label: string;
}

interface PersonAttrSymbol {
  kind: "personAttr";
  attr:
    | { field: "sexuality"; value: Sexuality }
    | { field: "transgender"; value: Transgender }
    | { field: "specialType"; value: SpecialPersonType }
    | { field: "culturalMark"; value: CulturalMark };
  label: string;
}

interface MedicalSymbol {
  kind: "medical";
  marker: string;
  label: string;
}

type LibraryItem =
  | PersonSymbol
  | RelationshipSymbol
  | StatusSymbol
  | PersonAttrSymbol
  | MedicalSymbol;

const PERSONS: PersonSymbol[] = [
  { kind: "person", gender: "male", label: "男性" },
  { kind: "person", gender: "female", label: "女性" },
  { kind: "person", gender: "unknown", label: "未知性別" },
];

const STATUSES: StatusSymbol[] = [
  { kind: "status", status: "deceased", label: "死亡" },
  { kind: "status", status: "indexPerson", label: "指標人物" },
];

const SPECIALS: PersonAttrSymbol[] = [
  {
    kind: "personAttr",
    attr: { field: "sexuality", value: "gay" },
    label: "男同志",
  },
  {
    kind: "personAttr",
    attr: { field: "sexuality", value: "lesbian" },
    label: "女同志",
  },
  {
    kind: "personAttr",
    attr: { field: "sexuality", value: "bisexualMale" },
    label: "雙性戀(男)",
  },
  {
    kind: "personAttr",
    attr: { field: "sexuality", value: "bisexualFemale" },
    label: "雙性戀(女)",
  },
  {
    kind: "personAttr",
    attr: { field: "transgender", value: "mtf" },
    label: "跨性(男→女)",
  },
  {
    kind: "personAttr",
    attr: { field: "transgender", value: "ftm" },
    label: "跨性(女→男)",
  },
  {
    kind: "personAttr",
    attr: { field: "specialType", value: "pregnancy" },
    label: "懷孕",
  },
  {
    kind: "personAttr",
    attr: { field: "specialType", value: "pet" },
    label: "寵物",
  },
  {
    kind: "personAttr",
    attr: { field: "specialType", value: "institution" },
    label: "機構",
  },
  {
    kind: "personAttr",
    attr: { field: "specialType", value: "miscarriage" },
    label: "流產",
  },
  {
    kind: "personAttr",
    attr: { field: "specialType", value: "abortion" },
    label: "墮胎",
  },
  {
    kind: "personAttr",
    attr: { field: "specialType", value: "stillbirth" },
    label: "死產",
  },
  {
    kind: "personAttr",
    attr: { field: "culturalMark", value: "multiCulture" },
    label: "多文化",
  },
  {
    kind: "personAttr",
    attr: { field: "culturalMark", value: "immigration" },
    label: "移民",
  },
];

const FAMILY_RELS: RelationshipSymbol[] = FAMILY_REL_OPTIONS.map((o) => ({
  kind: "relationship" as const,
  type: o.value,
  label: o.label,
}));

const EMOTION_RELS: RelationshipSymbol[] = EMOTION_REL_OPTIONS.map((o) => ({
  kind: "relationship" as const,
  type: o.value,
  label: o.label,
}));

const MEDICAL_ITEMS: MedicalSymbol[] = MEDICAL_MARKERS.map((m) => ({
  kind: "medical" as const,
  marker: m.id,
  label: m.labelZh,
}));

type SectionId =
  | "persons"
  | "statuses"
  | "specials"
  | "family"
  | "emotion"
  | "medicalMono"
  | "medicalColor";

interface SectionDef {
  id: SectionId;
  title: string;
  items: LibraryItem[];
  /** Default open to keep common tools visible; rarer groups start collapsed. */
  defaultOpen: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: "persons", title: "人物", items: PERSONS, defaultOpen: true },
  { id: "statuses", title: "人物狀態", items: STATUSES, defaultOpen: true },
  { id: "specials", title: "特殊符號", items: SPECIALS, defaultOpen: false },
  { id: "family", title: "家庭關係", items: FAMILY_RELS, defaultOpen: true },
  { id: "emotion", title: "情感關係", items: EMOTION_RELS, defaultOpen: true },
  {
    id: "medicalMono",
    title: "醫療（單色）",
    items: MEDICAL_ITEMS.filter((m) => {
      const d = MEDICAL_MARKERS.find((x) => x.id === m.marker);
      return d && (d.group === "monochrome" || d.group === "badge");
    }),
    defaultOpen: false,
  },
  {
    id: "medicalColor",
    title: "醫療（彩色）",
    items: MEDICAL_ITEMS.filter((m) => {
      const d = MEDICAL_MARKERS.find((x) => x.id === m.marker);
      return d?.group === "colored";
    }),
    defaultOpen: false,
  },
];

const SECTION_OPEN_KEY = "genogram-symbol-section-open";

function defaultOpenMap(): Record<SectionId, boolean> {
  return Object.fromEntries(
    SECTIONS.map((s) => [s.id, s.defaultOpen])
  ) as Record<SectionId, boolean>;
}

function loadOpenMap(): Record<SectionId, boolean> {
  const base = defaultOpenMap();
  try {
    const raw = localStorage.getItem(SECTION_OPEN_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
    for (const s of SECTIONS) {
      if (typeof parsed[s.id] === "boolean") base[s.id] = parsed[s.id]!;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return base;
}

function itemKey(item: LibraryItem): string {
  if (item.kind === "person") return item.gender;
  if (item.kind === "relationship") return item.type;
  if (item.kind === "status") return item.status;
  if (item.kind === "medical") return item.marker;
  return `${item.attr.field}-${item.attr.value}`;
}

function itemActionHint(item: LibraryItem): string {
  if (item.kind === "person") return "拖曳至畫布";
  if (item.kind === "relationship") return "點擊後選擇兩人物建立關係";
  return "套用至目前選取的人物（再點一次取消）";
}

/**
 * Theme-aware monochrome ink.
 * Use currentColor for stroke/ink so dark UI color on .symbol-icon always applies
 * (SVG presentation attributes + CSS var() can fail and fall back to black).
 */
const SYM = {
  stroke: "currentColor",
  fill: "var(--sym-fill, #fff)",
  ink: "currentColor",
} as const;

function MiniPerson({ gender }: { gender: Gender }) {
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

/** Mini preview icons — must visually match canvas RelationshipRenderer styles. */
function MiniRel({ type }: { type: RelationshipType }) {
  const BLACK = SYM.stroke;
  const FILL = SYM.fill;
  const GREEN = "#16a34a";
  const RED = "#dc2626";
  const BLUE = "#2563eb";
  const PINK = "#e11d48";

  // Reusable path snippets (viewBox 0 0 36 20)
  const waveFull = "M2 10 Q6 4 10 10 T18 10 T26 10 T34 10";
  const waveMid = "M12 10 Q15 5 18 10 T24 10"; // short wave in middle
  const zigzagRed =
    "M2 10 L6 4 L10 16 L14 4 L18 16 L22 4 L26 16 L30 4 L34 10";
  const zigzagBlue =
    "M2 10 L6 5 L10 15 L14 5 L18 15 L22 5 L26 15 L30 5 L34 10";

  const icon: Record<RelationshipType, React.ReactNode> = {
    marriage: <line x1={2} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />,
    engagement: (
      <line
        x1={2}
        y1={10}
        x2={34}
        y2={10}
        stroke={BLACK}
        strokeWidth={2}
        strokeDasharray="2 2"
      />
    ),
    divorce: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />
        <line x1={14} y1={4} x2={22} y2={16} stroke={BLACK} strokeWidth={2} />
        <line x1={18} y1={4} x2={26} y2={16} stroke={BLACK} strokeWidth={2} />
      </>
    ),
    separation: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />
        <line x1={18} y1={4} x2={18} y2={16} stroke={BLACK} strokeWidth={2} />
      </>
    ),
    separationInFact: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />
        <line x1={15} y1={4} x2={23} y2={16} stroke={BLACK} strokeWidth={2} />
      </>
    ),
    widowed: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />
        <line x1={14} y1={5} x2={22} y2={15} stroke={BLACK} strokeWidth={2} />
        <line x1={22} y1={5} x2={14} y2={15} stroke={BLACK} strokeWidth={2} />
      </>
    ),
    cohabitation: (
      <>
        <line
          x1={2}
          y1={10}
          x2={14}
          y2={10}
          stroke={BLACK}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <line
          x1={22}
          y1={10}
          x2={34}
          y2={10}
          stroke={BLACK}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <path
          d="M16 11 L18 7 L20 11 Z"
          fill="none"
          stroke={BLACK}
          strokeWidth={1.5}
        />
        <rect
          x={16}
          y={11}
          width={4}
          height={3}
          fill="none"
          stroke={BLACK}
          strokeWidth={1.5}
        />
      </>
    ),
    legalCohabitation: (
      <>
        <line x1={2} y1={10} x2={14} y2={10} stroke={BLACK} strokeWidth={2} />
        <line x1={22} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />
        <path
          d="M16 11 L18 7 L20 11 Z"
          fill="none"
          stroke={BLACK}
          strokeWidth={1.5}
        />
        <rect
          x={16}
          y={11}
          width={4}
          height={3}
          fill="none"
          stroke={BLACK}
          strokeWidth={1.5}
        />
      </>
    ),
    engagementCohabitation: (
      <>
        <line
          x1={2}
          y1={10}
          x2={14}
          y2={10}
          stroke={BLACK}
          strokeWidth={2}
          strokeDasharray="2 2"
        />
        <line
          x1={22}
          y1={10}
          x2={34}
          y2={10}
          stroke={BLACK}
          strokeWidth={2}
          strokeDasharray="2 2"
        />
        <path
          d="M16 11 L18 7 L20 11 Z"
          fill="none"
          stroke={BLACK}
          strokeWidth={1.5}
        />
        <rect
          x={16}
          y={11}
          width={4}
          height={3}
          fill="none"
          stroke={BLACK}
          strokeWidth={1.5}
        />
      </>
    ),
    engagementSeparation: (
      <>
        <line
          x1={2}
          y1={10}
          x2={34}
          y2={10}
          stroke={BLACK}
          strokeWidth={2}
          strokeDasharray="2 2"
        />
        <line x1={15} y1={4} x2={23} y2={16} stroke={BLACK} strokeWidth={2} />
      </>
    ),
    loveAffair: (
      <line
        x1={2}
        y1={10}
        x2={34}
        y2={10}
        stroke={PINK}
        strokeWidth={2}
        strokeDasharray="4 3"
      />
    ),
    parent: (
      <>
        <line x1={18} y1={2} x2={18} y2={18} stroke={BLACK} strokeWidth={2} />
        <line x1={10} y1={18} x2={26} y2={18} stroke={BLACK} strokeWidth={2} />
      </>
    ),
    // ── Emotional (match canvas) ──────────────────────────
    harmony: <line x1={2} y1={10} x2={34} y2={10} stroke={GREEN} strokeWidth={2} />,
    indifferent: (
      <line
        x1={2}
        y1={10}
        x2={34}
        y2={10}
        stroke={RED}
        strokeWidth={2}
        strokeDasharray="1 3"
      />
    ),
    love: (
      <>
        <line x1={2} y1={10} x2={14} y2={10} stroke={GREEN} strokeWidth={2} />
        <circle cx={18} cy={10} r={3} fill={FILL} stroke={GREEN} strokeWidth={2} />
        <line x1={22} y1={10} x2={34} y2={10} stroke={GREEN} strokeWidth={2} />
      </>
    ),
    inLove: (
      <>
        <line x1={2} y1={10} x2={12} y2={10} stroke={GREEN} strokeWidth={2} />
        <circle cx={18} cy={10} r={4.5} fill="none" stroke={GREEN} strokeWidth={1.5} />
        <circle cx={18} cy={10} r={2} fill="none" stroke={GREEN} strokeWidth={1.5} />
        <line x1={24} y1={10} x2={34} y2={10} stroke={GREEN} strokeWidth={2} />
      </>
    ),
    close: (
      <>
        <line x1={2} y1={7} x2={34} y2={7} stroke={GREEN} strokeWidth={2} />
        <line x1={2} y1={13} x2={34} y2={13} stroke={GREEN} strokeWidth={2} />
      </>
    ),
    veryClose: (
      <>
        <line x1={2} y1={5} x2={34} y2={5} stroke={GREEN} strokeWidth={2} />
        <line x1={2} y1={10} x2={34} y2={10} stroke={GREEN} strokeWidth={2} />
        <line x1={2} y1={15} x2={34} y2={15} stroke={GREEN} strokeWidth={2} />
      </>
    ),
    conflict: (
      <>
        <line
          x1={2}
          y1={7}
          x2={34}
          y2={7}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <line
          x1={2}
          y1={13}
          x2={34}
          y2={13}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      </>
    ),
    hate: (
      <>
        <line
          x1={2}
          y1={5}
          x2={34}
          y2={5}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="3 2"
        />
        <line
          x1={2}
          y1={10}
          x2={34}
          y2={10}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="3 2"
        />
        <line
          x1={2}
          y1={15}
          x2={34}
          y2={15}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      </>
    ),
    cutoff: (
      <>
        <line
          x1={2}
          y1={10}
          x2={14}
          y2={10}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <line
          x1={22}
          y1={10}
          x2={34}
          y2={10}
          stroke={RED}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <line x1={16} y1={5} x2={16} y2={15} stroke={RED} strokeWidth={2} />
        <line x1={20} y1={5} x2={20} y2={15} stroke={RED} strokeWidth={2} />
      </>
    ),
    // 敵對：整條紅波浪
    hostile: (
      <path d={waveFull} fill="none" stroke={RED} strokeWidth={2} />
    ),
    // 遠距敵對：實線 + 中段小波浪
    distantHostile: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={RED} strokeWidth={2} />
        <path d={waveMid} fill="none" stroke={RED} strokeWidth={2} />
      </>
    ),
    // 近距敵對：雙實線 + 波浪
    closeHostile: (
      <>
        <line x1={2} y1={6} x2={34} y2={6} stroke={RED} strokeWidth={1.5} />
        <line x1={2} y1={14} x2={34} y2={14} stroke={RED} strokeWidth={1.5} />
        <path d={waveFull} fill="none" stroke={RED} strokeWidth={1.5} />
      </>
    ),
    // 融合敵對：三實線 + 波浪
    fusedHostile: (
      <>
        <line x1={2} y1={5} x2={34} y2={5} stroke={RED} strokeWidth={1.5} />
        <line x1={2} y1={10} x2={34} y2={10} stroke={RED} strokeWidth={1.5} />
        <line x1={2} y1={15} x2={34} y2={15} stroke={RED} strokeWidth={1.5} />
        <path d={waveFull} fill="none" stroke={RED} strokeWidth={1.5} />
      </>
    ),
    // 暴力：尖銳鋸齒
    violence: (
      <path d={zigzagRed} fill="none" stroke={RED} strokeWidth={2.2} strokeLinejoin="miter" />
    ),
    // 虐待：藍波浪
    abuse: (
      <path d={waveFull} fill="none" stroke={BLUE} strokeWidth={2} />
    ),
    // 肢體虐待：藍實線 + 波浪
    physicalAbuse: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={BLUE} strokeWidth={2} />
        <path d={waveFull} fill="none" stroke={BLUE} strokeWidth={1.5} />
      </>
    ),
    // 情感虐待：雙藍線 + 波浪
    emotionalAbuse: (
      <>
        <line x1={2} y1={6} x2={34} y2={6} stroke={BLUE} strokeWidth={1.5} />
        <line x1={2} y1={14} x2={34} y2={14} stroke={BLUE} strokeWidth={1.5} />
        <path d={waveFull} fill="none" stroke={BLUE} strokeWidth={1.5} />
      </>
    ),
    // 性虐待：藍鋸齒
    sexualAbuse: (
      <path d={zigzagBlue} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="miter" />
    ),
    // 忽視：藍箭頭
    neglect: (
      <>
        <line x1={2} y1={10} x2={27} y2={10} stroke={BLUE} strokeWidth={2} />
        <path d="M26 5 L34 10 L26 15 Z" fill={BLUE} />
      </>
    ),
    // 操控：紅線 + X
    manipulative: (
      <>
        <line x1={2} y1={10} x2={34} y2={10} stroke={RED} strokeWidth={2} />
        <line x1={14} y1={5} x2={22} y2={15} stroke={RED} strokeWidth={2} />
        <line x1={22} y1={5} x2={14} y2={15} stroke={RED} strokeWidth={2} />
      </>
    ),
    // 控制：紅線 + 方框X + 箭頭
    controlling: (
      <>
        <line x1={2} y1={10} x2={12} y2={10} stroke={RED} strokeWidth={2} />
        <rect
          x={12}
          y={5}
          width={10}
          height={10}
          fill={FILL}
          stroke={RED}
          strokeWidth={1.5}
        />
        <line x1={14} y1={7} x2={20} y2={13} stroke={RED} strokeWidth={1.5} />
        <line x1={20} y1={7} x2={14} y2={13} stroke={RED} strokeWidth={1.5} />
        <line x1={22} y1={10} x2={27} y2={10} stroke={RED} strokeWidth={2} />
        <path d="M26 5 L34 10 L26 15 Z" fill={RED} />
      </>
    ),
    // 關注：黑箭頭
    focusedOn: (
      <>
        <line x1={2} y1={10} x2={27} y2={10} stroke={BLACK} strokeWidth={2} />
        <path d="M26 5 L34 10 L26 15 Z" fill={BLACK} />
      </>
    ),
    // 仰慕：黑線 + 圓 + 箭頭
    fanAdmire: (
      <>
        <line x1={2} y1={10} x2={13} y2={10} stroke={BLACK} strokeWidth={2} />
        <circle
          cx={18}
          cy={10}
          r={3.5}
          fill={FILL}
          stroke={BLACK}
          strokeWidth={1.5}
        />
        <line x1={22} y1={10} x2={27} y2={10} stroke={BLACK} strokeWidth={2} />
        <path d="M26 5 L34 10 L26 15 Z" fill={BLACK} />
      </>
    ),
  };

  return (
    <svg width={36} height={20} viewBox="0 0 36 20">
      {icon[type] ?? (
        <line x1={2} y1={10} x2={34} y2={10} stroke={BLACK} strokeWidth={2} />
      )}
    </svg>
  );
}

function MiniStatus({ status }: { status: "deceased" | "indexPerson" }) {
  if (status === "deceased") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <rect
          x={-10}
          y={-10}
          width={20}
          height={20}
          fill={SYM.fill}
          stroke={SYM.stroke}
          strokeWidth={2}
        />
        <line
          x1={-7}
          y1={-7}
          x2={7}
          y2={7}
          stroke={SYM.stroke}
          strokeWidth={2}
        />
        <line
          x1={7}
          y1={-7}
          x2={-7}
          y2={7}
          stroke={SYM.stroke}
          strokeWidth={2}
        />
      </svg>
    );
  }
  return (
    <svg width={28} height={28} viewBox="-14 -14 28 28">
      <rect
        x={-12}
        y={-12}
        width={24}
        height={24}
        fill="none"
        stroke={SYM.stroke}
        strokeWidth={2}
      />
      <rect
        x={-8}
        y={-8}
        width={16}
        height={16}
        fill={SYM.fill}
        stroke={SYM.stroke}
        strokeWidth={2}
      />
    </svg>
  );
}

function MiniAttr({ item }: { item: PersonAttrSymbol }) {
  const a = item.attr;
  if (a.field === "sexuality") {
    const dashed =
      a.value === "bisexualMale" || a.value === "bisexualFemale";
    const isMale = a.value === "gay" || a.value === "bisexualMale";
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        {isMale ? (
          <rect
            x={-10}
            y={-10}
            width={20}
            height={20}
            fill={SYM.fill}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
        ) : (
          <circle r={10} fill={SYM.fill} stroke={SYM.stroke} strokeWidth={2} />
        )}
        <path
          d="M0 6 L6 -4 L-6 -4 Z"
          fill="none"
          stroke={SYM.stroke}
          strokeWidth={1.5}
          strokeDasharray={dashed ? "2 1.5" : undefined}
        />
      </svg>
    );
  }
  if (a.field === "transgender") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        {a.value === "mtf" ? (
          <>
            <rect
              x={-10}
              y={-10}
              width={20}
              height={20}
              fill={SYM.fill}
              stroke={SYM.stroke}
              strokeWidth={2}
            />
            <circle r={6} fill="none" stroke={SYM.stroke} strokeWidth={1.5} />
          </>
        ) : (
          <>
            <circle r={10} fill={SYM.fill} stroke={SYM.stroke} strokeWidth={2} />
            <rect
              x={-5}
              y={-5}
              width={10}
              height={10}
              fill="none"
              stroke={SYM.stroke}
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>
    );
  }
  if (a.field === "specialType") {
    if (a.value === "pregnancy") {
      return (
        <svg width={28} height={28} viewBox="-14 -14 28 28">
          <path
            d="M0 -10 L10 10 L-10 10 Z"
            fill={SYM.fill}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
        </svg>
      );
    }
    if (a.value === "pet") {
      return (
        <svg width={28} height={28} viewBox="-14 -14 28 28">
          <path
            d="M0 -10 L10 0 L0 10 L-10 0 Z"
            fill={SYM.fill}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
        </svg>
      );
    }
    if (a.value === "institution") {
      return (
        <svg width={28} height={28} viewBox="-14 -14 28 28">
          <path
            d="M-8 0 L0 -10 L8 0"
            fill="none"
            stroke={SYM.stroke}
            strokeWidth={2}
          />
          <rect
            x={-8}
            y={0}
            width={16}
            height={10}
            fill={SYM.fill}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
        </svg>
      );
    }
    if (a.value === "miscarriage" || a.value === "abortion") {
      return (
        <svg width={28} height={28} viewBox="-14 -14 28 28">
          <line
            x1={-8}
            y1={-8}
            x2={8}
            y2={8}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
          <line
            x1={8}
            y1={-8}
            x2={-8}
            y2={8}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
          {a.value === "abortion" && (
            <line
              x1={-7}
              y1={0}
              x2={7}
              y2={0}
              stroke={SYM.stroke}
              strokeWidth={2}
            />
          )}
        </svg>
      );
    }
    if (a.value === "stillbirth") {
      return (
        <svg width={28} height={28} viewBox="-14 -14 28 28">
          <path
            d="M0 -10 L10 10 L-10 10 Z"
            fill={SYM.fill}
            stroke={SYM.stroke}
            strokeWidth={2}
          />
          <line
            x1={-5}
            y1={-2}
            x2={5}
            y2={6}
            stroke={SYM.stroke}
            strokeWidth={1.5}
          />
          <line
            x1={5}
            y1={-2}
            x2={-5}
            y2={6}
            stroke={SYM.stroke}
            strokeWidth={1.5}
          />
        </svg>
      );
    }
  }
  if (a.field === "culturalMark") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <rect
          x={-8}
          y={2}
          width={16}
          height={10}
          fill={SYM.fill}
          stroke={SYM.stroke}
          strokeWidth={1.5}
        />
        <path
          d={
            a.value === "multiCulture"
              ? "M0 2 L0 -4 C-4 -6 4 -8 -2 -12"
              : "M0 2 L0 -6 C-5 -8 5 -10 -2 -12 C-5 -13 -4 -10 -2 -9"
          }
          fill="none"
          stroke={SYM.stroke}
          strokeWidth={1.5}
        />
      </svg>
    );
  }
  return null;
}

function MiniMedical({ marker }: { marker: string }) {
  const def = MEDICAL_MARKERS.find((m) => m.id === marker);
  if (!def) return null;
  const color =
    def.fill.kind === "solid"
      ? def.fill.color
      : def.fill.kind === "hatch"
        ? "var(--sym-hatch, #9ca3af)"
        : SYM.fill;
  return (
    <svg width={28} height={28} viewBox="-14 -14 28 28">
      <rect
        x={-10}
        y={-10}
        width={20}
        height={20}
        fill={SYM.fill}
        stroke={SYM.stroke}
        strokeWidth={1.5}
      />
      {def.badge ? (
        <text x={6} y={10} fontSize={10} fontWeight={700} fill={SYM.ink}>
          {def.badge}
        </text>
      ) : def.region === "question" ? (
        <text
          x={0}
          y={5}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={SYM.ink}
        >
          ?
        </text>
      ) : def.region === "centerDot" ? (
        <circle r={4} fill="var(--sym-dot, #4b5563)" />
      ) : def.region === "cross" ? (
        <>
          <line
            x1={0}
            y1={-10}
            x2={0}
            y2={10}
            stroke={SYM.stroke}
            strokeWidth={1.5}
          />
          <line
            x1={-10}
            y1={0}
            x2={10}
            y2={0}
            stroke={SYM.stroke}
            strokeWidth={1.5}
          />
        </>
      ) : def.region === "verticalSplit" ? (
        <line
          x1={0}
          y1={-10}
          x2={0}
          y2={10}
          stroke={SYM.stroke}
          strokeWidth={1.5}
        />
      ) : (
        <rect
          x={def.region.includes("Right") ? 0 : -10}
          y={
            def.region === "bottomHalf" ||
            def.region.includes("bottom") ||
            def.region === "leftAndBottom"
              ? 0
              : -10
          }
          width={
            def.region === "leftHalf" ||
            def.region.includes("Left") ||
            def.region === "leftAndBottom"
              ? 10
              : def.region === "bottomHalf"
                ? 20
                : 10
          }
          height={
            def.region === "leftHalf"
              ? 20
              : def.region === "bottomHalf" || def.region.includes("bottom")
                ? 10
                : 10
          }
          fill={color}
          opacity={def.fill.kind === "hatch" ? 0.5 : 1}
        />
      )}
    </svg>
  );
}

export function SymbolLibrary() {
  const setPendingRelationshipType = useDocumentStore(
    (s) => s.setPendingRelationshipType
  );
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const document = useDocumentStore((s) => s.document);
  const updatePerson = useDocumentStore((s) => s.updatePerson);
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const pendingRelationshipType = useDocumentStore(
    (s) => s.pendingRelationshipType
  );

  const headingId = useId();
  const [openMap, setOpenMap] = useState<Record<SectionId, boolean>>(loadOpenMap);

  useEffect(() => {
    try {
      localStorage.setItem(SECTION_OPEN_KEY, JSON.stringify(openMap));
    } catch {
      /* quota / private mode */
    }
  }, [openMap]);

  const toggleSection = useCallback((id: SectionId) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectedPersonId = selectedIds.find((id) =>
    document.persons.some((p) => p.id === id)
  );

  const onDragStart = (e: React.DragEvent, item: LibraryItem) => {
    if (item.kind !== "person") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(
      "application/genogram-symbol",
      JSON.stringify({ kind: "person", gender: item.gender })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const onClickItem = (item: LibraryItem) => {
    if (item.kind === "relationship") {
      setPendingRelationshipType(item.type);
      return;
    }
    if (!selectedPersonId) return;

    if (item.kind === "status") {
      if (item.status === "deceased") {
        updatePerson(selectedPersonId, { deceased: true });
      } else {
        updatePerson(selectedPersonId, { indexPerson: true });
      }
      return;
    }

    if (item.kind === "personAttr") {
      const { field, value } = item.attr;
      const person = document.persons.find((p) => p.id === selectedPersonId);
      if (!person) return;

      if (field === "sexuality") {
        const genderPatch: Partial<typeof person> = {
          sexuality: value as Sexuality,
          transgender: "none",
          specialType: "none",
        };
        if (value === "gay" || value === "bisexualMale") genderPatch.gender = "male";
        if (value === "lesbian" || value === "bisexualFemale")
          genderPatch.gender = "female";
        if (person.sexuality === value) {
          updatePerson(selectedPersonId, { sexuality: "none" });
        } else {
          updatePerson(selectedPersonId, genderPatch);
        }
        return;
      }
      if (field === "transgender") {
        if (person.transgender === value) {
          updatePerson(selectedPersonId, { transgender: "none" });
        } else {
          updatePerson(selectedPersonId, {
            transgender: value as Transgender,
            sexuality: "none",
            specialType: "none",
            gender: value === "mtf" ? "male" : "female",
          });
        }
        return;
      }
      if (field === "specialType") {
        if (person.specialType === value) {
          updatePerson(selectedPersonId, { specialType: "none" });
        } else {
          updatePerson(selectedPersonId, {
            specialType: value as SpecialPersonType,
            sexuality: "none",
            transgender: "none",
          });
        }
        return;
      }
      if (field === "culturalMark") {
        if (person.culturalMark === value) {
          updatePerson(selectedPersonId, { culturalMark: "none" });
        } else {
          updatePerson(selectedPersonId, {
            culturalMark: value as CulturalMark,
          });
        }
      }
      return;
    }

    if (item.kind === "medical") {
      const person = document.persons.find((p) => p.id === selectedPersonId);
      if (!person) return;
      const has = person.medicalConditions.includes(item.marker);
      const medicalConditions = has
        ? person.medicalConditions.filter((c) => c !== item.marker)
        : [...person.medicalConditions, item.marker];
      updatePerson(selectedPersonId, { medicalConditions });
    }
  };

  const renderItem = (item: LibraryItem) => {
    const key = itemKey(item);
    const active =
      item.kind === "relationship" &&
      interactionMode === "connect" &&
      pendingRelationshipType === item.type;

    let applied = false;
    if (selectedPersonId) {
      const p = document.persons.find((x) => x.id === selectedPersonId);
      if (p) {
        if (item.kind === "status") {
          applied =
            item.status === "deceased" ? p.deceased : p.indexPerson;
        } else if (item.kind === "personAttr") {
          const { field, value } = item.attr;
          applied = p[field] === value;
        } else if (item.kind === "medical") {
          applied = p.medicalConditions.includes(item.marker);
        }
      }
    }

    const pressed = active || applied;
    const hint = itemActionHint(item);
    const ariaLabel = pressed
      ? `${item.label}，已套用。${hint}`
      : `${item.label}。${hint}`;
    const isDraggable = item.kind === "person";

    return (
      <button
        key={key}
        type="button"
        className={`symbol-item${pressed ? " is-active" : ""}${
          isDraggable ? " is-draggable" : ""
        }`}
        data-kind={item.kind}
        draggable={isDraggable}
        onDragStart={(e) => onDragStart(e, item)}
        onClick={() => onClickItem(item)}
        title={hint}
        aria-label={ariaLabel}
        aria-pressed={
          item.kind === "person" ? undefined : pressed ? true : false
        }
      >
        <span className="symbol-icon" aria-hidden="true">
          {item.kind === "person" && <MiniPerson gender={item.gender} />}
          {item.kind === "relationship" && <MiniRel type={item.type} />}
          {item.kind === "status" && <MiniStatus status={item.status} />}
          {item.kind === "personAttr" && <MiniAttr item={item} />}
          {item.kind === "medical" && <MiniMedical marker={item.marker} />}
        </span>
        <span className="symbol-label">{item.label}</span>
      </button>
    );
  };

  const renderSection = (section: SectionDef) => {
    const panelId = `symbol-section-${section.id}`;
    const open = openMap[section.id];

    const lightIcons = section.id === "medicalColor";

    return (
      <section
        className={`symbol-section${open ? " is-open" : ""}${
          lightIcons ? " is-light-icons" : ""
        }`}
        key={section.id}
      >
        <h3 className="symbol-section-heading">
          <button
            type="button"
            className="symbol-section-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => toggleSection(section.id)}
          >
            <span className="symbol-section-chevron" aria-hidden="true">
              <ChevronRight size={14} strokeWidth={2.25} />
            </span>
            <span className="symbol-section-title-text">{section.title}</span>
            <span className="symbol-section-count" aria-hidden="true">
              {section.items.length}
            </span>
          </button>
        </h3>
        <div
          id={panelId}
          className="symbol-section-panel"
          role="group"
          aria-label={section.title}
          hidden={!open}
        >
          <div className="symbol-grid">{section.items.map(renderItem)}</div>
        </div>
      </section>
    );
  };

  return (
    <aside
      className="float-panel symbol-library"
      aria-labelledby={headingId}
    >
      <header className="panel-header symbol-library-header">
        <h2 id={headingId}>符號庫</h2>
        <p className="symbol-library-sub">拖曳人物 · 點擊套用屬性</p>
      </header>
      <div className="symbol-library-body">
        {SECTIONS.map(renderSection)}
      </div>
    </aside>
  );
}
