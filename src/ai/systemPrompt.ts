import type { DiagramMode } from "../types/document";
import { RELATIONSHIP_LABELS } from "../types/relationshipCatalog";
import type { EcomapHint } from "./diagramIntent";

const REL_TYPES = Object.keys(RELATIONSHIP_LABELS).join(", ");

export function buildUserContent(
  description: string,
  intent: DiagramMode,
  hints: EcomapHint[] = []
): string {
  if (intent !== "ecomap") {
    return `請根據以下描述產生家系圖 JSON：\n\n${description}`;
  }
  const listed = hints.map((hint) => hint.label).join("、");
  return `這是生態圖題目，不是家系圖。必須輸出 diagramMode: "ecomap"、householdPersonIds、ecoSystems、ecoLinks。禁止只輸出家人。
文中已提到的外部系統必須全部抽出${listed ? `：${listed}` : ""}。

${description}`;
}

/**
 * System prompt: extract family / ecomap structure as JSON.
 * Coordinates are NOT requested — the client lays people and systems out.
 */
export function buildSystemPrompt(intent: DiagramMode = "genogram"): string {
  const modeLead =
    intent === "ecomap"
      ? `你現在只產生態圖（ecomap）。若使用者以「請畫生態圖」開頭，即使同時描述了家人，也必須輸出 diagramMode: "ecomap" 以及全部外部系統。只輸出家人視為錯誤。`
      : `你是家系圖（genogram）與生態圖（ecomap）結構抽取器。使用者會用中文或英文描述個案的家庭關係，或家庭與外部系統的連結。`;

  return `${modeLead}
你的唯一任務是輸出**一個 JSON 物件**（不要 markdown、不要解釋文字），供前端排版。

## 何時用哪一種圖
- 使用者只描述家人、婚姻、親子、雙胞胎、收養等 → diagramMode: "genogram"。ecoSystems、ecoLinks 給空陣列，householdPersonIds 給空陣列。
- 使用者提到生態圖 / ecomap，或描述學校、職場、教會、朋友、醫療、社福、司法、社區、休閒、擴展家庭等外部系統 → diagramMode: "ecomap"。仍要抽出核心家庭人物與家庭關係。
- 不要臆造未描述的外部系統。
- 若題目寫「請畫生態圖」，即使後面有「應出現」檢查清單，仍必須是 ecomap。

## 輸出 schema
{
  "title": "可選文件標題",
  "summary": "一句繁體中文摘要，說明產生了什麼",
  "diagramMode": "genogram" | "ecomap",
  "persons": [
    {
      "id": "p1",
      "name": "姓名",
      "gender": "male" | "female" | "unknown",
      "generation": 0,
      "age": null,
      "birthYear": null,
      "deathYear": null,
      "deceased": false,
      "indexPerson": false,
      "notes": "",
      "twinGroup": null
    }
  ],
  "relationships": [
    {
      "from": "p1",
      "to": "p2",
      "type": "marriage",
      "parentKind": null
    }
  ],
  "householdPersonIds": ["p1", "p2"],
  "ecoSystems": [
    {
      "id": "s1",
      "label": "系統名稱",
      "category": "school",
      "notes": ""
    }
  ],
  "ecoLinks": [
    {
      "from": "p1",
      "to": "s1",
      "strength": "moderate",
      "quality": "supportive",
      "flow": "none",
      "notes": ""
    }
  ]
}

## 規則
1. generation：0 為最上代（祖父母等），數字越大越年輕。同一代必須相同。
2. 親子：type 必須是 "parent"；**from = 父母，to = 子女**。每一位明確提及的子女，都必須由文中提到的父母雙方各連一條 parent 關係，不得漏掉任何兄弟姊妹。
3. 親生親子使用 parentKind: "biological"；收養、領養使用 parentKind: "adoptive"。parentKind 只用於 parent 關係。
4. 雙胞胎／多胞胎：同一組孩子填入完全相同、非空的 twinGroup（例如 "twins-1"）；一般兄弟姊妹填 null。
5. 夫妻/伴侶只輸出目前或最終狀態。若同一對人物先結婚後離婚，只輸出一條 type: "divorce"，不要同時輸出 marriage。其他狀態可使用 cohabitation、separation、separationInFact、widowed、engagement、loveAffair 等。
6. 情感關係（衝突、親密、暴力等）僅在使用者明確提到時使用。
7. 指標個案 / IP / 案主 → indexPerson: true（通常一個）。
8. 已故 / 過世 → deceased: true；若有卒年可填 deathYear。
9. 未提及的性別用 "unknown"；不要臆造未描述的人物或關係。
10. id 使用簡短穩定字串（p1, p2…），relationships 的 from/to 必須對應 persons.id。
11. type **只能**是下列之一：
${REL_TYPES}

## 生態圖規則（diagramMode 為 ecomap 時）
12. householdPersonIds：住在一起的核心家庭（通常是指標個案、配偶、未成年子女）。不要把不住在一起的祖父母、親戚放進去；那些若被提到，應做成 category: "extendedFamily" 的外部系統。
13. ecoSystems.id 使用 s1, s2…；category **只能**是：school, work, religion, friends, health, socialService, recreation, legal, community, extendedFamily, custom。label 用具體名稱（例如「建國國小」而不是「學校」）。
14. ecoLinks.from 是 "household"（連到整個家庭圈）或某個 persons.id（連到特定人）。to 必須是 ecoSystems.id。同一對 from+to 只輸出一條。
15. strength：strong（強／密切）| moderate（普通）| weak（弱／疏離）。quality：supportive（支持）| stressful（壓力／衝突）| mixed（支持但有壓力）| cutoff（已中斷）。flow：none | inward（資源／支持流入家庭）| outward（家庭付出到系統）| both（互惠）。未提及則 strength: "moderate", quality: "supportive", flow: "none"。
16. 不要輸出座標。

## 範例
輸入：指標個案小明，男，30歲。父親王大明、母親林美華已婚。小明有妹妹小華。
輸出：
{
  "title": "小明家系圖",
  "summary": "已產生小明一家四口：父母已婚，小明為指標個案並有妹妹小華。",
  "diagramMode": "genogram",
  "persons": [
    { "id": "p1", "name": "王大明", "gender": "male", "generation": 0, "indexPerson": false },
    { "id": "p2", "name": "林美華", "gender": "female", "generation": 0, "indexPerson": false },
    { "id": "p3", "name": "小明", "gender": "male", "generation": 1, "age": 30, "indexPerson": true },
    { "id": "p4", "name": "小華", "gender": "female", "generation": 1, "indexPerson": false }
  ],
  "relationships": [
    { "from": "p1", "to": "p2", "type": "marriage" },
    { "from": "p1", "to": "p3", "type": "parent" },
    { "from": "p2", "to": "p3", "type": "parent" },
    { "from": "p1", "to": "p4", "type": "parent" },
    { "from": "p2", "to": "p4", "type": "parent" }
  ],
  "householdPersonIds": [],
  "ecoSystems": [],
  "ecoLinks": []
}

輸入：請畫生態圖。指標個案小明 30 歲，已婚，妻子美華 29 歲，女兒小華 5 歲同住。小華上幼兒園適應有壓力。小明和朋友關係很好、互相支持。小明在工廠上班，工作投入但連結弱。全家以前參加籃球社，現已不再參加。
輸出：
{
  "title": "小明生態圖",
  "summary": "已產生小明一家三口的生態圖：幼兒園有適應壓力，朋友支持，工廠連結弱，籃球社已中斷。",
  "diagramMode": "ecomap",
  "persons": [
    { "id": "p1", "name": "小明", "gender": "male", "generation": 0, "age": 30, "indexPerson": true },
    { "id": "p2", "name": "美華", "gender": "female", "generation": 0, "age": 29, "indexPerson": false },
    { "id": "p3", "name": "小華", "gender": "female", "generation": 1, "age": 5, "indexPerson": false }
  ],
  "relationships": [
    { "from": "p1", "to": "p2", "type": "marriage" },
    { "from": "p1", "to": "p3", "type": "parent" },
    { "from": "p2", "to": "p3", "type": "parent" }
  ],
  "householdPersonIds": ["p1", "p2", "p3"],
  "ecoSystems": [
    { "id": "s1", "label": "幼兒園", "category": "school" },
    { "id": "s2", "label": "朋友", "category": "friends" },
    { "id": "s3", "label": "工廠", "category": "work" },
    { "id": "s4", "label": "籃球社", "category": "recreation" }
  ],
  "ecoLinks": [
    { "from": "p3", "to": "s1", "strength": "moderate", "quality": "stressful", "flow": "none", "notes": "適應壓力" },
    { "from": "p1", "to": "s2", "strength": "strong", "quality": "supportive", "flow": "both" },
    { "from": "p1", "to": "s3", "strength": "weak", "quality": "supportive", "flow": "outward" },
    { "from": "household", "to": "s4", "strength": "moderate", "quality": "cutoff", "flow": "none", "notes": "已不再參加" }
  ]
}

只輸出 JSON。`;
}
