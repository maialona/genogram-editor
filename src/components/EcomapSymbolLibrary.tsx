import {
  ECO_FLOW_OPTIONS,
  ECO_QUALITY_OPTIONS,
  ECO_STRENGTH_OPTIONS,
  ECO_SYSTEM_PRESETS,
} from "../types/ecomapCatalog";
import type { EcoSystemCategory } from "../types/document";
import { useDocumentStore } from "../store/documentStore";

export function EcomapSymbolLibrary() {
  const addEcoSystem = useDocumentStore((s) => s.addEcoSystem);
  const setPendingEcoLink = useDocumentStore((s) => s.setPendingEcoLink);
  const pendingEcoLink = useDocumentStore((s) => s.pendingEcoLink);
  const interactionMode = useDocumentStore((s) => s.interactionMode);
  const viewport = useDocumentStore((s) => s.document.ecomapViewport);
  const canvasSize = useDocumentStore((s) => s.canvasSize);

  const placeSystem = (category: EcoSystemCategory) => {
    const x = (canvasSize.width / 2 - viewport.offsetX) / viewport.scale;
    const y = (canvasSize.height / 2 - viewport.offsetY) / viewport.scale;
    addEcoSystem(category, Number.isFinite(x) ? x : 180, Number.isFinite(y) ? y : 0);
  };

  return (
    <div className="symbol-library-body">
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
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                    fill="#fff"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                </svg>
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
              className={`symbol-item${
                interactionMode === "connect" &&
                pendingEcoLink.strength === opt.value
                  ? " is-active"
                  : ""
              }`}
              aria-pressed={pendingEcoLink.strength === opt.value}
              title={opt.detail}
              onClick={() => setPendingEcoLink({ strength: opt.value })}
            >
              <span className="symbol-label">
                {opt.label}
                <small>{opt.detail}</small>
              </span>
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
              className={`symbol-item${
                pendingEcoLink.quality === opt.value ? " is-active" : ""
              }`}
              aria-pressed={pendingEcoLink.quality === opt.value}
              title={opt.detail}
              onClick={() => setPendingEcoLink({ quality: opt.value })}
            >
              <span className="symbol-label">
                {opt.label}
                <small>{opt.detail}</small>
              </span>
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
              className={`symbol-item${
                pendingEcoLink.flow === opt.value ? " is-active" : ""
              }`}
              aria-pressed={pendingEcoLink.flow === opt.value}
              title={opt.detail}
              onClick={() => setPendingEcoLink({ flow: opt.value })}
            >
              <span className="symbol-label">
                {opt.label}
                <small>{opt.detail}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
