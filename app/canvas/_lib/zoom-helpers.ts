import { constrainViewport } from "./viewport-constraints";

/**
 * Clamps zoom level to valid range
 */
export function clampZoom(zoom: number, min = 0.1, max = 5): number {
  if (zoom > max) return max;
  if (zoom < min) return min;
  return zoom;
}

/**
 * Calculates new zoom and position when zooming toward a pointer position
 * Used for wheel zoom
 */
export function calculateZoomToPoint(
  currentZoom: number,
  delta: number,
  pointer: { x: number; y: number },
  currentPos: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  containerWidth: number,
  containerHeight: number
): { zoom: number; x: number; y: number } {
  // Calculate new zoom
  let newZoom = currentZoom * 0.999 ** delta;
  newZoom = clampZoom(newZoom);

  // Calculate new position to zoom toward pointer
  const mousePointTo = {
    x: (pointer.x - currentPos.x) / currentZoom,
    y: (pointer.y - currentPos.y) / currentZoom,
  };

  const newPos = {
    x: pointer.x - mousePointTo.x * newZoom,
    y: pointer.y - mousePointTo.y * newZoom,
  };

  // Apply viewport constraints
  const constrained = constrainViewport({
    x: newPos.x,
    y: newPos.y,
    zoom: newZoom,
    canvasWidth,
    canvasHeight,
    containerWidth,
    containerHeight,
  });

  return { zoom: newZoom, x: constrained.x, y: constrained.y };
}

/**
 * Calculates new zoom and position when zooming to center
 * Used for zoom in/out/reset buttons
 */
export function calculateZoomToCenter(
  currentZoom: number,
  zoomFactor: number,
  currentPos: { x: number; y: number },
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { zoom: number; x: number; y: number } {
  // Calculate new zoom
  let newZoom = currentZoom * zoomFactor;
  newZoom = clampZoom(newZoom);

  // Zoom to center
  const center = {
    x: containerWidth / 2,
    y: containerHeight / 2,
  };

  const mousePointTo = {
    x: (center.x - currentPos.x) / currentZoom,
    y: (center.y - currentPos.y) / currentZoom,
  };

  const newPos = {
    x: center.x - mousePointTo.x * newZoom,
    y: center.y - mousePointTo.y * newZoom,
  };

  // Apply viewport constraints
  const constrained = constrainViewport({
    x: newPos.x,
    y: newPos.y,
    zoom: newZoom,
    canvasWidth,
    canvasHeight,
    containerWidth,
    containerHeight,
  });

  return { zoom: newZoom, x: constrained.x, y: constrained.y };
}

/**
 * Calculates position for reset zoom (zoom to 1x centered)
 */
export function calculateResetZoom(
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { zoom: number; x: number; y: number } {
  const center = {
    x: containerWidth / 2,
    y: containerHeight / 2,
  };

  // Apply viewport constraints
  const constrained = constrainViewport({
    x: center.x,
    y: center.y,
    zoom: 1,
    canvasWidth,
    canvasHeight,
    containerWidth,
    containerHeight,
  });

  return { zoom: 1, x: constrained.x, y: constrained.y };
}
