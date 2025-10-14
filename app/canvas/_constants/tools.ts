/**
 * Canvas tool and shape constants
 * Simple categorization of tools for behavior checks
 */

import type { CanvasTool } from "@/types/canvas";

/**
 * Tools that create shapes by dragging
 */
export const DRAWING_TOOLS: readonly CanvasTool[] = ["rectangle", "circle"] as const;

/**
 * Shape types that correspond to drawing tools
 * Used for mapping tools to their default properties
 */
export type ShapeToolType = "rectangle" | "circle";

/**
 * Check if a tool is a drawing tool
 */
export function isDrawingTool(tool: CanvasTool): boolean {
  return DRAWING_TOOLS.includes(tool);
}

/**
 * Check if a tool is a shape tool (type guard)
 * Returns true if the tool creates a shape and can be used as a key for defaultShapeProperties
 */
export function isShapeTool(tool: CanvasTool): tool is ShapeToolType {
  return tool === "rectangle" || tool === "circle";
}

