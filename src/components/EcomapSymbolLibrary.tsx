import {
  ECO_FAMILY_REL_OPTIONS,
  ECO_FLOW_OPTIONS,
  ECO_QUALITY_OPTIONS,
  ECO_STRENGTH_OPTIONS,
  ECO_SYSTEM_PRESETS,
} from "../types/ecomapCatalog";
import type { EcoSystemCategory, Gender } from "../types/document";
import { useDocumentStore } from "../store/documentStore";
import {
  EcoFlowGlyph,
  EcoQualityGlyph,
  EcoStrengthGlyph,
} from "../renderers/ecoLinkIcons";
import { EcoFamilyRelGlyph } from "../renderers/ecoFamilyRelIcons";
import { EcoSystemGlyph } from "../renderers/ecoSystemIcons";
import {
  ECOMAP_PERSON_GAP,
  personEcomapPosition,
} from "../renderers/ecomapLayout";
import { MiniPerson } from "./MiniPerson";

const ECO_PERSONS: { gender: Gender; label: string }[] = [
  { gender: "male", label: "男性" },
  { gender: "female", label: "女性" },
  { gender: "unknown", label: "未知性別" },
];

export function EcomapSymbolLibrary() {
  const addEcoSystem = useDocumentStore((s) => s.addEcoSystem);
  const addPerson = useDocumentStore((s) => s.addPerson);
  const setPendingEcoLink = useDocumentStore((s) => s.setPendingEcoLink);
  const setPendingRelationshipType = useDocumentStore(
    (s) => s.setPendingRelationshipType
  );
  const pendingEcoLink = useDocumentStore((s) => s.pendingEcoLink);
  const pendingRelationshipType = useDocumentStore(
    (s) => s.pendingRelationshipType
  );
  const connectIntent = useDocumentStore((s) => s.connectIntent);
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const viewport = useDocumentStore((s) => s.document.ecomapViewport);
  const canvasSize = useDocumentStore((s) => s.canvasSize);

  const canvasCenter = () => {
    const x = (canvasSize.width / 2 - viewport.offsetX) / viewport.scale;
    const y = (canvasSize.height / 2 - viewport.offsetY) / viewport.scale;
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
    };
  };

  const placeSystem = (category: EcoSystemCategory) => {
    const { x, y } = canvasCenter();
    addEcoSystem(category, x, y);
  };

  const placePerson = (gender: Gender) => {
    const origin = canvasCenter();
    const { persons, householdPersonIds } = useDocumentStore.getState().document;
    const members = persons.filter((p) => householdPersonIds.includes(p.id));
    if (members.length === 0) {
      addPerson(gender, origin.x, origin.y);
      return;
    }
    const last = personEcomapPosition(members[members.length - 1]);
    addPerson(gender, last.x + ECOMAP_PERSON_GAP, last.y);
  };

  return (
    <div className="symbol-library-body">
      <section className="symbol-section is-open">
        <h3 className="symbol-section-heading">
          <span className="symbol-section-title-text">人物</span>
        </h3>
        <div className="symbol-grid">
          {ECO_PERSONS.map((preset) => (
            <button
              key={preset.gender}
              type="button"
              className="symbol-item is-draggable"
              data-kind="person"
              data-gender={preset.gender}
              draggable
              title="拖到畫布，或點一下放到核心家庭圈"
              aria-label={`加入${preset.label}`}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/genogram-symbol",
                  JSON.stringify({
                    kind: "person",
                    gender: preset.gender,
                  })
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => placePerson(preset.gender)}
            >
              <span className="symbol-icon" aria-hidden="true">
                <MiniPerson gender={preset.gender} />
              </span>
              <span className="symbol-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="symbol-section is-open">
        <h3 className="symbol-section-heading">
          <span className="symbol-section-title-text">家庭關係</span>
        </h3>
        <div className="symbol-grid">
          {ECO_FAMILY_REL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-kind="relationship"
              data-rel={opt.value}
              className={`symbol-item${
                interactionMode === "connect" &&
                connectIntent === "family" &&
                pendingRelationshipType === opt.value
                  ? " is-active"
                  : ""
              }`}
              aria-pressed={
                connectIntent === "family" &&
                pendingRelationshipType === opt.value
              }
              title="點擊後選擇兩位家人建立關係"
              onClick={() => setPendingRelationshipType(opt.value)}
            >
              <span className="symbol-icon" aria-hidden="true">
                <EcoFamilyRelGlyph type={opt.value} />
              </span>
              <span className="symbol-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="symbol-section is-open">
        <h3 className="symbol-section-heading">
          <span className="symbol-section-title-text">外部系統</span>
        </h3>
        <div className="symbol-grid">
          {ECO_SYSTEM_PRESETS.map((preset) => (
            <button
              key={preset.category}
              type="button"
              className="symbol-item is-draggable"
              data-kind="ecoSystem"
              data-category={preset.category}
              draggable
              title="拖到畫布，或點一下放到畫面中央"
              aria-label={`加入${preset.label}`}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/genogram-symbol",
                  JSON.stringify({
                    kind: "ecoSystem",
                    category: preset.category,
                  })
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => placeSystem(preset.category)}
            >
              <span className="symbol-icon eco-system-icon" aria-hidden="true">
                <EcoSystemGlyph category={preset.category} />
              </span>
              <span className="symbol-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="symbol-section is-open">
        <h3 className="symbol-section-heading">
          <span className="symbol-section-title-text">關係強度</span>
        </h3>
        <div className="symbol-grid">
          {ECO_STRENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-kind="ecoLink"
              className={`symbol-item${
                interactionMode === "connect" &&
                connectIntent === "eco" &&
                pendingEcoLink.strength === opt.value
                  ? " is-active"
                  : ""
              }`}
              aria-pressed={
                connectIntent === "eco" && pendingEcoLink.strength === opt.value
              }
              title={opt.detail}
              onClick={() => setPendingEcoLink({ strength: opt.value })}
            >
              <span className="symbol-icon" aria-hidden="true">
                <EcoStrengthGlyph value={opt.value} />
              </span>
              <span className="symbol-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="symbol-section is-open">
        <h3 className="symbol-section-heading">
          <span className="symbol-section-title-text">關係品質</span>
        </h3>
        <div className="symbol-grid">
          {ECO_QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-kind="ecoLink"
              className={`symbol-item${
                interactionMode === "connect" &&
                connectIntent === "eco" &&
                pendingEcoLink.quality === opt.value
                  ? " is-active"
                  : ""
              }`}
              aria-pressed={
                connectIntent === "eco" && pendingEcoLink.quality === opt.value
              }
              title={opt.detail}
              onClick={() => setPendingEcoLink({ quality: opt.value })}
            >
              <span className="symbol-icon" aria-hidden="true">
                <EcoQualityGlyph value={opt.value} />
              </span>
              <span className="symbol-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="symbol-section is-open">
        <h3 className="symbol-section-heading">
          <span className="symbol-section-title-text">能量流向</span>
        </h3>
        <div className="symbol-grid">
          {ECO_FLOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-kind="ecoLink"
              className={`symbol-item${
                interactionMode === "connect" &&
                connectIntent === "eco" &&
                pendingEcoLink.flow === opt.value
                  ? " is-active"
                  : ""
              }`}
              aria-pressed={
                connectIntent === "eco" && pendingEcoLink.flow === opt.value
              }
              title={opt.detail}
              onClick={() => setPendingEcoLink({ flow: opt.value })}
            >
              <span className="symbol-icon" aria-hidden="true">
                <EcoFlowGlyph value={opt.value} />
              </span>
              <span className="symbol-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
