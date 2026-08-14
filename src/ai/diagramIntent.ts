import type {
  DiagramMode,
  EcoLinkFlow,
  EcoLinkQuality,
  EcoLinkStrength,
  EcoSystemCategory,
} from "../types/document";
import { COUPLE_TYPES } from "../types/relationshipCatalog";
import type { AiEcoLinkDraft, AiEcoSystemDraft, AiGenogramDraft } from "./types";

export interface EcomapHint {
  label: string;
  category: EcoSystemCategory;
  from: "household" | { name: string };
  strength: EcoLinkStrength;
  quality: EcoLinkQuality;
  flow: EcoLinkFlow;
  notes: string;
}

const SYSTEM_CUES: Array<{
  category: EcoSystemCategory;
  pattern: RegExp;
  label: (match: string) => string;
}> = [
  { category: "school", pattern: /幼兒園|幼稚園|國小|國中|高中|大學|學校/, label: (m) => m },
  { category: "work", pattern: /工廠|公司|職場/, label: (m) => m },
  { category: "recreation", pattern: /籃球社|足球社|社團|球隊/, label: (m) => m },
  { category: "religion", pattern: /教會|寺廟|教堂|清真寺/, label: (m) => m },
  { category: "health", pattern: /醫院|診所|心智科/, label: (m) => m },
  { category: "socialService", pattern: /家防|社福|社工|兒福/, label: (m) => m },
  { category: "legal", pattern: /法院|少年隊|警察|監護權/, label: (m) => m },
  { category: "community", pattern: /社區|里民|鄰居|里長/, label: (m) => m },
  { category: "extendedFamily", pattern: /娘家|外婆家|外公家/, label: (m) => m },
  { category: "friends", pattern: /朋友|死黨/, label: () => "朋友" },
];

const RELATIONAL =
  /支持|壓力|連結|中斷|參加|適應|互惠|疏離|資源|補助|訪視/;

function inferQuality(sentence: string): EcoLinkQuality {
  if (/不再參加|已中斷|不往來|切斷|已不再/.test(sentence)) return "cutoff";
  if (/支持但|又愛又|矛盾/.test(sentence)) return "mixed";
  if (/壓力|適應/.test(sentence)) return "stressful";
  return "supportive";
}

function inferStrength(sentence: string): EcoLinkStrength {
  if (/很好|密切|很強|很投入|關係很好/.test(sentence)) return "strong";
  if (/弱|疏離|很少|連結弱/.test(sentence)) return "weak";
  return "moderate";
}

function inferFlow(sentence: string): EcoLinkFlow {
  if (/互相|互惠/.test(sentence)) return "both";
  if (/補助|訪視|提供/.test(sentence)) return "inward";
  if (/上班|付出|投入/.test(sentence)) return "outward";
  return "none";
}

function inferNotes(sentence: string, quality: EcoLinkQuality): string {
  if (quality === "cutoff" && /不再參加/.test(sentence)) return "已不再參加";
  if (/適應/.test(sentence) && /壓力/.test(sentence)) return "適應壓力";
  return "";
}

function inferFrom(sentence: string): EcomapHint["from"] {
  if (/全家|全家人|家庭|一家/.test(sentence)) return "household";
  const before = sentence.match(
    /([\u4e00-\u9fff]{2,4})(?:上|和|與|在|去|跟)/
  );
  if (before?.[1] && !/指標|個案|妻子|丈夫|女兒|兒子/.test(before[1])) {
    return { name: before[1] };
  }
  return "household";
}

/** Pull mentioned external systems out of a case narrative. */
export function extractEcomapHints(text: string): EcomapHint[] {
  const sentences = text.split(/[。！？\n；]/);
  const hints: EcomapHint[] = [];

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (/^應出現|^應該|^expected/i.test(sentence)) continue;

    for (const cue of SYSTEM_CUES) {
      const match = sentence.match(cue.pattern);
      if (!match) continue;
      const quality = inferQuality(sentence);
      hints.push({
        label: cue.label(match[0]),
        category: cue.category,
        from: inferFrom(sentence),
        strength: inferStrength(sentence),
        quality,
        flow: inferFlow(sentence),
        notes: inferNotes(sentence, quality),
      });
      break;
    }
  }

  const seen = new Set<string>();
  return hints.filter((hint) => {
    const key = `${hint.category}:${hint.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Decide which diagram the user asked for, from the narrative itself. */
export function inferDiagramIntent(text: string): DiagramMode {
  if (/生態圖|ecomap|eco[\s-]?map/i.test(text)) return "ecomap";
  const hints = extractEcomapHints(text);
  if (hints.length >= 2) return "ecomap";
  if (hints.length >= 1 && RELATIONAL.test(text)) return "ecomap";
  return "genogram";
}

export function inferHouseholdIds(draft: AiGenogramDraft): string[] {
  const index =
    draft.persons.find((person) => person.indexPerson) ?? draft.persons[0];
  if (!index) return [];

  const ids = new Set<string>([index.id]);
  for (const rel of draft.relationships) {
    const touches = rel.from === index.id || rel.to === index.id;
    if (!touches) continue;
    const other = rel.from === index.id ? rel.to : rel.from;
    if (rel.type === "parent" || COUPLE_TYPES.has(rel.type)) {
      ids.add(other);
    }
  }

  const members = new Set(ids);
  for (const rel of draft.relationships) {
    if (rel.type !== "parent") continue;
    if (members.has(rel.from)) ids.add(rel.to);
  }
  return draft.persons.map((person) => person.id).filter((id) => ids.has(id));
}

function matchPersonId(draft: AiGenogramDraft, name: string): string | null {
  const exact = draft.persons.find((person) => person.name === name);
  if (exact) return exact.id;
  const partial = draft.persons.find(
    (person) => person.name.includes(name) || name.includes(person.name)
  );
  return partial?.id ?? null;
}

export function applyHintsToDraft(
  draft: AiGenogramDraft,
  hints: EcomapHint[]
): AiGenogramDraft {
  const ecoSystems: AiEcoSystemDraft[] = [...(draft.ecoSystems ?? [])];
  const ecoLinks: AiEcoLinkDraft[] = [...(draft.ecoLinks ?? [])];
  const existingLabels = new Set(ecoSystems.map((system) => system.label));

  hints.forEach((hint, index) => {
    if (existingLabels.has(hint.label)) return;
    const id = `s-hint-${index + 1}`;
    ecoSystems.push({
      id,
      label: hint.label,
      category: hint.category,
      notes: hint.notes,
    });
    const personId =
      hint.from === "household" ? null : matchPersonId(draft, hint.from.name);
    ecoLinks.push({
      from: personId
        ? { kind: "person", personId }
        : { kind: "household" },
      to: id,
      strength: hint.strength,
      quality: hint.quality,
      flow: hint.flow,
      notes: hint.notes,
    });
  });

  return { ...draft, ecoSystems, ecoLinks };
}

/**
 * If the user asked for an ecomap but the model only returned a family chart,
 * force ecomap mode and fill systems from the narrative.
 */
export function ensureEcomapDraft(
  draft: AiGenogramDraft,
  description: string
): { draft: AiGenogramDraft; warnings: string[] } {
  const warnings: string[] = [];
  if (inferDiagramIntent(description) !== "ecomap") {
    return { draft, warnings };
  }

  let next: AiGenogramDraft = { ...draft, diagramMode: "ecomap" };
  if (!next.householdPersonIds?.length) {
    next = { ...next, householdPersonIds: inferHouseholdIds(next) };
  }

  if ((next.ecoSystems?.length ?? 0) === 0) {
    const hints = extractEcomapHints(description);
    if (hints.length > 0) {
      next = applyHintsToDraft(next, hints);
      warnings.push("模型未抽出生態系統，已依描述補上外部系統");
    }
  }

  return { draft: next, warnings };
}