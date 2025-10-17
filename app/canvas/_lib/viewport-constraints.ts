/**
 * Viewport constraint utilities for canvas panning
 * Ensures canvas stays visible and centered when it fits in viewport
 */

interface ConstrainViewportParams {
  x: number;
  y: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
}

interface ConstrainedViewport {
  x: number;
  y: number;
}

// Buffer in canvas pixels - allows peeking slightly beyond canvas edges
const EDGE_BUFFER_PX = 200;

/**
 * Constrains viewport position to keep canvas visible
 *
 * Rules:
 * - If canvas fits in viewport: center it and lock position
 * - If canvas larger than viewport: clamp with buffer so you can peek beyond edges
 *
 * Applied per axis independently (X and Y)
 */
export function constrainViewport({
  x,
  y,
  zoom,
  canvasWidth,
  canvasHeight,
  containerWidth,
  containerHeight,
}: ConstrainViewportParams): ConstrainedViewport {
  // Calculate canvas size in screen space
  const canvasScreenWidth = canvasWidth * zoom;
  const canvasScreenHeight = canvasHeight * zoom;

  // Buffer in screen space
  const bufferScreen = EDGE_BUFFER_PX * zoom;

  let constrainedX = x;
  let constrainedY = y;

  // Constrain X axis
  if (canvasScreenWidth <= containerWidth) {
    // Canvas fits horizontally: center it
    constrainedX = (containerWidth - canvasScreenWidth) / 2;
  } else {
    // Canvas larger than viewport: clamp with buffer
    // maxX allows panning buffer distance beyond left edge
    // minX allows panning buffer distance beyond right edge
    const maxX = bufferScreen;
    const minX = containerWidth - canvasScreenWidth - bufferScreen;
    constrainedX = Math.max(minX, Math.min(maxX, x));
  }

  // Constrain Y axis
  if (canvasScreenHeight <= containerHeight) {
    // Canvas fits vertically: center it
    constrainedY = (containerHeight - canvasScreenHeight) / 2;
  } else {
    // Canvas larger than viewport: clamp with buffer
    const maxY = bufferScreen;
    const minY = containerHeight - canvasScreenHeight - bufferScreen;
    constrainedY = Math.max(minY, Math.min(maxY, y));
  }

  return { x: constrainedX, y: constrainedY };
}
