import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
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

type SectionId =
  | "persons"
  | "family"
  | "systems"
  | "strength"
  | "quality"
  | "flow";

const SECTION_OPEN_KEY = "ecomap-symbol-section-open";

const SECTION_DEFAULTS: Record<SectionId, boolean> = {
  persons: false,
  family: false,
  systems: false,
  strength: false,
  quality: false,
  flow: false,
};

function loadOpenMap(): Record<SectionId, boolean> {
  const base = { ...SECTION_DEFAULTS };
  try {
    const raw = localStorage.getItem(SECTION_OPEN_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
    for (const id of Object.keys(SECTION_DEFAULTS) as SectionId[]) {
      if (typeof parsed[id] === "boolean") base[id] = parsed[id]!;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return base;
}

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
  const [openMap, setOpenMap] =
    useState<Record<SectionId, boolean>>(loadOpenMap);

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

  const renderSection = (
    id: SectionId,
    title: string,
    count: number,
    children: ReactNode
  ) => {
    const open = openMap[id];
    const panelId = `ecomap-symbol-section-${id}`;
    return (
      <section
        className={`symbol-section${open ? " is-open" : ""}`}
        key={id}
      >
        <h3 className="symbol-section-heading">
          <button
            type="button"
            className="symbol-section-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => toggleSection(id)}
          >
            <span className="symbol-section-chevron" aria-hidden="true">
              <ChevronRight size={14} strokeWidth={2.25} />
            </span>
            <span className="symbol-section-title-text">{title}</span>
            <span className="symbol-section-count" aria-hidden="true">
              {count}
            </span>
          </button>
        </h3>
        <div
          id={panelId}
          className="symbol-section-panel"
          role="group"
          aria-label={title}
          hidden={!open}
        >
          {children}
        </div>
      </section>
    );
  };

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
      {renderSection(
        "persons",
        "人物",
        ECO_PERSONS.length,
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
      )}

      {renderSection(
        "family",
        "家庭關係",
        ECO_FAMILY_REL_OPTIONS.length,
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
      )}

      {renderSection(
        "systems",
        "外部系統",
        ECO_SYSTEM_PRESETS.length,
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
      )}

      {renderSection(
        "strength",
        "關係強度",
        ECO_STRENGTH_OPTIONS.length,
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
      )}

      {renderSection(
        "quality",
        "關係品質",
        ECO_QUALITY_OPTIONS.length,
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
      )}

      {renderSection(
        "flow",
        "能量流向",
        ECO_FLOW_OPTIONS.length,
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
      )}
    </div>
  );
}
