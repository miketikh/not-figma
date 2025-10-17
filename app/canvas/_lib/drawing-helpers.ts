import { isPointInBounds, clampPointToBounds } from "./bounds";
import type { DraftRect } from "../_types/interactions";
import type { CanvasTool } from "@/types/canvas";
import { getShapeFactory } from "./shapes";

/**
 * Validates that a drawing start point is within canvas bounds
 */
export function validateDrawingStart(
  point: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): boolean {
  return isPointInBounds(point.x, point.y, canvasWidth, canvasHeight);
}

/**
 * Creates an initial draft rectangle from a start point
 */
export function createInitialDraft(point: { x: number; y: number }): DraftRect {
  return {
    x: point.x,
    y: point.y,
    width: 0,
    height: 0,
  };
}

/**
 * Updates a draft rectangle during drawing by calculating normalized coordinates
 * using the shape factory's normalization logic, with the current point clamped to canvas bounds
 */
export function updateDraftRect(
  activeTool: CanvasTool,
  start: { x: number; y: number },
  current: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): DraftRect | null {
  // Clamp current point to canvas bounds during dragging
  const clampedPoint = clampPointToBounds(
    current.x,
    current.y,
    canvasWidth,
    canvasHeight
  );

  // Get factory for current tool
  const factory = getShapeFactory(activeTool);
  if (!factory) return null;

  // Use factory to normalize drawing coordinates with clamped point
  return factory.normalizeDrawing(start, clampedPoint);
}
