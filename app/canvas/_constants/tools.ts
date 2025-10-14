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
 * Check if a tool is a drawing tool
 */
export function isDrawingTool(tool: CanvasTool): boolean {
  return DRAWING_TOOLS.includes(tool);
}

