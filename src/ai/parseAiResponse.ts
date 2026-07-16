import type { Gender, RelationshipType } from "../types/document";
import { RELATIONSHIP_LABELS } from "../types/relationshipCatalog";
import type {
  AiGenogramDraft,
  AiPersonDraft,
  AiRelationshipDraft,
} from "./types";
import { AiClientError } from "./types";

const VALID_RELS = new Set(Object.keys(RELATIONSHIP_LABELS));

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

function asOptionalNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
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
    relationships.push({ from, to, type });
  }

  const draft: AiGenogramDraft = {
    title: typeof obj.title === "string" ? obj.title.trim() : undefined,
    summary: typeof obj.summary === "string" ? obj.summary.trim() : undefined,
    persons,
    relationships,
  };

  return { draft, warnings };
}
