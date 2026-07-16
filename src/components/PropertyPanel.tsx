import { useRef } from "react";
import { useDocumentStore } from "../store/documentStore";
import type {
  CulturalMark,
  Gender,
  Person,
  Relationship,
  RelationshipType,
  Sexuality,
  SpecialPersonType,
  Transgender,
} from "../types/document";
import { ALL_REL_OPTIONS } from "../types/relationshipCatalog";
import { MEDICAL_MARKERS } from "../types/medicalCatalog";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "unknown", label: "未知" },
];

const SEXUALITY_OPTIONS: { value: Sexuality; label: string }[] = [
  { value: "none", label: "無" },
  { value: "gay", label: "男同志" },
  { value: "lesbian", label: "女同志" },
  { value: "bisexualMale", label: "雙性戀（男）" },
  { value: "bisexualFemale", label: "雙性戀（女）" },
];

const TRANS_OPTIONS: { value: Transgender; label: string }[] = [
  { value: "none", label: "無" },
  { value: "mtf", label: "跨性（男→女）" },
  { value: "ftm", label: "跨性（女→男）" },
];

const SPECIAL_OPTIONS: { value: SpecialPersonType; label: string }[] = [
  { value: "none", label: "無" },
  { value: "pregnancy", label: "懷孕" },
  { value: "pet", label: "寵物" },
  { value: "institution", label: "機構" },
  { value: "miscarriage", label: "流產" },
  { value: "abortion", label: "墮胎" },
  { value: "stillbirth", label: "死產" },
];

const CULTURE_OPTIONS: { value: CulturalMark; label: string }[] = [
  { value: "none", label: "無" },
  { value: "multiCulture", label: "多文化居住" },
  { value: "immigration", label: "移民" },
];

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function useHistoryOnce() {
  const pushed = useRef(false);
  const pushHistory = useDocumentStore((s) => s.pushHistory);

  return {
    onFocus: () => {
      pushed.current = false;
    },
    beforeChange: () => {
      if (!pushed.current) {
        pushHistory();
        pushed.current = true;
      }
    },
  };
}

function PersonProperties({ person }: { person: Person }) {
  const updatePerson = useDocumentStore((s) => s.updatePerson);
  const history = useHistoryOnce();

  const set = <K extends keyof Person>(key: K, value: Person[K]) => {
    history.beforeChange();
    updatePerson(person.id, { [key]: value } as Partial<Person>, {
      recordHistory: false,
    });
  };

  const toggleMedical = (id: string) => {
    history.beforeChange();
    const has = person.medicalConditions.includes(id);
    const medicalConditions = has
      ? person.medicalConditions.filter((c) => c !== id)
      : [...person.medicalConditions, id];
    updatePerson(person.id, { medicalConditions }, { recordHistory: false });
  };

  return (
    <div className="prop-form">
      <h3 className="prop-section-title">人物屬性</h3>

      <label className="prop-field">
        <span>姓名</span>
        <input
          type="text"
          value={person.name}
          onFocus={history.onFocus}
          onChange={(e) => set("name", e.target.value)}
        />
      </label>

      <label className="prop-field">
        <span>性別</span>
        <select
          value={person.gender}
          onFocus={history.onFocus}
          onChange={(e) => set("gender", e.target.value as Gender)}
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="prop-field">
        <span>出生年份</span>
        <input
          type="number"
          value={person.birthYear ?? ""}
          onFocus={history.onFocus}
          onChange={(e) => set("birthYear", parseOptionalNumber(e.target.value))}
        />
      </label>

      <label className="prop-field">
        <span>死亡年份</span>
        <input
          type="number"
          value={person.deathYear ?? ""}
          onFocus={history.onFocus}
          onChange={(e) => {
            history.beforeChange();
            const deathYear = parseOptionalNumber(e.target.value);
            updatePerson(
              person.id,
              {
                deathYear,
                deceased: deathYear != null ? true : person.deceased,
              },
              { recordHistory: false }
            );
          }}
        />
      </label>

      <label className="prop-field">
        <span>年齡（符號內）</span>
        <input
          type="number"
          value={person.age ?? ""}
          onFocus={history.onFocus}
          onChange={(e) => set("age", parseOptionalNumber(e.target.value))}
        />
      </label>

      <label className="prop-check">
        <input
          type="checkbox"
          checked={person.deceased}
          onChange={(e) => {
            history.onFocus();
            set("deceased", e.target.checked);
          }}
        />
        <span>死亡</span>
      </label>

      <label className="prop-check">
        <input
          type="checkbox"
          checked={person.indexPerson}
          onChange={(e) => {
            history.onFocus();
            set("indexPerson", e.target.checked);
          }}
        />
        <span>指標人物</span>
      </label>

      <label className="prop-field">
        <span>性傾向符號</span>
        <select
          value={person.sexuality ?? "none"}
          onFocus={history.onFocus}
          onChange={(e) => set("sexuality", e.target.value as Sexuality)}
        >
          {SEXUALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="prop-field">
        <span>跨性別符號</span>
        <select
          value={person.transgender ?? "none"}
          onFocus={history.onFocus}
          onChange={(e) => set("transgender", e.target.value as Transgender)}
        >
          {TRANS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="prop-field">
        <span>特殊符號</span>
        <select
          value={person.specialType ?? "none"}
          onFocus={history.onFocus}
          onChange={(e) =>
            set("specialType", e.target.value as SpecialPersonType)
          }
        >
          {SPECIAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="prop-field">
        <span>文化／移民標記</span>
        <select
          value={person.culturalMark ?? "none"}
          onFocus={history.onFocus}
          onChange={(e) =>
            set("culturalMark", e.target.value as CulturalMark)
          }
        >
          {CULTURE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="prop-field">
        <span>醫療狀況</span>
        <div className="medical-check-list">
          {MEDICAL_MARKERS.map((m) => (
            <label key={m.id} className="prop-check compact">
              <input
                type="checkbox"
                checked={person.medicalConditions.includes(m.id)}
                onChange={() => {
                  history.onFocus();
                  toggleMedical(m.id);
                }}
              />
              <span>{m.labelZh}</span>
            </label>
          ))}
        </div>
        <input
          type="text"
          className="prop-medical-extra"
          value={person.medicalConditions
            .filter((c) => !MEDICAL_MARKERS.some((m) => m.id === c))
            .join(", ")}
          onFocus={history.onFocus}
          onChange={(e) => {
            const extras = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const known = person.medicalConditions.filter((c) =>
              MEDICAL_MARKERS.some((m) => m.id === c)
            );
            set("medicalConditions", [...known, ...extras]);
          }}
          placeholder="其他自由文字（逗號分隔）"
        />
      </div>

      <label className="prop-field">
        <span>備註</span>
        <textarea
          rows={3}
          value={person.notes}
          onFocus={history.onFocus}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
    </div>
  );
}

function RelationshipProperties({ relationship }: { relationship: Relationship }) {
  const updateRelationship = useDocumentStore((s) => s.updateRelationship);
  const document = useDocumentStore((s) => s.document);
  const history = useHistoryOnce();

  const from = document.persons.find((p) => p.id === relationship.from);
  const to = document.persons.find((p) => p.id === relationship.to);

  return (
    <div className="prop-form">
      <h3 className="prop-section-title">關係屬性</h3>

      <label className="prop-field">
        <span>類型</span>
        <select
          value={relationship.type}
          onFocus={history.onFocus}
          onChange={(e) => {
            history.beforeChange();
            updateRelationship(
              relationship.id,
              { type: e.target.value as RelationshipType },
              { recordHistory: false }
            );
          }}
        >
          {ALL_REL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="prop-readonly">
        <span>從</span>
        <strong>{from?.name || from?.id.slice(0, 8) || "—"}</strong>
      </div>
      <div className="prop-readonly">
        <span>至</span>
        <strong>{to?.name || to?.id.slice(0, 8) || "—"}</strong>
      </div>
    </div>
  );
}

function MultiPersonConnect({ persons }: { persons: Person[] }) {
  const addRelationship = useDocumentStore((s) => s.addRelationship);

  if (persons.length !== 2) return null;
  const [a, b] = persons;

  const quick: { type: RelationshipType; label: string }[] = [
    { type: "marriage", label: "婚姻" },
    { type: "parent", label: "親子" },
    { type: "divorce", label: "離婚" },
    { type: "conflict", label: "衝突" },
    { type: "harmony", label: "和諧" },
    { type: "close", label: "親密" },
  ];

  return (
    <div className="prop-form">
      <h3 className="prop-section-title">快速連線</h3>
      <p className="prop-hint">
        已選 {a.name || "人物 A"} 與 {b.name || "人物 B"}
      </p>
      <div className="quick-connect-grid">
        {quick.map((q) => (
          <button
            key={q.type}
            type="button"
            className="quick-connect-btn"
            onClick={() => addRelationship(a.id, b.id, q.type)}
          >
            {q.label}
          </button>
        ))}
      </div>
      <p className="prop-hint muted">
        親子線方向：先選父母、再 Shift 選子女，或左側用拖曳拉線。
      </p>
    </div>
  );
}

export function PropertyPanel() {
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const document = useDocumentStore((s) => s.document);
  const deleteSelected = useDocumentStore((s) => s.deleteSelected);

  const selectedPersons = document.persons.filter((p) =>
    selectedIds.includes(p.id)
  );
  const selectedRels = document.relationships.filter((r) =>
    selectedIds.includes(r.id)
  );

  return (
    <aside
      className="float-panel property-panel"
      aria-labelledby="property-panel-heading"
    >
      <header className="panel-header">
        <h2 id="property-panel-heading">屬性</h2>
      </header>
      <div className="property-panel-body">
        {selectedIds.length === 0 && (
          <div className="prop-empty-block">
            <p className="prop-empty" role="status">
              選取畫布上的物件以編輯屬性
            </p>
            <p className="prop-hint muted">
              拉線：左側點「婚姻」→ 從人物 <strong>拖到</strong> 另一人物
            </p>
          </div>
        )}

        {selectedPersons.length === 2 && selectedRels.length === 0 && (
          <MultiPersonConnect persons={selectedPersons} />
        )}

        {selectedPersons.length === 1 && selectedRels.length === 0 && (
          <PersonProperties person={selectedPersons[0]} />
        )}

        {selectedRels.length === 1 && selectedPersons.length === 0 && (
          <RelationshipProperties relationship={selectedRels[0]} />
        )}

        {selectedPersons.length === 1 && selectedRels.length === 1 && (
          <>
            <PersonProperties person={selectedPersons[0]} />
            <hr className="prop-divider" />
            <RelationshipProperties relationship={selectedRels[0]} />
          </>
        )}

        {selectedPersons.length > 2 && (
          <p className="prop-empty">已選取 {selectedPersons.length} 個人物</p>
        )}

        {selectedIds.length > 0 && (
          <div className="prop-actions">
            <button
              type="button"
              className="prop-delete-btn"
              onClick={() => deleteSelected()}
              title="刪除選取項目（Delete / Backspace）"
            >
              刪除選取
              <kbd className="prop-kbd">Del</kbd>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
