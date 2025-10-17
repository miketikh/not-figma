import { useState, useRef, useCallback } from "react";
import type { DraftRect } from "../_types/interactions";
import type { CanvasTool } from "@/types/canvas";
import type { PersistedShape } from "../_types/shapes";
import { isShapeTool } from "../_constants/tools";
import {
  validateDrawingStart,
  createInitialDraft,
  updateDraftRect,
} from "../_lib/drawing-helpers";
import { getShapeFactory } from "../_lib/shapes";

interface UseDrawingParams {
  activeTool: CanvasTool;
  canvasWidth: number;
  canvasHeight: number;
  saveObject: (obj: PersistedShape) => void;
  defaultShapeProperties: Record<string, any>;
  canvasId: string;
}

/**
 * Manages drawing state and logic for creating shapes on the canvas
 * Handles draft rectangles, drawing validation, and shape creation
 */
export function useDrawing({
  activeTool,
  canvasWidth,
  canvasHeight,
  saveObject,
  defaultShapeProperties,
  canvasId,
}: UseDrawingParams) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });

  const startDrawing = useCallback(
    (point: { x: number; y: number }) => {
      // Validate that click is within canvas bounds
      if (!validateDrawingStart(point, canvasWidth, canvasHeight)) {
        return; // Don't start drawing outside bounds
      }

      setIsDrawing(true);
      drawStartRef.current = { x: point.x, y: point.y };
      setDraftRect(createInitialDraft(point));
    },
    [canvasWidth, canvasHeight]
  );

  const updateDrawing = useCallback(
    (point: { x: number; y: number }) => {
      if (!isDrawing || !draftRect) return;

      const updated = updateDraftRect(
        activeTool,
        drawStartRef.current,
        point,
        canvasWidth,
        canvasHeight
      );

      if (updated) {
        setDraftRect(updated);
      }
    },
    [isDrawing, draftRect, activeTool, canvasWidth, canvasHeight]
  );

  const finishDrawing = useCallback(() => {
    if (!isDrawing || !draftRect) return;

    setIsDrawing(false);

    // Get factory for current tool
    const factory = getShapeFactory(activeTool);
    if (!factory) {
      setDraftRect(null);
      return;
    }

    // Get default properties for this shape type
    const defaults = isShapeTool(activeTool)
      ? defaultShapeProperties[activeTool]
      : {};

    // Create shape from draft using factory with default properties
    const newShape = factory.createDefault(draftRect, defaults, canvasId);

    // Validate size
    if (!factory.validateSize(newShape)) {
      setDraftRect(null);
      return;
    }

    // Save to Firestore (will automatically update local state via subscription)
    saveObject(newShape);
    setDraftRect(null);

    // Return the new shape so caller can handle selection if needed
    return newShape;
  }, [
    isDrawing,
    draftRect,
    activeTool,
    defaultShapeProperties,
    canvasId,
    saveObject,
  ]);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDraftRect(null);
  }, []);

  return {
    isDrawing,
    draftRect,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  };
}
