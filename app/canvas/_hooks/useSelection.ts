import { useState, useRef, useCallback } from "react";
import type { SelectionRect } from "../_types/interactions";
import type { PersistedShape } from "../_types/shapes";
import {
  normalizeSelectionRect,
  mergeSelection,
  createInitialSelection,
} from "../_lib/selection-helpers";
import { getIntersectingObjects } from "../_lib/intersection";

interface UseSelectionParams {
  objects: PersistedShape[];
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  currentUserId: string | null;
}

/**
 * Manages selection rectangle (drag-to-select) state and logic
 * Handles marquee selection with shift-key for additive selection
 */
export function useSelection({
  objects,
  selectedIds,
  setSelectedIds,
  currentUserId,
}: UseSelectionParams) {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef({ x: 0, y: 0 });

  const startSelection = useCallback(
    (point: { x: number; y: number }, shiftPressed: boolean) => {
      // If shift key is not pressed, clear existing selection
      if (!shiftPressed) {
        setSelectedIds([]);
      }

      // Start selection rectangle
      setIsSelecting(true);
      selectionStartRef.current = { x: point.x, y: point.y };
      setSelectionRect(createInitialSelection(point));
    },
    [setSelectedIds]
  );

  const updateSelection = useCallback(
    (point: { x: number; y: number }) => {
      if (!isSelecting) return;

      // Normalize rectangle to handle negative drag directions
      const normalized = normalizeSelectionRect(
        selectionStartRef.current,
        point
      );

      setSelectionRect(normalized);
    },
    [isSelecting]
  );

  const finishSelection = useCallback(
    (shiftPressed: boolean) => {
      if (!isSelecting || !selectionRect) return;

      // Find all objects intersecting the selection rectangle
      const intersectingIds = getIntersectingObjects(
        selectionRect,
        objects,
        currentUserId
      );

      // Merge with existing selection based on shift key
      const newSelection = mergeSelection(
        selectedIds,
        intersectingIds,
        shiftPressed
      );

      setSelectedIds(newSelection);

      // Clear selection rectangle
      setIsSelecting(false);
      setSelectionRect(null);
    },
    [
      isSelecting,
      selectionRect,
      objects,
      currentUserId,
      selectedIds,
      setSelectedIds,
    ]
  );

  const cancelSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectionRect(null);
  }, []);

  return {
    selectionRect,
    isSelecting,
    startSelection,
    updateSelection,
    finishSelection,
    cancelSelection,
  };
}
