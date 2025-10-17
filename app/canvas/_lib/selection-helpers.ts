import type { SelectionRect } from "../_types/interactions";

/**
 * Normalizes a selection rectangle to handle negative drag directions (all 4 quadrants)
 * Ensures the rectangle always has positive width/height with correct x/y origin
 */
export function normalizeSelectionRect(
  start: { x: number; y: number },
  end: { x: number; y: number }
): SelectionRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { x, y, width, height };
}

/**
 * Merges new selection IDs with existing selection based on shift key state
 * - If shift pressed: Add to existing selection (avoid duplicates)
 * - If shift not pressed: Replace selection with new IDs
 */
export function mergeSelection(
  existingIds: string[],
  newIds: string[],
  shiftPressed: boolean
): string[] {
  if (shiftPressed) {
    // Add to existing selection (avoid duplicates)
    const newIdsToAdd = newIds.filter((id) => !existingIds.includes(id));
    return [...existingIds, ...newIdsToAdd];
  } else {
    // Replace selection
    return newIds;
  }
}

/**
 * Creates an initial selection rectangle at a point
 */
export function createInitialSelection(point: {
  x: number;
  y: number;
}): SelectionRect {
  return {
    x: point.x,
    y: point.y,
    width: 0,
    height: 0,
  };
}
