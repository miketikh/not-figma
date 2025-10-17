/**
 * AI Context Builder
 * Serializes canvas state into a concise summary for AI tool execution
 * Optimized for token efficiency by summarizing unselected objects
 */

import { getAllObjects } from "@/lib/firebase/firestore";
import { CanvasObject } from "@/types/canvas";
import type {
  CanvasContextResult,
  SelectedObjectSummary,
  ObjectTypeCounts,
} from "@/types/ai";

/**
 * Build a concise canvas context for AI tool execution
 *
 * Token optimization strategy:
 * - Selected objects: Include full details for precise AI manipulation
 * - Unselected objects: Only include type counts (e.g., "5 rectangles, 3 circles")
 * - Target: <500 tokens for typical canvas with 50-100 objects
 *
 * @param canvasId - The canvas ID to fetch objects from
 * @param userId - The current user ID
 * @param selectedIds - Array of selected object IDs (defaults to empty array)
 * @returns Promise resolving to canvas context summary
 * @throws Error if Firestore fetch fails
 */
export async function buildCanvasContext(
  canvasId: string,
  userId: string,
  selectedIds: string[] = []
): Promise<CanvasContextResult> {
  try {
    // Fetch all objects from Firestore
    const allObjects = await getAllObjects(canvasId);

    // Separate selected and unselected objects
    const selectedIdsSet = new Set(selectedIds);
    const selectedObjects: CanvasObject[] = [];
    const unselectedObjects: CanvasObject[] = [];

    allObjects.forEach((obj) => {
      if (selectedIdsSet.has(obj.id)) {
        selectedObjects.push(obj);
      } else {
        unselectedObjects.push(obj);
      }
    });

    // Build detailed summaries for selected objects
    const selectedSummaries: SelectedObjectSummary[] = selectedObjects.map(
      (obj) => {
        const summary: SelectedObjectSummary = {
          id: obj.id,
          type: obj.type,
          position: { x: Math.round(obj.x), y: Math.round(obj.y) },
          size: {
            width: Math.round(obj.width),
            height: Math.round(obj.height),
          },
          colors: {
            fill: obj.fill,
            stroke: obj.stroke,
          },
          rotation: Math.round(obj.rotation),
        };

        // Add text content for text objects
        if (obj.type === "text" && "content" in obj) {
          summary.content = obj.content;
        }

        return summary;
      }
    );

    // Count unselected objects by type
    const counts: ObjectTypeCounts = {
      rectangles: 0,
      circles: 0,
      lines: 0,
      texts: 0,
      total: unselectedObjects.length,
    };

    unselectedObjects.forEach((obj) => {
      switch (obj.type) {
        case "rectangle":
          counts.rectangles++;
          break;
        case "circle":
          counts.circles++;
          break;
        case "line":
          counts.lines++;
          break;
        case "text":
          counts.texts++;
          break;
      }
    });

    // Generate human-readable summary
    const summary = generateSummary(
      allObjects.length,
      selectedObjects.length,
      counts
    );

    return {
      canvasId,
      userId,
      objectCount: allObjects.length,
      selectedObjects: selectedSummaries,
      unselectedCounts: counts,
      summary,
    };
  } catch (error) {
    // Provide detailed error for debugging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to build canvas context: ${errorMessage}`);
  }
}

/**
 * Generate a human-readable summary of the canvas state
 *
 * Examples:
 * - "Canvas has 15 objects (2 selected). Unselected: 8 rectangles, 3 circles, 2 lines."
 * - "Canvas is empty."
 * - "Canvas has 5 objects (all selected)."
 *
 * @param totalCount - Total number of objects
 * @param selectedCount - Number of selected objects
 * @param counts - Object type counts for unselected objects
 * @returns Human-readable summary string
 */
function generateSummary(
  totalCount: number,
  selectedCount: number,
  counts: ObjectTypeCounts
): string {
  // Empty canvas
  if (totalCount === 0) {
    return "Canvas is empty.";
  }

  // All objects selected
  if (selectedCount === totalCount) {
    return `Canvas has ${totalCount} object${totalCount === 1 ? "" : "s"} (all selected).`;
  }

  // Some objects selected
  let summary = `Canvas has ${totalCount} object${totalCount === 1 ? "" : "s"}`;

  if (selectedCount > 0) {
    summary += ` (${selectedCount} selected)`;
  }

  summary += ".";

  // Add unselected object type breakdown
  if (counts.total > 0) {
    const parts: string[] = [];

    if (counts.rectangles > 0) {
      parts.push(
        `${counts.rectangles} rectangle${counts.rectangles === 1 ? "" : "s"}`
      );
    }
    if (counts.circles > 0) {
      parts.push(`${counts.circles} circle${counts.circles === 1 ? "" : "s"}`);
    }
    if (counts.lines > 0) {
      parts.push(`${counts.lines} line${counts.lines === 1 ? "" : "s"}`);
    }
    if (counts.texts > 0) {
      parts.push(`${counts.texts} text${counts.texts === 1 ? "" : "s"}`);
    }

    if (parts.length > 0) {
      summary += ` Unselected: ${parts.join(", ")}.`;
    }
  }

  return summary;
}
