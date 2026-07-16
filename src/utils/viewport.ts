import type { Viewport } from "../types/document";
import { PERSON_HALF } from "../renderers/constants";

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** World-space bounds of person symbols (includes label room below). */
export function getPersonsBounds(
  persons: { x: number; y: number }[],
  labelExtra = 36
): ContentBounds | null {
  if (persons.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of persons) {
    minX = Math.min(minX, p.x - PERSON_HALF);
    maxX = Math.max(maxX, p.x + PERSON_HALF);
    minY = Math.min(minY, p.y - PERSON_HALF);
    maxY = Math.max(maxY, p.y + PERSON_HALF + labelExtra);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Compute a viewport that centers content in the canvas and scales to fit
 * (with padding). Prefer slightly zoomed-out over overflow.
 */
export function viewportToFitContent(
  bounds: ContentBounds,
  viewWidth: number,
  viewHeight: number,
  options?: {
    padding?: number;
    minScale?: number;
    maxScale?: number;
  }
): Viewport | null {
  if (viewWidth <= 0 || viewHeight <= 0) return null;

  const padding = options?.padding ?? 64;
  const minScale = options?.minScale ?? 0.15;
  const maxScale = options?.maxScale ?? 1.25;

  const contentW = Math.max(bounds.maxX - bounds.minX, 1);
  const contentH = Math.max(bounds.maxY - bounds.minY, 1);
  const availableW = Math.max(viewWidth - padding * 2, 1);
  const availableH = Math.max(viewHeight - padding * 2, 1);

  const scale = Math.min(
    maxScale,
    Math.max(minScale, Math.min(availableW / contentW, availableH / contentH))
  );

  const contentCx = (bounds.minX + bounds.maxX) / 2;
  const contentCy = (bounds.minY + bounds.maxY) / 2;

  // screen = world * scale + offset  →  center content in view
  const offsetX = viewWidth / 2 - contentCx * scale;
  const offsetY = viewHeight / 2 - contentCy * scale;

  return { scale, offsetX, offsetY };
}
