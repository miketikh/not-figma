import { useEffect } from "react";
import type { CanvasTool } from "@/types/canvas";
import type { PersistedShape } from "../_types/shapes";
import { getMaxZIndex, getMinZIndex } from "../_lib/layer-management";

interface UseKeyboardShortcutsParams {
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  spacePressed: boolean;
  setSpacePressed: (pressed: boolean) => void;
  shiftPressed: boolean;
  setShiftPressed: (pressed: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  objects: PersistedShape[];
  updateZIndex: (objectId: string, newZIndex: number) => void;
  deleteObjects: (ids: string[]) => void;
  isSelecting: boolean;
  cancelSelection: () => void;
  updateDefaultShapeProperty: (
    tool: CanvasTool,
    properties: Record<string, any>
  ) => void;
}

/**
 * Manages all keyboard shortcuts for the canvas
 * - Tool shortcuts (V, H, R, C, L, T)
 * - Space key for pan mode
 * - Shift key tracking
 * - Escape to deselect/cancel selection
 * - Delete/Backspace to delete selected shapes
 * - Cmd/Ctrl + [ and ] for layer management
 */
export function useKeyboardShortcuts({
  activeTool,
  setActiveTool,
  spacePressed,
  setSpacePressed,
  shiftPressed,
  setShiftPressed,
  selectedIds,
  setSelectedIds,
  objects,
  updateZIndex,
  deleteObjects,
  isSelecting,
  cancelSelection,
  updateDefaultShapeProperty,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Tool shortcuts - ignore if any modifier key is pressed (Cmd, Ctrl, Alt, Shift)
      // This allows browser shortcuts like Cmd+R (refresh) to work
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;

      if (!hasModifier) {
        if (e.key === "v" || e.key === "V") {
          setActiveTool("select");
          e.preventDefault();
        } else if (e.key === "h" || e.key === "H") {
          setActiveTool("pan");
          e.preventDefault();
        } else if (e.key === "r" || e.key === "R") {
          setActiveTool("rectangle");
          e.preventDefault();
        } else if (e.key === "c" || e.key === "C") {
          setActiveTool("circle");
          e.preventDefault();
        } else if (e.key === "l" || e.key === "L") {
          setActiveTool("line");
          e.preventDefault();
        } else if (e.key === "t" || e.key === "T") {
          setActiveTool("text");
          // Reset text content to default when activating text tool
          updateDefaultShapeProperty("text", { content: "Text" });
          e.preventDefault();
        }
      }

      if (e.code === "Space" && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault(); // Prevent page scroll
      }

      // Track shift key for conditional Transformer behavior
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        setShiftPressed(true);
      }

      // Escape: Deselect all and cancel selection rectangle
      if (e.code === "Escape") {
        setSelectedIds([]);
        if (isSelecting) {
          cancelSelection();
        }
        e.preventDefault();
      }

      // Delete selected shapes
      if (
        (e.code === "Delete" || e.code === "Backspace") &&
        selectedIds.length > 0
      ) {
        deleteObjects(selectedIds);
        setSelectedIds([]);
        e.preventDefault(); // Prevent browser back navigation
      }

      // Layer management shortcuts
      if (selectedIds.length > 0 && (e.metaKey || e.ctrlKey)) {
        const selectedObj = objects.find((o) => o.id === selectedIds[0]);
        if (!selectedObj) return;

        if (e.key === "]") {
          e.preventDefault();
          if (e.shiftKey) {
            // Bring to Front (Cmd/Ctrl + Shift + ])
            const maxZ = getMaxZIndex(objects);
            updateZIndex(selectedIds[0], maxZ + 1);
          } else {
            // Bring Forward (Cmd/Ctrl + ])
            updateZIndex(selectedIds[0], (selectedObj.zIndex || 0) + 1);
          }
        } else if (e.key === "[") {
          e.preventDefault();
          if (e.shiftKey) {
            // Send to Back (Cmd/Ctrl + Shift + [)
            const minZ = getMinZIndex(objects);
            updateZIndex(selectedIds[0], minZ - 1);
          } else {
            // Send Backward (Cmd/Ctrl + [)
            updateZIndex(selectedIds[0], (selectedObj.zIndex || 0) - 1);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
      }

      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        setShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    activeTool,
    setActiveTool,
    spacePressed,
    setSpacePressed,
    shiftPressed,
    setShiftPressed,
    selectedIds,
    setSelectedIds,
    objects,
    updateZIndex,
    deleteObjects,
    isSelecting,
    cancelSelection,
    updateDefaultShapeProperty,
  ]);
}
