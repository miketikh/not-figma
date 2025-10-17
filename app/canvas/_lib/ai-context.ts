/**
 * AI Context Builder
 * Serializes canvas state into a concise summary for AI tool execution
 * Optimized for token efficiency by summarizing unselected objects
 */

import { getAllObjects } from "@/lib/firebase/firestore";
import { getCanvas } from "@/lib/firebase/canvas";
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
 * - AI-created objects (from session): Include full details for reference
 * - Unselected objects: Only include type counts (e.g., "5 rectangles, 3 circles")
 * - Target: <1000 tokens for typical canvas with 50-100 objects
 *
 * @param canvasId - The canvas ID to fetch objects from
 * @param userId - The current user ID
 * @param selectedIds - Array of selected object IDs (defaults to empty array)
 * @param sessionId - AI session ID for filtering AI-created objects (optional)
 * @returns Promise resolving to canvas context summary
 * @throws Error if Firestore fetch fails
 */
export async function buildCanvasContext(
  canvasId: string,
  userId: string,
  selectedIds: string[] = [],
  sessionId?: string
): Promise<CanvasContextResult> {
  try {
    // Fetch canvas metadata and all objects from Firestore
    const [canvas, allObjects] = await Promise.all([
      getCanvas(canvasId),
      getAllObjects(canvasId),
    ]);

    if (!canvas) {
      throw new Error(`Canvas ${canvasId} not found`);
    }

    // Separate selected, AI-created (from session), and unselected objects
    const selectedIdsSet = new Set(selectedIds);
    const selectedObjects: CanvasObject[] = [];
    const aiCreatedObjects: CanvasObject[] = [];
    const unselectedObjects: CanvasObject[] = [];

    allObjects.forEach((obj) => {
      if (selectedIdsSet.has(obj.id)) {
        selectedObjects.push(obj);
      } else if (
        sessionId &&
        obj.createdBy === "ai" &&
        obj.aiSessionId === sessionId
      ) {
        // AI-created objects from this session (not selected)
        aiCreatedObjects.push(obj);
      } else {
        unselectedObjects.push(obj);
      }
    });

    // Helper function to build object summary
    const buildObjectSummary = (obj: CanvasObject): SelectedObjectSummary => {
      // Handle lines differently (they don't have width/height/fill)
      if (obj.type === "line") {
        const lineObj = obj as { type: "line"; x: number; y: number; x2: number; y2: number; stroke?: string; rotation: number };
        return {
          id: obj.id,
          type: obj.type,
          position: { x: Math.round(lineObj.x), y: Math.round(lineObj.y) },
          size: {
            width: Math.round(Math.abs(lineObj.x2 - lineObj.x)),
            height: Math.round(Math.abs(lineObj.y2 - lineObj.y)),
          },
          colors: {
            stroke: lineObj.stroke,
          },
          rotation: Math.round(lineObj.rotation),
        };
      }

      // For all other objects (rectangle, circle, text)
      const summary: SelectedObjectSummary = {
        id: obj.id,
        type: obj.type,
        position: { x: Math.round(obj.x), y: Math.round(obj.y) },
        size: {
          width: Math.round((obj as any).width),
          height: Math.round((obj as any).height),
        },
        colors: {
          fill: (obj as any).fill,
          stroke: obj.stroke,
        },
        rotation: Math.round(obj.rotation),
      };

      // Add text content for text objects
      if (obj.type === "text" && "content" in obj) {
        summary.content = obj.content;
      }

      return summary;
    };

    // Build detailed summaries for selected objects
    const selectedSummaries: SelectedObjectSummary[] =
      selectedObjects.map(buildObjectSummary);

    // Build detailed summaries for AI-created objects from this session
    const aiCreatedSummaries: SelectedObjectSummary[] =
      aiCreatedObjects.map(buildObjectSummary);

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
      aiCreatedObjects.length,
      counts,
      canvas.width,
      canvas.height
    );

    // Find the last created object ID (most recent by createdAt timestamp)
    const lastCreatedObjectId =
      aiCreatedObjects.length > 0
        ? aiCreatedObjects.sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
          )[0].id
        : null;

    return {
      canvasId,
      userId,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      objectCount: allObjects.length,
      selectedObjects: selectedSummaries,
      aiCreatedObjects: aiCreatedSummaries,
      unselectedCounts: counts,
      summary,
      lastCreatedObjectId,
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
 * - "Canvas (1920x1080) has 15 objects (2 selected, 3 AI-created). Unselected: 8 rectangles, 3 circles, 2 lines."
 * - "Canvas (1920x1080) is empty."
 * - "Canvas (1920x1080) has 5 objects (all selected)."
 *
 * @param totalCount - Total number of objects
 * @param selectedCount - Number of selected objects
 * @param aiCreatedCount - Number of AI-created objects from this session
 * @param counts - Object type counts for unselected objects
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns Human-readable summary string
 */
function generateSummary(
  totalCount: number,
  selectedCount: number,
  aiCreatedCount: number,
  counts: ObjectTypeCounts,
  canvasWidth: number,
  canvasHeight: number
): string {
  const canvasDims = `Canvas (${canvasWidth}x${canvasHeight})`;
  const centerX = Math.round(canvasWidth / 2);
  const centerY = Math.round(canvasHeight / 2);
  // Empty canvas
  if (totalCount === 0) {
    return `${canvasDims} is empty. Center is at (${centerX}, ${centerY}).`;
  }

  // All objects selected
  if (selectedCount === totalCount) {
    return `${canvasDims} has ${totalCount} object${totalCount === 1 ? "" : "s"} (all selected). Center is at (${centerX}, ${centerY}).`;
  }

  // Some objects selected
  let summary = `${canvasDims} has ${totalCount} object${totalCount === 1 ? "" : "s"}`;

  // Add counts for selected and AI-created objects
  const statusParts: string[] = [];
  if (selectedCount > 0) {
    statusParts.push(`${selectedCount} selected`);
  }
  if (aiCreatedCount > 0) {
    statusParts.push(`${aiCreatedCount} AI-created`);
  }

  if (statusParts.length > 0) {
    summary += ` (${statusParts.join(", ")})`;
  }

  summary += `. Center is at (${centerX}, ${centerY}).`;

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
