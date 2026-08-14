import type {
  DiagramMode,
  EcoLinkFlow,
  EcoLinkQuality,
  EcoLinkStrength,
  EcoSystemCategory,
  Gender,
  RelationshipType,
} from "../types/document";
import { ECO_SYSTEM_LABELS } from "../types/ecomapCatalog";
import {
  COUPLE_TYPES,
  RELATIONSHIP_LABELS,
} from "../types/relationshipCatalog";
import type {
  AiEcoLinkDraft,
  AiEcoLinkFromDraft,
  AiEcoSystemDraft,
  AiGenogramDraft,
  AiPersonDraft,
  AiRelationshipDraft,
} from "./types";
import { AiClientError } from "./types";

const VALID_RELS = new Set(Object.keys(RELATIONSHIP_LABELS));

const COUPLE_STATE_PRIORITY: Partial<Record<RelationshipType, number>> = {
  divorce: 100,
  widowed: 90,
  separation: 80,
  separationInFact: 70,
  engagementSeparation: 60,
  marriage: 50,
  legalCohabitation: 45,
  cohabitation: 40,
  engagementCohabitation: 35,
  engagement: 30,
  loveAffair: 20,
};

const REL_ALIASES: Record<string, RelationshipType> = {
  married: "marriage",
  marry: "marriage",
  spouse: "marriage",
  husband_wife: "marriage",
  divorced: "divorce",
  separated: "separation",
  cohabiting: "cohabitation",
  partner: "cohabitation",
  child: "parent",
  children: "parent",
  father: "parent",
  mother: "parent",
  son: "parent",
  daughter: "parent",
  婚姻: "marriage",
  結婚: "marriage",
  離婚: "divorce",
  分居: "separation",
  同居: "cohabitation",
  親子: "parent",
  父母: "parent",
};

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      return JSON.parse(fence[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new AiClientError("parse", "無法從模型回覆解析 JSON");
  }
}

function asGender(v: unknown): Gender {
  if (v === "male" || v === "female" || v === "unknown") return v;
  if (v === "m" || v === "男" || v === "男性") return "male";
  if (v === "f" || v === "女" || v === "女性") return "female";
  return "unknown";
}

function asRelType(
  v: unknown,
  warnings: string[]
): RelationshipType | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const key = v.trim();
  if (VALID_RELS.has(key)) return key as RelationshipType;
  const lower = key.toLowerCase();
  if (VALID_RELS.has(lower)) return lower as RelationshipType;
  const alias = REL_ALIASES[key] ?? REL_ALIASES[lower];
  if (alias) {
    warnings.push(`關係類型「${key}」已對應為 ${alias}`);
    return alias;
  }
  warnings.push(`略過不支援的關係類型「${key}」`);
  return null;
}

const VALID_CATEGORIES = new Set<string>(Object.keys(ECO_SYSTEM_LABELS));

const CATEGORY_ALIASES: Record<string, EcoSystemCategory> = {
  school: "school",
  education: "school",
  kindergarten: "school",
  學校: "school",
  教育: "school",
  "學校／教育": "school",
  幼兒園: "school",
  幼稚園: "school",
  work: "work",
  job: "work",
  workplace: "work",
  職場: "work",
  工作: "work",
  工廠: "work",
  "職場／工作": "work",
  religion: "religion",
  church: "religion",
  temple: "religion",
  宗教: "religion",
  教會: "religion",
  寺廟: "religion",
  宗教場所: "religion",
  friends: "friends",
  friend: "friends",
  peers: "friends",
  朋友: "friends",
  health: "health",
  hospital: "health",
  medical: "health",
  醫療: "health",
  醫院: "health",
  心理: "health",
  "醫療／心理健康": "health",
  socialservice: "socialService",
  "social service": "socialService",
  welfare: "socialService",
  社福: "socialService",
  社工: "socialService",
  社福機構: "socialService",
  recreation: "recreation",
  leisure: "recreation",
  club: "recreation",
  休閒: "recreation",
  社團: "recreation",
  "休閒／社團": "recreation",
  legal: "legal",
  court: "legal",
  police: "legal",
  司法: "legal",
  法院: "legal",
  警察: "legal",
  "司法／執法": "legal",
  community: "community",
  neighbor: "community",
  neighbors: "community",
  鄰居: "community",
  社區: "community",
  "鄰居／社區": "community",
  extendedfamily: "extendedFamily",
  "extended family": "extendedFamily",
  relatives: "extendedFamily",
  擴展家庭: "extendedFamily",
  親戚: "extendedFamily",
  娘家: "extendedFamily",
  custom: "custom",
  自訂: "custom",
  自訂系統: "custom",
};

const STRENGTH_ALIASES: Record<string, EcoLinkStrength> = {
  strong: "strong",
  強: "strong",
  粗: "strong",
  粗實線: "strong",
  moderate: "moderate",
  中: "moderate",
  普通: "moderate",
  一般: "moderate",
  weak: "weak",
  弱: "weak",
  細: "weak",
  虛線: "weak",
};

const QUALITY_ALIASES: Record<string, EcoLinkQuality> = {
  supportive: "supportive",
  支持: "supportive",
  正向: "supportive",
  stressful: "stressful",
  壓力: "stressful",
  衝突: "stressful",
  負向: "stressful",
  mixed: "mixed",
  強但有壓力: "mixed",
  矛盾: "mixed",
  愛恨: "mixed",
  cutoff: "cutoff",
  已中斷: "cutoff",
  中斷: "cutoff",
  切斷: "cutoff",
};

const FLOW_ALIASES: Record<string, EcoLinkFlow> = {
  none: "none",
  無: "none",
  無流向: "none",
  inward: "inward",
  流入: "inward",
  流入家庭: "inward",
  outward: "outward",
  流出: "outward",
  流出家庭: "outward",
  both: "both",
  互惠: "both",
  雙向: "both",
};

const HOUSEHOLD_ALIASES = new Set([
  "household",
  "family",
  "家庭",
  "家庭圈",
  "核心家庭",
]);

function asOptionalNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function lookupAlias<T extends string>(
  v: unknown,
  aliases: Record<string, T>
): T | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const key = v.trim();
  if (aliases[key]) return aliases[key];
  const lower = key.toLowerCase();
  return aliases[lower] ?? null;
}

function asCategory(
  v: unknown,
  warnings: string[]
): EcoSystemCategory {
  if (typeof v === "string" && VALID_CATEGORIES.has(v.trim())) {
    return v.trim() as EcoSystemCategory;
  }
  const alias = lookupAlias(v, CATEGORY_ALIASES);
  if (alias) {
    if (typeof v === "string" && v.trim() !== alias) {
      warnings.push(`系統類別「${v}」已對應為 ${alias}`);
    }
    return alias;
  }
  if (v != null && v !== "") {
    warnings.push(`系統類別「${String(v)}」無法辨識，已改為自訂系統`);
  }
  return "custom";
}

function asStrength(v: unknown, warnings: string[]): EcoLinkStrength {
  const alias = lookupAlias(v, STRENGTH_ALIASES);
  if (alias) return alias;
  if (v != null && v !== "") {
    warnings.push(`關係強度「${String(v)}」無法辨識，已改為中`);
  }
  return "moderate";
}

function asQuality(v: unknown, warnings: string[]): EcoLinkQuality {
  const alias = lookupAlias(v, QUALITY_ALIASES);
  if (alias) return alias;
  if (v != null && v !== "") {
    warnings.push(`關係品質「${String(v)}」無法辨識，已改為支持`);
  }
  return "supportive";
}

function asFlow(v: unknown, warnings: string[]): EcoLinkFlow {
  const alias = lookupAlias(v, FLOW_ALIASES);
  if (alias) return alias;
  if (v != null && v !== "") {
    warnings.push(`能量流向「${String(v)}」無法辨識，已改為無流向`);
  }
  return "none";
}

function asEcoLinkFrom(
  v: unknown,
  idSet: Set<string>,
  warnings: string[]
): AiEcoLinkFromDraft | null {
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (obj.kind === "household") return { kind: "household" };
    if (obj.kind === "person") {
      const personId =
        typeof obj.personId === "string" ? obj.personId.trim() : "";
      if (!personId || !idSet.has(personId)) {
        warnings.push(`略過端點不存在的生態連結（${personId || "?"}）`);
        return null;
      }
      return { kind: "person", personId };
    }
  }
  if (typeof v === "string" && v.trim()) {
    const key = v.trim();
    if (HOUSEHOLD_ALIASES.has(key) || HOUSEHOLD_ALIASES.has(key.toLowerCase())) {
      return { kind: "household" };
    }
    if (idSet.has(key)) return { kind: "person", personId: key };
    warnings.push(`略過端點不存在的生態連結（${key}）`);
    return null;
  }
  warnings.push("略過缺少家庭端點的生態連結");
  return null;
}

function parseEcoSystems(
  raw: unknown,
  warnings: string[]
): AiEcoSystemDraft[] {
  if (!Array.isArray(raw)) return [];
  const systems: AiEcoSystemDraft[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] as Record<string, unknown>;
    let id =
      typeof s.id === "string" && s.id.trim() ? s.id.trim() : `s${i + 1}`;
    if (seenIds.has(id)) {
      const next = `${id}_${i + 1}`;
      warnings.push(`重複系統 id「${id}」已改為「${next}」`);
      id = next;
    }
    seenIds.add(id);

    const category = asCategory(s.category, warnings);
    const label =
      typeof s.label === "string" && s.label.trim()
        ? s.label.trim()
        : ECO_SYSTEM_LABELS[category];

    systems.push({
      id,
      label,
      category,
      notes: typeof s.notes === "string" ? s.notes : "",
    });
  }
  return systems;
}

function parseEcoLinks(
  raw: unknown,
  personIds: Set<string>,
  systemIds: Set<string>,
  warnings: string[]
): AiEcoLinkDraft[] {
  if (!Array.isArray(raw)) return [];
  const links: AiEcoLinkDraft[] = [];

  for (const item of raw) {
    const r = item as Record<string, unknown>;
    const from = asEcoLinkFrom(r.from, personIds, warnings);
    if (!from) continue;
    const to = typeof r.to === "string" ? r.to.trim() : "";
    if (!to || !systemIds.has(to)) {
      warnings.push(`略過系統端點不存在的生態連結（→ ${to || "?"}）`);
      continue;
    }
    links.push({
      from,
      to,
      strength: asStrength(r.strength, warnings),
      quality: asQuality(r.quality, warnings),
      flow: asFlow(r.flow, warnings),
      notes: typeof r.notes === "string" ? r.notes : "",
    });
  }
  return links;
}

function asDiagramMode(
  v: unknown,
  hasEco: boolean
): DiagramMode {
  if (v === "ecomap" || v === "生態圖") return "ecomap";
  if (v === "genogram" || v === "家系圖") return "genogram";
  return hasEco ? "ecomap" : "genogram";
}

/**
 * Parse and lightly validate model JSON into a genogram draft.
 */
export function parseAiGenogramDraft(content: string): {
  draft: AiGenogramDraft;
  warnings: string[];
} {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = extractJsonObject(content);
  } catch (err) {
    if (err instanceof AiClientError) throw err;
    throw new AiClientError("parse", "無法從模型回覆解析 JSON");
  }

  if (!raw || typeof raw !== "object") {
    throw new AiClientError("parse", "模型回覆不是 JSON 物件");
  }

  const obj = raw as Record<string, unknown>;
  const personList = Array.isArray(obj.persons) ? obj.persons : null;
  if (!personList || personList.length === 0) {
    throw new AiClientError(
      "parse",
      "模型未回傳任何人物（persons），請描述更清楚的家庭關係後重試"
    );
  }

  const persons: AiPersonDraft[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < personList.length; i++) {
    const p = personList[i] as Record<string, unknown>;
    let id =
      typeof p.id === "string" && p.id.trim() ? p.id.trim() : `p${i + 1}`;
    if (seenIds.has(id)) {
      const next = `${id}_${i + 1}`;
      warnings.push(`重複 id「${id}」已改為「${next}」`);
      id = next;
    }
    seenIds.add(id);

    const name =
      typeof p.name === "string" && p.name.trim()
        ? p.name.trim()
        : `未命名${i + 1}`;

    persons.push({
      id,
      name,
      gender: asGender(p.gender),
      generation: asOptionalNumber(p.generation),
      age: asOptionalNumber(p.age),
      birthYear: asOptionalNumber(p.birthYear),
      deathYear: asOptionalNumber(p.deathYear),
      deceased: Boolean(p.deceased),
      indexPerson: Boolean(p.indexPerson),
      notes: typeof p.notes === "string" ? p.notes : "",
      twinGroup:
        typeof p.twinGroup === "string" && p.twinGroup.trim()
          ? p.twinGroup.trim()
          : undefined,
    });
  }

  const idSet = new Set(persons.map((p) => p.id));
  const relationships: AiRelationshipDraft[] = [];
  const relList = Array.isArray(obj.relationships) ? obj.relationships : [];

  for (const item of relList) {
    const r = item as Record<string, unknown>;
    const from = typeof r.from === "string" ? r.from.trim() : "";
    const to = typeof r.to === "string" ? r.to.trim() : "";
    if (!from || !to) {
      warnings.push("略過缺少端點的關係");
      continue;
    }
    if (!idSet.has(from) || !idSet.has(to)) {
      warnings.push(`略過端點不存在的關係（${from} → ${to}）`);
      continue;
    }
    if (from === to) {
      warnings.push(`略過自連關係（${from}）`);
      continue;
    }
    const type = asRelType(r.type, warnings);
    if (!type) continue;
    const parentKind =
      type === "parent" && r.parentKind === "adoptive"
        ? "adoptive"
        : type === "parent" && r.parentKind === "biological"
          ? "biological"
          : undefined;
    relationships.push({ from, to, type, parentKind });
  }

  const normalizedRelationships: AiRelationshipDraft[] = [];
  const coupleIndexByPair = new Map<string, number>();
  for (const rel of relationships) {
    if (!COUPLE_TYPES.has(rel.type)) {
      normalizedRelationships.push(rel);
      continue;
    }

    const pairKey = [rel.from, rel.to].sort().join("|");
    const existingIndex = coupleIndexByPair.get(pairKey);
    if (existingIndex == null) {
      coupleIndexByPair.set(pairKey, normalizedRelationships.length);
      normalizedRelationships.push(rel);
      continue;
    }

    const existing = normalizedRelationships[existingIndex];
    const existingPriority = COUPLE_STATE_PRIORITY[existing.type] ?? 0;
    const nextPriority = COUPLE_STATE_PRIORITY[rel.type] ?? 0;
    if (nextPriority >= existingPriority) {
      normalizedRelationships[existingIndex] = rel;
    }
    warnings.push(
      `伴侶關係 ${rel.from} ↔ ${rel.to} 已合併為最終狀態`
    );
  }
  relationships.splice(0, relationships.length, ...normalizedRelationships);

  const twinGroups = new Map<string, string[]>();
  for (const person of persons) {
    if (!person.twinGroup) continue;
    const members = twinGroups.get(person.twinGroup) ?? [];
    members.push(person.id);
    twinGroups.set(person.twinGroup, members);
  }

  for (const [groupId, memberIds] of twinGroups) {
    if (memberIds.length < 2) continue;
    const memberSet = new Set(memberIds);
    const templatesByParent = new Map<string, AiRelationshipDraft>();
    for (const rel of relationships) {
      if (rel.type === "parent" && memberSet.has(rel.to)) {
        templatesByParent.set(rel.from, rel);
      }
    }

    for (const childId of memberIds) {
      for (const template of templatesByParent.values()) {
        const exists = relationships.some(
          (rel) =>
            rel.type === "parent" &&
            rel.from === template.from &&
            rel.to === childId
        );
        if (exists) continue;
        relationships.push({ ...template, to: childId });
        warnings.push(
          `雙胞胎群組「${groupId}」已補全 ${template.from} → ${childId} 的親子關係`
        );
      }
    }
  }

  const ecoSystems = parseEcoSystems(obj.ecoSystems, warnings);
  const systemIds = new Set(ecoSystems.map((s) => s.id));
  const ecoLinks = parseEcoLinks(obj.ecoLinks, idSet, systemIds, warnings);

  const householdPersonIds = Array.isArray(obj.householdPersonIds)
    ? obj.householdPersonIds
        .filter((id): id is string => typeof id === "string" && idSet.has(id.trim()))
        .map((id) => id.trim())
        .filter((id, index, list) => list.indexOf(id) === index)
    : [];
  if (
    Array.isArray(obj.householdPersonIds) &&
    obj.householdPersonIds.length > householdPersonIds.length
  ) {
    warnings.push("略過不存在的核心家庭成員 id");
  }

  const hasEco = ecoSystems.length > 0 || ecoLinks.length > 0;
  const diagramMode = asDiagramMode(obj.diagramMode, hasEco);

  const draft: AiGenogramDraft = {
    title: typeof obj.title === "string" ? obj.title.trim() : undefined,
    summary: typeof obj.summary === "string" ? obj.summary.trim() : undefined,
    diagramMode,
    persons,
    relationships,
    householdPersonIds,
    ecoSystems,
    ecoLinks,
  };

  return { draft, warnings };
}
