import Konva from "konva";

/**
 * Converts screen coordinates (from mouse/pointer events) to canvas coordinates.
 * Accounts for stage position, zoom, and transformations.
 *
 * @param stage - The Konva stage reference
 * @param screenPoint - Point in screen coordinates (e.g., from getPointerPosition())
 * @returns Point in canvas coordinates, or null if conversion fails
 */
export function screenToCanvasCoordinates(
  stage: Konva.Stage,
  screenPoint: { x: number; y: number }
): { x: number; y: number } | null {
  const transform = stage.getAbsoluteTransform().copy().invert();
  return transform.point(screenPoint);
}
