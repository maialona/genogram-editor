import type { Document } from "../types/document";
import { downloadBlob, downloadText, sanitizeFilename } from "../utils/filename";

const CANVAS_SVG_SELECTOR = ".canvas-svg";
const DOCUMENT_ROOT_SELECTOR = ".document-root";
const STRIP_SELECTORS = [
  ".grid-layer",
  ".connect-preview",
  ".selection-layer",
  ".highlight-layer",
];

export type ExportFormat = "json" | "svg" | "png";

function baseName(doc: Document): string {
  return sanitizeFilename(doc.title || "genogram");
}

/** Export the document model as JSON (re-importable). */
export function exportJson(doc: Document): void {
  const payload = {
    ...doc,
    meta: {
      ...doc.meta,
      exportedAt: Date.now(),
      format: "genogram-editor-v1",
    },
  };
  downloadText(
    JSON.stringify(payload, null, 2),
    `${baseName(doc)}.json`,
    "application/json;charset=utf-8"
  );
}

function getLiveSvg(): SVGSVGElement {
  const svg = document.querySelector(CANVAS_SVG_SELECTOR);
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("找不到畫布 SVG，無法匯出");
  }
  return svg;
}

function contentBBox(svg: SVGSVGElement): DOMRect {
  const root = svg.querySelector(DOCUMENT_ROOT_SELECTOR);
  if (!(root instanceof SVGGraphicsElement)) {
    throw new Error("畫布尚無內容可匯出");
  }
  const bbox = root.getBBox();
  if (!Number.isFinite(bbox.width) || bbox.width <= 0) {
    // Empty or degenerate — fall back to a small board
    return new DOMRect(0, 0, 400, 300);
  }
  return bbox;
}

/**
 * Build a clean export SVG in world coordinates (no grid, selection, viewport).
 */
export function buildExportSvgMarkup(doc: Document): string {
  const live = getLiveSvg();
  const root = live.querySelector(DOCUMENT_ROOT_SELECTOR);
  if (!(root instanceof SVGGraphicsElement)) {
    throw new Error("畫布尚無內容可匯出");
  }

  if (doc.persons.length === 0) {
    throw new Error("畫布是空的，請先新增人物再匯出");
  }

  const bbox = contentBBox(live);
  const pad = 48;
  const x = bbox.x - pad;
  const y = bbox.y - pad;
  const w = Math.max(bbox.width + pad * 2, 120);
  const h = Math.max(bbox.height + pad * 2, 120);

  const clone = root.cloneNode(true) as SVGGElement;
  for (const sel of STRIP_SELECTORS) {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const ns = "http://www.w3.org/2000/svg";
  const out = document.createElementNS(ns, "svg");
  out.setAttribute("xmlns", ns);
  out.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  out.setAttribute("width", String(Math.round(w)));
  out.setAttribute("height", String(Math.round(h)));

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("x", String(x));
  bg.setAttribute("y", String(y));
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", "#ffffff");
  out.appendChild(bg);
  out.appendChild(clone);

  return new XMLSerializer().serializeToString(out);
}

export function exportSvg(doc: Document): void {
  const markup = buildExportSvgMarkup(doc);
  downloadText(markup, `${baseName(doc)}.svg`, "image/svg+xml;charset=utf-8");
}

/** Rasterize export SVG to PNG (devicePixelRatio-aware, min 2x). */
export async function exportPng(doc: Document, pixelRatio = 2): Promise<void> {
  const markup = buildExportSvgMarkup(doc);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const w = Math.max(1, Math.round(img.naturalWidth * pixelRatio));
    const h = Math.max(1, Math.round(img.naturalHeight * pixelRatio));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法建立畫布以匯出 PNG");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG 編碼失敗"))),
        "image/png"
      );
    });
    downloadBlob(pngBlob, `${baseName(doc)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("SVG 轉點陣圖失敗"));
    img.src = url;
  });
}
