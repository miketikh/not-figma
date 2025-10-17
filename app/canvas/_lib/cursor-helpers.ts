import type { CanvasTool } from "@/types/canvas";
import { isDrawingTool } from "../_constants/tools";

/**
 * Determines the cursor style based on the active tool and canvas state
 */
export function getCursorStyle(
  activeTool: CanvasTool,
  isPanning: boolean,
  spacePressed: boolean
): string {
  if (isPanning) return "grabbing";
  if (activeTool === "pan" || spacePressed) return "grab";
  if (activeTool === "select") return "default";
  if (isDrawingTool(activeTool)) return "crosshair";
  return "default";
}
