import { useRef } from "react";
import { useDocumentStore } from "../store/documentStore";
import type { Gender, Person, Relationship, RelationshipType } from "../types/document";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "unknown", label: "未知" },
];

const REL_TYPE_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "marriage", label: "婚姻" },
  { value: "divorce", label: "離婚" },
  { value: "separation", label: "分居" },
  { value: "cohabitation", label: "同居" },
  { value: "engagement", label: "訂婚" },
  { value: "parent", label: "親子" },
  { value: "harmony", label: "和諧" },
  { value: "close", label: "親密" },
  { value: "conflict", label: "衝突" },
  { value: "hostile", label: "疏離/敵對" },
  { value: "abuse", label: "暴力/虐待" },
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
        <span>年齡</span>
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
        <span>醫療狀況（逗號分隔）</span>
        <input
          type="text"
          value={person.medicalConditions.join(", ")}
          onFocus={history.onFocus}
          onChange={(e) => {
            const medicalConditions = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            set("medicalConditions", medicalConditions);
          }}
          placeholder="例如：糖尿病, 高血壓"
        />
      </label>

      <label className="prop-field">
        <span>備註</span>
        <textarea
          rows={4}
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
          {REL_TYPE_OPTIONS.map((o) => (
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

  const selectedPersons = document.persons.filter((p) =>
    selectedIds.includes(p.id)
  );
  const selectedRels = document.relationships.filter((r) =>
    selectedIds.includes(r.id)
  );

  return (
    <aside className="property-panel">
      <header className="panel-header">
        <h2>屬性</h2>
      </header>
      <div className="property-panel-body">
        {selectedIds.length === 0 && (
          <div className="prop-empty-block">
            <p className="prop-empty">選取畫布上的物件以編輯屬性</p>
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
      </div>
    </aside>
  );
}
