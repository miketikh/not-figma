/**
 * Drag bounds constraints for canvas objects
 * Prevents objects from being dragged completely outside the canvas bounds
 */

import type { Vector2d } from "konva/lib/types";

/**
 * Minimum number of pixels that must remain visible inside canvas bounds
 * This ensures objects can always be grabbed and repositioned
 */
const MIN_VISIBLE_PIXELS = 20;

/**
 * Create drag bound function for rectangles
 * Ensures the rectangle always has at least MIN_VISIBLE_PIXELS visible inside canvas
 *
 * Note: We capture width/height at closure creation time to avoid recalculation
 * on every drag event. This assumes dimensions don't change during a drag operation.
 */
export function createRectangleDragBound(
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
) {
  return (pos: Vector2d): Vector2d => {
    // Constrain X: keep at least MIN_VISIBLE_PIXELS visible
    let newX = pos.x;
    const minX = -(width - MIN_VISIBLE_PIXELS); // Can go left, but must keep right edge visible
    const maxX = canvasWidth - MIN_VISIBLE_PIXELS; // Can go right, but must keep left edge visible

    newX = Math.max(minX, Math.min(maxX, newX));

    // Constrain Y: keep at least MIN_VISIBLE_PIXELS visible
    let newY = pos.y;
    const minY = -(height - MIN_VISIBLE_PIXELS); // Can go up, but must keep bottom edge visible
    const maxY = canvasHeight - MIN_VISIBLE_PIXELS; // Can go down, but must keep top edge visible

    newY = Math.max(minY, Math.min(maxY, newY));

    return { x: newX, y: newY };
  };
}

/**
 * Create drag bound function for circles/ellipses
 * Ensures the ellipse always has at least MIN_VISIBLE_PIXELS visible inside canvas
 */
export function createCircleDragBound(
  radiusX: number,
  radiusY: number,
  canvasWidth: number,
  canvasHeight: number
) {
  return (pos: Vector2d): Vector2d => {
    // Constrain X: keep at least MIN_VISIBLE_PIXELS visible
    // Circle center is at pos.x, edges are at pos.x ± radiusX
    let newX = pos.x;
    const minX = MIN_VISIBLE_PIXELS - radiusX; // Can go left, bottom edge stays visible
    const maxX = canvasWidth - MIN_VISIBLE_PIXELS + radiusX; // Can go right, top edge stays visible

    newX = Math.max(minX, Math.min(maxX, newX));

    // Constrain Y: keep at least MIN_VISIBLE_PIXELS visible
    // Circle center is at pos.y, edges are at pos.y ± radiusY
    let newY = pos.y;
    const minY = MIN_VISIBLE_PIXELS - radiusY; // Can go up, bottom edge stays visible
    const maxY = canvasHeight - MIN_VISIBLE_PIXELS + radiusY; // Can go down, top edge stays visible

    newY = Math.max(minY, Math.min(maxY, newY));

    return { x: newX, y: newY };
  };
}

/**
 * Create drag bound function for lines
 * Ensures the line always has at least MIN_VISIBLE_PIXELS visible inside canvas
 * Note: Lines are more complex because they have two endpoints
 */
export function createLineDragBound(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  canvasWidth: number,
  canvasHeight: number
) {
  return (pos: Vector2d): Vector2d => {
    // Calculate line bounds relative to origin (0,0)
    const relativeMinX = Math.min(x1, x2);
    const relativeMaxX = Math.max(x1, x2);
    const relativeMinY = Math.min(y1, y2);
    const relativeMaxY = Math.max(y1, y2);

    // The line's position (pos) represents the offset from its stored coordinates
    // We need to ensure the line's bounding box stays partially visible

    // Constrain X
    let newX = pos.x;
    const minX = -(relativeMaxX - MIN_VISIBLE_PIXELS); // Keep right edge visible
    const maxX = canvasWidth - relativeMinX - MIN_VISIBLE_PIXELS; // Keep left edge visible

    newX = Math.max(minX, Math.min(maxX, newX));

    // Constrain Y
    let newY = pos.y;
    const minY = -(relativeMaxY - MIN_VISIBLE_PIXELS); // Keep bottom edge visible
    const maxY = canvasHeight - relativeMinY - MIN_VISIBLE_PIXELS; // Keep top edge visible

    newY = Math.max(minY, Math.min(maxY, newY));

    return { x: newX, y: newY };
  };
}

/**
 * Create drag bound function for text
 * Ensures the text always has at least MIN_VISIBLE_PIXELS visible inside canvas
 */
export function createTextDragBound(
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
) {
  return (pos: Vector2d): Vector2d => {
    // Constrain X: keep at least MIN_VISIBLE_PIXELS visible
    let newX = pos.x;
    const minX = -(width - MIN_VISIBLE_PIXELS); // Can go left, but must keep right edge visible
    const maxX = canvasWidth - MIN_VISIBLE_PIXELS; // Can go right, but must keep left edge visible

    newX = Math.max(minX, Math.min(maxX, newX));

    // Constrain Y: keep at least MIN_VISIBLE_PIXELS visible
    let newY = pos.y;
    const minY = -(height - MIN_VISIBLE_PIXELS); // Can go up, but must keep bottom edge visible
    const maxY = canvasHeight - MIN_VISIBLE_PIXELS; // Can go down, but must keep top edge visible

    newY = Math.max(minY, Math.min(maxY, newY));

    return { x: newX, y: newY };
  };
}
