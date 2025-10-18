import { useCallback } from "react";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { CanvasTool } from "@/types/canvas";
import { isDrawingTool } from "../_constants/tools";
import { screenToCanvasCoordinates } from "../_lib/coordinates";
import { isPointInBounds, clampPointToBounds } from "../_lib/bounds";
import { getShapeFactory } from "../_lib/shapes";
import { isShapeTool } from "../_constants/tools";
import type { PersistedShape } from "../_types/shapes";
import { constrainViewport } from "../_lib/viewport-constraints";

interface UseMouseHandlersParams {
  stageRef: React.RefObject<Konva.Stage | null>;
  activeTool: CanvasTool;
  spacePressed: boolean;
  setIsPanning: (isPanning: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  canvas: { width: number; height: number };
  viewport: { x: number; y: number; zoom: number };
  updateViewport: (viewport: { x: number; y: number; zoom?: number }) => void;
  containerSize: { width: number; height: number };
  defaultShapeProperties: Record<string, any>;
  canvasId: string;
  saveObject: (obj: PersistedShape) => void;
  setActiveTool: (tool: CanvasTool) => void;
  onCursorMove?: (coords: { x: number; y: number; visible: boolean }) => void;
  // Drawing hook interface
  drawing: {
    isDrawing: boolean;
    draftRect: any;
    startDrawing: (point: { x: number; y: number }) => void;
    updateDrawing: (point: { x: number; y: number }) => void;
    finishDrawing: () => PersistedShape | undefined;
  };
  // Selection hook interface
  selection: {
    isSelecting: boolean;
    selectionRect: any;
    startSelection: (
      point: { x: number; y: number },
      shiftPressed: boolean
    ) => void;
    updateSelection: (point: { x: number; y: number }) => void;
    finishSelection: (shiftPressed: boolean) => void;
  };
}

/**
 * Manages all mouse event handling for the canvas
 * Delegates to drawing and selection hooks
 */
export function useMouseHandlers({
  stageRef,
  activeTool,
  spacePressed,
  setIsPanning,
  selectedIds,
  setSelectedIds,
  canvas,
  viewport,
  updateViewport,
  containerSize,
  defaultShapeProperties,
  canvasId,
  saveObject,
  setActiveTool,
  onCursorMove,
  drawing,
  selection,
}: UseMouseHandlersParams) {
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      // Click on empty area
      const clickedOnEmpty = e.target === stage;

      if (clickedOnEmpty && activeTool === "select") {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const canvasPoint = screenToCanvasCoordinates(stage, pointer);
        if (!canvasPoint) return;

        // If shift key is pressed, keep existing selection and start additive selection
        // If no shift, clear selection
        if (!e.evt.shiftKey) {
          setSelectedIds([]);
        }

        // Start selection rectangle
        selection.startSelection(canvasPoint, e.evt.shiftKey);
      }

      // If stage is draggable (pan tool or space), Konva handles the panning
      // Just track the state for cursor
      if (activeTool === "pan" || spacePressed || e.evt.button === 1) {
        setIsPanning(true);
        return;
      }

      // Start drawing shape (left click, drawing tool)
      if (e.evt.button === 0 && isDrawingTool(activeTool)) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const canvasPoint = screenToCanvasCoordinates(stage, pointer);
        if (!canvasPoint) return;

        // Clamp the start point to canvas bounds for creation tools
        const clampedPoint = clampPointToBounds(
          canvasPoint.x,
          canvasPoint.y,
          canvas.width,
          canvas.height
        );

        drawing.startDrawing(clampedPoint);
      }

      // Place text object (left click, text tool)
      if (e.evt.button === 0 && activeTool === "text" && clickedOnEmpty) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const canvasPoint = screenToCanvasCoordinates(stage, pointer);
        if (!canvasPoint) return;

        // Clamp the click position to canvas bounds for text placement
        const clampedPoint = clampPointToBounds(
          canvasPoint.x,
          canvasPoint.y,
          canvas.width,
          canvas.height
        );

        // Get the text factory
        const factory = getShapeFactory("text");
        if (!factory) return;

        // Get default properties for text (including user-edited content)
        const defaults = isShapeTool("text") ? defaultShapeProperties.text : {};

        // Calculate appropriate width for text based on fontSize
        // The width should be wide enough to accommodate the text, or max 1/2 canvas width
        const fontSize = defaults.fontSize ?? 16;
        const content = defaults.content ?? "Text";
        const fontFamily = defaults.fontFamily ?? "Arial";

        // Estimate text width: approximate character width is 0.6 * fontSize
        // This is a rough heuristic that works reasonably well for most fonts
        const estimatedTextWidth = content.length * fontSize * 0.6;

        // Clamp to a minimum of 100px and maximum of half canvas width
        const maxWidth = canvas.width / 2;
        const width = Math.max(100, Math.min(estimatedTextWidth, maxWidth));

        // Height estimation: fontSize * lineHeight + small padding
        const lineHeight = defaults.lineHeight ?? 1.2;
        const height = Math.max(30, fontSize * lineHeight * 1.2);

        // Create new text object at clamped position with calculated dimensions
        const newText = factory.createDefault(
          { x: clampedPoint.x, y: clampedPoint.y, width, height },
          defaults,
          canvasId
        );

        // Save to Firestore
        saveObject(newText);

        // Auto-select the new text so user can edit it in properties panel
        setSelectedIds([newText.id]);

        // Switch to select tool for better UX (user can immediately edit in properties)
        setActiveTool("select");
      }
    },
    [
      stageRef,
      activeTool,
      spacePressed,
      setIsPanning,
      setSelectedIds,
      canvas.width,
      canvas.height,
      defaultShapeProperties,
      canvasId,
      saveObject,
      setActiveTool,
      drawing,
      selection,
    ]
  );

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const canvasPoint = screenToCanvasCoordinates(stage, pointer);
    if (!canvasPoint) return;

    // Check if cursor is within canvas bounds
    const isWithinBounds = isPointInBounds(
      canvasPoint.x,
      canvasPoint.y,
      canvas.width,
      canvas.height
    );

    // Update cursor coordinates display (hide when outside bounds)
    if (onCursorMove) {
      onCursorMove({
        x: canvasPoint.x,
        y: canvasPoint.y,
        visible: isWithinBounds,
      });
    }

    // Update selection rectangle while selecting
    if (selection.isSelecting) {
      selection.updateSelection(canvasPoint);
    }

    // Update draft shape while drawing
    if (drawing.isDrawing && drawing.draftRect) {
      drawing.updateDrawing(canvasPoint);
    }
  }, [
    stageRef,
    drawing,
    selection,
    onCursorMove,
    canvas.width,
    canvas.height,
  ]);

  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Finish selection rectangle
      if (selection.isSelecting && selection.selectionRect) {
        selection.finishSelection(e.evt.shiftKey);
        return;
      }

      // Finish drawing shape
      if (drawing.isDrawing && drawing.draftRect) {
        const newShape = drawing.finishDrawing();

        // If in select tool, select the new shape
        if (newShape && activeTool === "select") {
          setSelectedIds([newShape.id]);
        }
        return;
      }

      setIsPanning(false);
    },
    [drawing, selection, activeTool, setSelectedIds, setIsPanning]
  );

  const handleDragBound = useCallback(
    (pos: { x: number; y: number }) => {
      // Apply viewport constraints during drag
      const constrained = constrainViewport({
        x: pos.x,
        y: pos.y,
        zoom: viewport.zoom,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
      });

      return constrained;
    },
    [viewport.zoom, canvas.width, canvas.height, containerSize]
  );

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const newPos = { x: stage.x(), y: stage.y() };

    // Apply viewport constraints (should already be constrained by dragBoundFunc, but safety net)
    const constrained = constrainViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: viewport.zoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    updateViewport(constrained);
    setIsPanning(false);
  }, [
    stageRef,
    viewport.zoom,
    canvas.width,
    canvas.height,
    containerSize,
    updateViewport,
    setIsPanning,
  ]);

  const handleMouseEnter = useCallback(() => {
    // Cursor entered canvas area
    if (onCursorMove) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasPoint = screenToCanvasCoordinates(stage, pointer);
      if (!canvasPoint) return;

      // Check if cursor is within canvas bounds
      const isWithinBounds = isPointInBounds(
        canvasPoint.x,
        canvasPoint.y,
        canvas.width,
        canvas.height
      );

      onCursorMove({
        x: canvasPoint.x,
        y: canvasPoint.y,
        visible: isWithinBounds,
      });
    }
  }, [stageRef, onCursorMove, canvas.width, canvas.height]);

  const handleMouseLeave = useCallback(() => {
    // Cursor left canvas area
    if (onCursorMove) {
      onCursorMove({
        x: 0,
        y: 0,
        visible: false,
      });
    }
  }, [onCursorMove]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDragBound,
    handleDragEnd,
    handleMouseEnter,
    handleMouseLeave,
  };
}
