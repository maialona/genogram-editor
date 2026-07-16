import type { Document } from "../../types/document";
import type { AiGenerationPhase } from "../../store/aiGenerationStore";
import { SvgRenderer } from "../../renderers/SvgRenderer";
import { getPersonsBounds, viewportToFitContent } from "../../utils/viewport";

interface AiConstellationOverlayProps {
  phase: AiGenerationPhase;
  previewDocument: Document | null;
  width: number;
  height: number;
}

const ABSTRACT_NODES = [
  { x: 0.36, y: 0.25, shape: "square" },
  { x: 0.58, y: 0.25, shape: "circle" },
  { x: 0.22, y: 0.58, shape: "circle" },
  { x: 0.42, y: 0.58, shape: "square" },
  { x: 0.62, y: 0.58, shape: "circle" },
  { x: 0.78, y: 0.58, shape: "square" },
] as const;

const ABSTRACT_EDGES = [
  [0, 1],
  [0, 3],
  [1, 4],
  [2, 3],
  [3, 4],
  [4, 5],
] as const;

export function AiConstellationOverlay({
  phase,
  previewDocument,
  width,
  height,
}: AiConstellationOverlayProps) {
  if (phase === "idle" || phase === "error") return null;

  if (phase === "revealing" && previewDocument) {
    const bounds = getPersonsBounds(previewDocument.persons);
    const viewport = bounds
      ? viewportToFitContent(bounds, width, height, {
          padding: 96,
          minScale: 0.15,
          maxScale: 1.1,
        })
      : null;

    return (
      <svg
        className="ai-constellation-overlay ai-constellation-preview"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        {viewport && (
          <g
            className="ai-constellation-preview-document"
            transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}
          >
            <SvgRenderer
              document={previewDocument}
              selectedIds={[]}
              connectFromId={null}
            />
          </g>
        )}
      </svg>
    );
  }

  const points = ABSTRACT_NODES.map((node) => ({
    ...node,
    x: width * node.x,
    y: height * node.y,
  }));

  return (
    <svg
      className={`ai-constellation-overlay ai-constellation-waiting phase-${phase}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <g className="ai-constellation-edges">
        {ABSTRACT_EDGES.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={points[from].x}
            y1={points[from].y}
            x2={points[to].x}
            y2={points[to].y}
          />
        ))}
      </g>
      <g className="ai-constellation-nodes">
        {points.map((node, index) =>
          node.shape === "circle" ? (
            <circle
              key={index}
              className="constellation-node"
              cx={node.x}
              cy={node.y}
              r={18}
              style={{ animationDelay: `${index * 90}ms` }}
            />
          ) : (
            <rect
              key={index}
              className="constellation-node"
              x={node.x - 18}
              y={node.y - 18}
              width={36}
              height={36}
              style={{ animationDelay: `${index * 90}ms` }}
            />
          )
        )}
      </g>
    </svg>
  );
}
