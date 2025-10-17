/**
 * AI Tools for Canvas Assistant
 * Tool definitions for shape creation, updates, and canvas queries
 * Uses Vercel AI SDK with Zod validation
 */

import { tool } from "ai";
import { z } from "zod";
import {
  rectangleFactory,
  circleFactory,
  lineFactory,
  textFactory,
} from "./shapes";
import {
  createObject,
  updateObject as firestoreUpdateObject,
  getObject,
  canEdit,
} from "@/lib/firebase/firestore";
import { buildCanvasContext } from "./ai-context";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate canvas bounds to prevent extreme coordinates
 * Objects should be created within reasonable bounds (0-10000 pixels)
 */
function validateCanvasBounds(x: number, y: number): void {
  if (x < 0 || x > 10000) {
    throw new Error(
      `Invalid X coordinate (${x}). Coordinates must be between 0 and 10000 pixels.`
    );
  }
  if (y < 0 || y > 10000) {
    throw new Error(
      `Invalid Y coordinate (${y}). Coordinates must be between 0 and 10000 pixels.`
    );
  }
}

/**
 * Validate CSS color string
 * Accepts: hex (#fff, #ffffff), rgb(a), hsl(a), named colors
 */
function validateColor(color: string | undefined, fieldName: string): void {
  if (!color) return; // Optional colors are allowed

  // Check for hex colors
  const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
  if (hexPattern.test(color)) return;

  // Check for rgb/rgba
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  if (rgbPattern.test(color)) return;

  // Check for hsl/hsla
  const hslPattern =
    /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/;
  if (hslPattern.test(color)) return;

  // Check for named colors (common ones)
  const namedColors = [
    "black",
    "white",
    "red",
    "green",
    "blue",
    "yellow",
    "cyan",
    "magenta",
    "gray",
    "grey",
    "orange",
    "purple",
    "pink",
    "brown",
    "navy",
    "teal",
    "lime",
    "olive",
    "maroon",
    "aqua",
    "silver",
    "fuchsia",
    "transparent",
  ];
  if (namedColors.includes(color.toLowerCase())) return;

  // If none of the above match, it's invalid
  throw new Error(
    `Invalid color "${color}" for ${fieldName}. Use hex (#fff), rgb(255,255,255), or named colors (red, blue, etc.)`
  );
}

// ============================================================================
// Tool Context Interface
// ============================================================================

/**
 * Context provided to all tool execute functions
 * Contains authentication and canvas information
 */
interface ToolContext {
  userId: string;
  canvasId: string;
  selectedIds?: string[];
}

// ============================================================================
// Create Rectangle Tool
// ============================================================================

export const createRectangle = tool({
  description:
    "Create a rectangle on the canvas. Use this when the user wants to create a rectangular shape. Coordinates are in pixels from the top-left corner of the canvas.",
  inputSchema: z.object({
    x: z
      .number()
      .min(0)
      .max(10000)
      .describe("X position (left edge) in pixels"),
    y: z.number().min(0).max(10000).describe("Y position (top edge) in pixels"),
    width: z.number().min(5).max(5000).describe("Width in pixels (minimum 5)"),
    height: z
      .number()
      .min(5)
      .max(5000)
      .describe("Height in pixels (minimum 5)"),
    fill: z
      .string()
      .optional()
      .describe("Fill color (CSS color, hex, or rgba)"),
    stroke: z
      .string()
      .optional()
      .describe("Stroke color (CSS color, hex, or rgba)"),
    strokeWidth: z
      .number()
      .min(0)
      .max(50)
      .optional()
      .describe("Stroke width in pixels"),
    rotation: z
      .number()
      .min(-180)
      .max(180)
      .optional()
      .describe("Rotation in degrees"),
    cornerRadius: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Corner radius in pixels"),
  }),
  execute: async (
    { x, y, width, height, fill, stroke, strokeWidth, rotation, cornerRadius },
    context: ToolContext
  ) => {
    try {
      const { userId, canvasId } = context;

      // Validate canvas bounds
      validateCanvasBounds(x, y);

      // Validate colors if provided
      validateColor(fill, "fill");
      validateColor(stroke, "stroke");

      // Create rectangle using shape factory
      const rect = rectangleFactory.createDefault(
        { x, y, width, height },
        {
          fill,
          stroke,
          strokeWidth,
          rotation,
          cornerRadius,
        },
        canvasId
      );

      // Convert to Firestore format and save
      const firestoreRect = rectangleFactory.toFirestore(
        rect,
        userId,
        canvasId
      );
      await createObject(canvasId, firestoreRect);

      console.log(`[AI Tool] Created rectangle ${rect.id} at (${x}, ${y})`);

      return {
        success: true,
        id: rect.id,
        message: `Created rectangle at (${x}, ${y}) with size ${width}x${height}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to create rectangle:`, error);
      return {
        success: false,
        error: `Failed to create rectangle: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Create Circle Tool
// ============================================================================

export const createCircle = tool({
  description:
    "Create a circle or ellipse on the canvas. Use this when the user wants to create a circular or oval shape. The circle is defined by a center point and radius.",
  inputSchema: z.object({
    x: z.number().min(0).max(10000).describe("X position (center) in pixels"),
    y: z.number().min(0).max(10000).describe("Y position (center) in pixels"),
    radius: z
      .number()
      .min(5)
      .max(2500)
      .describe("Radius in pixels (minimum 5)"),
    fill: z
      .string()
      .optional()
      .describe("Fill color (CSS color, hex, or rgba)"),
    stroke: z
      .string()
      .optional()
      .describe("Stroke color (CSS color, hex, or rgba)"),
    strokeWidth: z
      .number()
      .min(0)
      .max(50)
      .optional()
      .describe("Stroke width in pixels"),
  }),
  execute: async (
    { x, y, radius, fill, stroke, strokeWidth },
    context: ToolContext
  ) => {
    try {
      const { userId, canvasId } = context;

      // Validate canvas bounds (check center point)
      validateCanvasBounds(x, y);

      // Validate colors if provided
      validateColor(fill, "fill");
      validateColor(stroke, "stroke");

      // Convert radius to bounding box (circle factory expects width/height)
      // For a perfect circle, radiusX = radiusY = radius
      // Circle center is at (x, y), so bounding box starts at (x - radius, y - radius)
      const boundingBox = {
        x: x - radius,
        y: y - radius,
        width: radius * 2,
        height: radius * 2,
      };

      // Create circle using shape factory
      const circle = circleFactory.createDefault(
        boundingBox,
        {
          fill,
          stroke,
          strokeWidth,
        },
        canvasId
      );

      // Convert to Firestore format and save
      const firestoreCircle = circleFactory.toFirestore(
        circle,
        userId,
        canvasId
      );
      await createObject(canvasId, firestoreCircle);

      console.log(`[AI Tool] Created circle ${circle.id} at (${x}, ${y})`);

      return {
        success: true,
        id: circle.id,
        message: `Created circle at (${x}, ${y}) with radius ${radius}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to create circle:`, error);
      return {
        success: false,
        error: `Failed to create circle: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Create Line Tool
// ============================================================================

export const createLine = tool({
  description:
    "Create a straight line on the canvas. Use this when the user wants to create a line segment between two points.",
  inputSchema: z.object({
    x1: z.number().min(0).max(10000).describe("Starting X position in pixels"),
    y1: z.number().min(0).max(10000).describe("Starting Y position in pixels"),
    x2: z.number().min(0).max(10000).describe("Ending X position in pixels"),
    y2: z.number().min(0).max(10000).describe("Ending Y position in pixels"),
    stroke: z
      .string()
      .optional()
      .describe("Line color (CSS color, hex, or rgba)"),
    strokeWidth: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe("Line width in pixels"),
  }),
  execute: async (
    { x1, y1, x2, y2, stroke, strokeWidth },
    context: ToolContext
  ) => {
    try {
      const { userId, canvasId } = context;

      // Validate canvas bounds for both endpoints
      validateCanvasBounds(x1, y1);
      validateCanvasBounds(x2, y2);

      // Validate color if provided
      validateColor(stroke, "stroke");

      // Convert line endpoints to bounding box format for factory
      const boundingBox = {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
      };

      // Create line using shape factory
      const line = lineFactory.createDefault(
        boundingBox,
        {
          stroke,
          strokeWidth,
        },
        canvasId
      );

      // Convert to Firestore format and save
      const firestoreLine = lineFactory.toFirestore(line, userId, canvasId);
      await createObject(canvasId, firestoreLine);

      console.log(
        `[AI Tool] Created line ${line.id} from (${x1}, ${y1}) to (${x2}, ${y2})`
      );

      return {
        success: true,
        id: line.id,
        message: `Created line from (${x1}, ${y1}) to (${x2}, ${y2})`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to create line:`, error);
      return {
        success: false,
        error: `Failed to create line: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Create Text Tool
// ============================================================================

export const createText = tool({
  description:
    "Create a text object on the canvas. Use this when the user wants to add text, labels, or typography to the canvas.",
  inputSchema: z.object({
    x: z
      .number()
      .min(0)
      .max(10000)
      .describe("X position (left edge) in pixels"),
    y: z.number().min(0).max(10000).describe("Y position (top edge) in pixels"),
    content: z.string().min(1).max(1000).describe("Text content to display"),
    fontSize: z
      .number()
      .min(8)
      .max(200)
      .optional()
      .describe("Font size in pixels"),
    fontFamily: z
      .string()
      .optional()
      .describe("Font family (e.g., 'Arial', 'Times New Roman')"),
    fill: z
      .string()
      .optional()
      .describe("Text color (CSS color, hex, or rgba)"),
    fontWeight: z
      .enum(["normal", "bold", "lighter", "bolder"])
      .optional()
      .describe("Font weight"),
    fontStyle: z.enum(["normal", "italic"]).optional().describe("Font style"),
    textAlign: z
      .enum(["left", "center", "right"])
      .optional()
      .describe("Text alignment"),
  }),
  execute: async (
    {
      x,
      y,
      content,
      fontSize,
      fontFamily,
      fill,
      fontWeight,
      fontStyle,
      textAlign,
    },
    context: ToolContext
  ) => {
    try {
      const { userId, canvasId } = context;

      // Validate canvas bounds
      validateCanvasBounds(x, y);

      // Validate color if provided
      validateColor(fill, "fill");

      // Create text using shape factory
      const text = textFactory.createDefault(
        { x, y, width: 100, height: 30 },
        {
          content,
          fontSize,
          fontFamily,
          fill,
          fontWeight,
          fontStyle,
          textAlign,
        },
        canvasId
      );

      // Convert to Firestore format and save
      const firestoreText = textFactory.toFirestore(text, userId, canvasId);
      await createObject(canvasId, firestoreText);

      console.log(`[AI Tool] Created text ${text.id} at (${x}, ${y})`);

      return {
        success: true,
        id: text.id,
        message: `Created text "${content}" at (${x}, ${y})`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to create text:`, error);
      return {
        success: false,
        error: `Failed to create text: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Update Object Tool
// ============================================================================

export const updateObject = tool({
  description:
    "Update properties of an existing canvas object. Use this when the user wants to modify an object's position, size, colors, or other properties. Always check if the object is locked before updating.",
  inputSchema: z.object({
    objectId: z.string().describe("ID of the object to update"),
    properties: z
      .object({
        x: z
          .number()
          .min(0)
          .max(10000)
          .optional()
          .describe("New X position in pixels"),
        y: z
          .number()
          .min(0)
          .max(10000)
          .optional()
          .describe("New Y position in pixels"),
        width: z
          .number()
          .min(5)
          .max(5000)
          .optional()
          .describe("New width in pixels"),
        height: z
          .number()
          .min(5)
          .max(5000)
          .optional()
          .describe("New height in pixels"),
        fill: z.string().optional().describe("New fill color"),
        stroke: z.string().optional().describe("New stroke color"),
        strokeWidth: z
          .number()
          .min(0)
          .max(50)
          .optional()
          .describe("New stroke width"),
        rotation: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe("New rotation in degrees"),
        opacity: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("New opacity (0-1)"),
        content: z
          .string()
          .optional()
          .describe("New text content (text objects only)"),
        fontSize: z
          .number()
          .min(8)
          .max(200)
          .optional()
          .describe("New font size (text objects only)"),
      })
      .describe("Properties to update"),
  }),
  execute: async ({ objectId, properties }, context: ToolContext) => {
    try {
      const { userId, canvasId } = context;

      // Get the object to check if it exists and if we can edit it
      const existingObject = await getObject(canvasId, objectId);

      if (!existingObject) {
        return {
          success: false,
          error: `Object with ID ${objectId} not found. Make sure you have the correct object ID.`,
        };
      }

      // Check if we can edit this object (lock system)
      if (!canEdit(existingObject, userId)) {
        const lockerName = existingObject.lockedBy || "another user";
        return {
          success: false,
          error: `Cannot modify object - it is currently being edited by ${lockerName}. Please wait for them to finish or select a different object.`,
        };
      }

      // Validate canvas bounds if position is being updated
      if (properties.x !== undefined || properties.y !== undefined) {
        const newX =
          properties.x !== undefined ? properties.x : existingObject.x;
        const newY =
          properties.y !== undefined ? properties.y : existingObject.y;
        validateCanvasBounds(newX, newY);
      }

      // Validate colors if being updated
      if (properties.fill !== undefined) {
        validateColor(properties.fill, "fill");
      }
      if (properties.stroke !== undefined) {
        validateColor(properties.stroke, "stroke");
      }

      // Prepare update object with Firestore field names
      const updates: Record<string, any> = {
        updatedBy: userId,
        updatedAt: Date.now(),
      };

      // Map properties to Firestore fields
      if (properties.x !== undefined) updates.x = properties.x;
      if (properties.y !== undefined) updates.y = properties.y;
      if (properties.width !== undefined) updates.width = properties.width;
      if (properties.height !== undefined) updates.height = properties.height;
      if (properties.fill !== undefined) updates.fill = properties.fill;
      if (properties.stroke !== undefined) updates.stroke = properties.stroke;
      if (properties.strokeWidth !== undefined)
        updates.strokeWidth = properties.strokeWidth;
      if (properties.rotation !== undefined)
        updates.rotation = properties.rotation;
      if (properties.opacity !== undefined) {
        updates.fillOpacity = properties.opacity;
        updates.strokeOpacity = properties.opacity;
      }
      if (properties.content !== undefined)
        updates.content = properties.content;
      if (properties.fontSize !== undefined)
        updates.fontSize = properties.fontSize;

      // Update the object in Firestore
      await firestoreUpdateObject(canvasId, objectId, updates);

      console.log(`[AI Tool] Updated object ${objectId}`, updates);

      return {
        success: true,
        id: objectId,
        message: `Updated object ${objectId} successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to update object:`, error);
      return {
        success: false,
        error: `Failed to update object: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Get Canvas Objects Tool
// ============================================================================

export const getCanvasObjects = tool({
  description:
    "Query the current state of the canvas. Use this to see what objects exist, get information about selected objects, or understand the overall canvas layout before making changes.",
  inputSchema: z.object({
    filter: z
      .enum(["all", "selected"])
      .optional()
      .default("all")
      .describe(
        "Filter objects: 'all' for all objects, 'selected' for only selected objects"
      ),
  }),
  execute: async ({ filter }, context: ToolContext) => {
    try {
      const { userId, canvasId, selectedIds = [] } = context;

      // Build canvas context
      const canvasContext = await buildCanvasContext(
        canvasId,
        userId,
        selectedIds
      );

      console.log(`[AI Tool] Getting canvas objects (filter: ${filter})`);

      // Handle empty canvas case
      if (canvasContext.objectCount === 0) {
        return {
          success: true,
          message:
            "The canvas is empty. Would you like me to create something?",
          objectCount: 0,
          objects: [],
        };
      }

      // Return based on filter
      if (filter === "selected") {
        if (canvasContext.selectedObjects.length === 0) {
          return {
            success: true,
            message:
              "No objects are currently selected. Please select an object first if you want to modify it.",
            objects: [],
          };
        }

        return {
          success: true,
          message: `Found ${canvasContext.selectedObjects.length} selected object(s)`,
          objects: canvasContext.selectedObjects,
        };
      }

      // Return all objects with context summary
      return {
        success: true,
        message: canvasContext.summary,
        objectCount: canvasContext.objectCount,
        selectedObjects: canvasContext.selectedObjects,
        unselectedCounts: canvasContext.unselectedCounts,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to get canvas objects:`, error);
      return {
        success: false,
        error: `Failed to get canvas objects: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Export All Tools
// ============================================================================

/**
 * All AI tools for canvas operations
 * Import this in the API route to make tools available to the AI
 */
export const aiTools = {
  createRectangle,
  createCircle,
  createLine,
  createText,
  updateObject,
  getCanvasObjects,
};
