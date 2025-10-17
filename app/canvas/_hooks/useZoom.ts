import { useCallback } from "react";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  calculateZoomToPoint,
  calculateZoomToCenter,
  calculateResetZoom,
} from "../_lib/zoom-helpers";

interface UseZoomParams {
  stageRef: React.RefObject<Konva.Stage | null>;
  viewport: { x: number; y: number; zoom: number };
  updateViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  containerSize: { width: number; height: number };
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Manages all zoom functionality for the canvas
 * - Wheel zoom (zoom toward pointer)
 * - Zoom in/out buttons (zoom to center)
 * - Reset zoom (1x centered)
 */
export function useZoom({
  stageRef,
  viewport,
  updateViewport,
  containerSize,
  canvasWidth,
  canvasHeight,
}: UseZoomParams) {
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      e.evt.stopPropagation();

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const result = calculateZoomToPoint(
        viewport.zoom,
        e.evt.deltaY,
        pointer,
        { x: stage.x(), y: stage.y() },
        canvasWidth,
        canvasHeight,
        containerSize.width,
        containerSize.height
      );

      updateViewport(result);
    },
    [
      stageRef,
      viewport.zoom,
      canvasWidth,
      canvasHeight,
      containerSize.width,
      containerSize.height,
      updateViewport,
    ]
  );

  const zoomIn = useCallback(() => {
    const result = calculateZoomToCenter(
      viewport.zoom,
      1.1, // zoom factor
      { x: viewport.x, y: viewport.y },
      containerSize.width,
      containerSize.height,
      canvasWidth,
      canvasHeight
    );

    updateViewport(result);
  }, [
    viewport.zoom,
    viewport.x,
    viewport.y,
    containerSize.width,
    containerSize.height,
    canvasWidth,
    canvasHeight,
    updateViewport,
  ]);

  const zoomOut = useCallback(() => {
    const result = calculateZoomToCenter(
      viewport.zoom,
      1 / 1.1, // zoom factor
      { x: viewport.x, y: viewport.y },
      containerSize.width,
      containerSize.height,
      canvasWidth,
      canvasHeight
    );

    updateViewport(result);
  }, [
    viewport.zoom,
    viewport.x,
    viewport.y,
    containerSize.width,
    containerSize.height,
    canvasWidth,
    canvasHeight,
    updateViewport,
  ]);

  const resetZoom = useCallback(() => {
    const result = calculateResetZoom(
      containerSize.width,
      containerSize.height,
      canvasWidth,
      canvasHeight
    );

    updateViewport(result);
  }, [
    containerSize.width,
    containerSize.height,
    canvasWidth,
    canvasHeight,
    updateViewport,
  ]);

  return {
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
