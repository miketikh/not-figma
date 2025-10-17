/**
 * Types related to canvas interactions (drawing, selection, cursor states)
 */

/**
 * Draft rectangle state while drawing shapes
 */
export interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Selection rectangle state during drag-to-select
 */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cursor modes for different canvas states
 */
export type CursorMode = "default" | "grab" | "grabbing" | "crosshair";
