/**
 * Layer management utilities for z-index operations
 */

import type { PersistedShape } from "../_types/shapes";

/**
 * Get the maximum z-index from a list of objects
 */
export function getMaxZIndex(objects: PersistedShape[]): number {
  if (objects.length === 0) return 0;
  return Math.max(...objects.map((obj) => obj.zIndex || 0));
}

/**
 * Get the minimum z-index from a list of objects
 */
export function getMinZIndex(objects: PersistedShape[]): number {
  if (objects.length === 0) return 0;
  return Math.min(...objects.map((obj) => obj.zIndex || 0));
}

/**
 * Layer operations enum for clarity
 */
export enum LayerOperation {
  TO_FRONT = "toFront",
  BRING_FORWARD = "bringForward",
  SEND_BACKWARD = "sendBackward",
  TO_BACK = "toBack",
}

/**
 * Calculate new z-index based on layer operation
 */
export function calculateNewZIndex(
  currentZIndex: number,
  operation: LayerOperation,
  allObjects: PersistedShape[]
): number {
  switch (operation) {
    case LayerOperation.TO_FRONT:
      return getMaxZIndex(allObjects) + 1;
    case LayerOperation.BRING_FORWARD:
      return currentZIndex + 1;
    case LayerOperation.SEND_BACKWARD:
      return currentZIndex - 1;
    case LayerOperation.TO_BACK:
      return getMinZIndex(allObjects) - 1;
    default:
      return currentZIndex;
  }
}

