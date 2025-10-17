/**
 * Canvas bounds checking utilities
 * Prevents objects from being drawn outside canvas dimensions
 */

/**
 * Check if a point is within canvas bounds
 */
export function isPointInBounds(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  return x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight;
}

/**
 * Check if a bounding box is at least partially within canvas bounds
 */
export function isBoundsInCanvas(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  // Check if any corner of the bounding box is within canvas bounds
  const right = x + width;
  const bottom = y + height;

  // If any part of the shape overlaps with canvas, return true
  return !(right < 0 || x > canvasWidth || bottom < 0 || y > canvasHeight);
}

/**
 * Clamp a point to stay within canvas bounds
 */
export function clampPointToBounds(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, canvasWidth)),
    y: Math.max(0, Math.min(y, canvasHeight)),
  };
}

/**
 * Clamp a bounding box to stay within canvas bounds
 * Returns the adjusted bounds that fit within canvas
 */
export function clampBoundsToBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  // Clamp top-left corner
  const clampedX = Math.max(0, Math.min(x, canvasWidth));
  const clampedY = Math.max(0, Math.min(y, canvasHeight));

  // Adjust width and height to fit within bounds
  const maxWidth = canvasWidth - clampedX;
  const maxHeight = canvasHeight - clampedY;

  const clampedWidth = Math.max(0, Math.min(width, maxWidth));
  const clampedHeight = Math.max(0, Math.min(height, maxHeight));

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  };
}

/**
 * Check if a line (from x,y to x2,y2) is at least partially within canvas bounds
 */
export function isLineInBounds(
  x: number,
  y: number,
  x2: number,
  y2: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  // Check if either endpoint is within bounds
  const start = isPointInBounds(x, y, canvasWidth, canvasHeight);
  const end = isPointInBounds(x2, y2, canvasWidth, canvasHeight);

  if (start || end) return true;

  // Check if line crosses any canvas boundary
  // Simple bounding box check - if line's bounding box intersects canvas
  const minX = Math.min(x, x2);
  const maxX = Math.max(x, x2);
  const minY = Math.min(y, y2);
  const maxY = Math.max(y, y2);

  return !(maxX < 0 || minX > canvasWidth || maxY < 0 || minY > canvasHeight);
}

/**
 * Clamp line endpoints to stay within canvas bounds
 */
export function clampLineToBounds(
  x: number,
  y: number,
  x2: number,
  y2: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; x2: number; y2: number } {
  const start = clampPointToBounds(x, y, canvasWidth, canvasHeight);
  const end = clampPointToBounds(x2, y2, canvasWidth, canvasHeight);

  return {
    x: start.x,
    y: start.y,
    x2: end.x,
    y2: end.y,
  };
}
