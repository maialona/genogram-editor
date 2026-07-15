import type { Gender, RelationshipType } from "../types/document";
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

type LibraryItem = PersonSymbol | RelationshipSymbol | StatusSymbol;

const PERSONS: PersonSymbol[] = [
  { kind: "person", gender: "male", label: "男性" },
  { kind: "person", gender: "female", label: "女性" },
  { kind: "person", gender: "unknown", label: "未知性別" },
];

const FAMILY_RELS: RelationshipSymbol[] = [
  { kind: "relationship", type: "marriage", label: "婚姻" },
  { kind: "relationship", type: "divorce", label: "離婚" },
  { kind: "relationship", type: "separation", label: "分居" },
  { kind: "relationship", type: "cohabitation", label: "同居" },
  { kind: "relationship", type: "parent", label: "親子" },
];

const EMOTION_RELS: RelationshipSymbol[] = [
  { kind: "relationship", type: "harmony", label: "和諧" },
  { kind: "relationship", type: "close", label: "親密" },
  { kind: "relationship", type: "conflict", label: "衝突" },
  { kind: "relationship", type: "hostile", label: "疏離/敵對" },
  { kind: "relationship", type: "abuse", label: "暴力/虐待" },
];

const STATUSES: StatusSymbol[] = [
  { kind: "status", status: "deceased", label: "死亡" },
  { kind: "status", status: "indexPerson", label: "指標人物" },
];

function MiniPerson({ gender }: { gender: Gender }) {
  const s = 22;
  const h = s / 2;
  if (gender === "male") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <rect x={-h} y={-h} width={s} height={s} fill="#fff" stroke="#1a1a1a" strokeWidth={2} />
      </svg>
    );
  }
  if (gender === "female") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <circle r={h} fill="#fff" stroke="#1a1a1a" strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={28} height={28} viewBox="-14 -14 28 28">
      <path
        d={`M 0 ${-h} L ${h} 0 L 0 ${h} L ${-h} 0 Z`}
        fill="#fff"
        stroke="#1a1a1a"
        strokeWidth={2}
      />
    </svg>
  );
}

function MiniRel({ type }: { type: RelationshipType }) {
  const common = { stroke: "#1a1a1a", strokeWidth: 2 };
  return (
    <svg width={36} height={20} viewBox="0 0 36 20">
      {type === "marriage" && <line x1={2} y1={10} x2={34} y2={10} {...common} />}
      {type === "divorce" && (
        <>
          <line x1={2} y1={10} x2={34} y2={10} {...common} />
          <line x1={14} y1={4} x2={22} y2={16} {...common} />
          <line x1={18} y1={4} x2={26} y2={16} {...common} />
        </>
      )}
      {type === "separation" && (
        <>
          <line x1={2} y1={10} x2={34} y2={10} {...common} />
          <line x1={18} y1={4} x2={18} y2={16} {...common} />
        </>
      )}
      {type === "cohabitation" && (
        <line x1={2} y1={10} x2={34} y2={10} {...common} strokeDasharray="5 3" />
      )}
      {type === "parent" && (
        <>
          <line x1={18} y1={2} x2={18} y2={18} {...common} />
          <line x1={10} y1={18} x2={26} y2={18} {...common} />
        </>
      )}
      {(type === "harmony" || type === "close") && (
        <path
          d="M2 10 Q8 4 14 10 T26 10 T34 10"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={2}
        />
      )}
      {(type === "conflict" || type === "hostile" || type === "abuse") && (
        <>
          <line x1={2} y1={10} x2={34} y2={10} {...common} stroke={type === "abuse" ? "#dc2626" : "#1a1a1a"} />
          <path d="M14 6 L18 14 L22 6" fill="none" stroke={type === "abuse" ? "#dc2626" : "#1a1a1a"} strokeWidth={2} />
        </>
      )}
      {type === "engagement" && (
        <line x1={2} y1={10} x2={34} y2={10} {...common} strokeDasharray="2 2" />
      )}
    </svg>
  );
}

function MiniStatus({ status }: { status: "deceased" | "indexPerson" }) {
  if (status === "deceased") {
    return (
      <svg width={28} height={28} viewBox="-14 -14 28 28">
        <rect x={-10} y={-10} width={20} height={20} fill="#fff" stroke="#1a1a1a" strokeWidth={2} />
        <line x1={-7} y1={-7} x2={7} y2={7} stroke="#1a1a1a" strokeWidth={2} />
        <line x1={7} y1={-7} x2={-7} y2={7} stroke="#1a1a1a" strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={28} height={28} viewBox="-14 -14 28 28">
      <rect x={-12} y={-12} width={24} height={24} fill="none" stroke="#ef4444" strokeWidth={2} />
      <circle r={8} fill="#fff" stroke="#1a1a1a" strokeWidth={2} />
    </svg>
  );
}

export function SymbolLibrary() {
  const setPendingRelationshipType = useDocumentStore((s) => s.setPendingRelationshipType);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const document = useDocumentStore((s) => s.document);
  const updatePerson = useDocumentStore((s) => s.updatePerson);
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const pendingRelationshipType = useDocumentStore((s) => s.pendingRelationshipType);

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
    if (item.kind === "status") {
      const personId = selectedIds.find((id) =>
        document.persons.some((p) => p.id === id)
      );
      if (!personId) return;
      if (item.status === "deceased") {
        updatePerson(personId, { deceased: true });
      } else {
        updatePerson(personId, { indexPerson: true });
      }
    }
  };

  const renderSection = (title: string, items: LibraryItem[]) => (
    <section className="symbol-section" key={title}>
      <h3 className="symbol-section-title">{title}</h3>
      <div className="symbol-grid">
        {items.map((item) => {
          const key =
            item.kind === "person"
              ? item.gender
              : item.kind === "relationship"
                ? item.type
                : item.status;
          const active =
            item.kind === "relationship" &&
            interactionMode === "connect" &&
            pendingRelationshipType === item.type;

          return (
            <button
              key={key}
              type="button"
              className={`symbol-item${active ? " active" : ""}`}
              draggable={item.kind === "person"}
              onDragStart={(e) => onDragStart(e, item)}
              onClick={() => onClickItem(item)}
              title={
                item.kind === "person"
                  ? "拖曳至畫布"
                  : item.kind === "relationship"
                    ? "點擊後選擇兩人物建立關係"
                    : "套用至目前選取的人物"
              }
            >
              <span className="symbol-icon">
                {item.kind === "person" && <MiniPerson gender={item.gender} />}
                {item.kind === "relationship" && <MiniRel type={item.type} />}
                {item.kind === "status" && <MiniStatus status={item.status} />}
              </span>
              <span className="symbol-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <aside className="symbol-library">
      <header className="panel-header">
        <h2>符號庫</h2>
      </header>
      <div className="symbol-library-body">
        <p className="symbol-howto">
          <strong>人物</strong>：拖到畫布
          <br />
          <strong>關係</strong>：點一下 → 從 A <em>拖到</em> B
          <br />
          <strong>家庭單元</strong>：婚姻 + 雙方親子 → 自動畫子代棒
        </p>
        {renderSection("人物", PERSONS)}
        {renderSection("家庭關係", FAMILY_RELS)}
        {renderSection("情感關係", EMOTION_RELS)}
        {renderSection("人物狀態", STATUSES)}
        <section className="symbol-section">
          <h3 className="symbol-section-title">醫療符號</h3>
          <p className="symbol-placeholder">架構已預留，後續版本擴充</p>
        </section>
      </div>
    </aside>
  );
}
