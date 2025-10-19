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
import type { PersistedText } from "../_types/shapes";
import {
  createObject,
  updateObject as firestoreUpdateObject,
  getObject,
  canEdit,
  deleteObject as firestoreDeleteObject,
} from "@/app/api/_lib/firebase-server";
import { buildCanvasContext } from "./ai-context";
import {
  getCreateRectangleMessage,
  getCreateCircleMessage,
  getCreateLineMessage,
  getCreateTextMessage,
  getUpdateColorMessage,
  getUpdatePositionMessage,
  getUpdateRotationMessage,
  getUpdateSizeMessage,
  getUpdateOpacityMessage,
  getUpdateGenericMessage,
  getCanvasEmptyMessage,
  getObjectCountMessage,
  getNoSelectionMessage,
  getSelectionCountMessage,
  getObjectLockedMessage,
  getObjectNotFoundMessage,
  getBoundsErrorMessage,
  getMilestoneMessage,
  getDeleteObjectMessage,
} from "./ai-responses";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate canvas bounds to prevent extreme coordinates
 * Objects should be created within reasonable bounds (0-10000 pixels)
 */
function validateCanvasBounds(x: number, y: number): void {
  if (x < 0 || x > 10000 || y < 0 || y > 10000) {
    throw new Error(getBoundsErrorMessage());
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
  sessionId?: string;
}

// ============================================================================
// Create Rectangle Tool
// ============================================================================

export const createRectangle = tool({
  description:
    "Create a NEW rectangle on the canvas. USE THIS TOOL only when the user wants to CREATE a new rectangle (keywords: 'create', 'add', 'new', 'draw', or when they use 'a rectangle'). DO NOT use this when the user says 'move the rectangle' or 'move it' - use updateObject instead. IMPORTANT: The x,y parameters represent the TOP-LEFT CORNER of the rectangle, NOT the center. To center a rectangle at position (centerX, centerY), calculate: x = centerX - width/2, y = centerY - height/2. Example: To center a 300×200 rectangle at (960, 540), use x=810, y=440.",
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
    { experimental_context }
  ) => {
    try {
      const context = experimental_context as ToolContext;
      const { userId, canvasId, sessionId } = context;

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

      // Add AI metadata
      if (sessionId) {
        firestoreRect.createdBy = "ai";
        firestoreRect.aiSessionId = sessionId;
      }

      await createObject(canvasId, firestoreRect);


      return {
        success: true,
        id: rect.id,
        message: getCreateRectangleMessage({ x, y, width, height }),
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
    "Create a NEW circle on the canvas. USE THIS TOOL only when the user wants to CREATE a new circle (keywords: 'create', 'add', 'new', 'draw', or when they use 'a circle'). DO NOT use this when the user says 'move the circle' or 'move it' - use updateObject instead. IMPORTANT: The x,y parameters represent the CENTER of the circle (unlike rectangles which use top-left). To center a circle at position (centerX, centerY), use those coordinates directly as x,y. Example: To center a circle with radius 100 at (960, 540), use x=960, y=540.",
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
    { experimental_context }
  ) => {
    try {
      const context = experimental_context as ToolContext;
      const { userId, canvasId, sessionId } = context;

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

      // Add AI metadata
      if (sessionId) {
        firestoreCircle.createdBy = "ai";
        firestoreCircle.aiSessionId = sessionId;
      }

      await createObject(canvasId, firestoreCircle);


      return {
        success: true,
        id: circle.id,
        message: getCreateCircleMessage({ x, y, radius }),
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
    "Create a NEW straight line on the canvas. USE THIS TOOL only when the user wants to CREATE a new line (keywords: 'create', 'add', 'new', 'draw', or when they use 'a line'). DO NOT use this when the user says 'move the line' or 'move it' - use updateObject instead. Use this when the user wants to create a line segment between two points.",
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
    { experimental_context }
  ) => {
    try {
      const context = experimental_context as ToolContext;
      const { userId, canvasId, sessionId } = context;

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

      // Add AI metadata
      if (sessionId) {
        firestoreLine.createdBy = "ai";
        firestoreLine.aiSessionId = sessionId;
      }

      await createObject(canvasId, firestoreLine);


      return {
        success: true,
        id: line.id,
        message: getCreateLineMessage({ x1, y1, x2, y2 }),
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
    "Create a NEW text object on the canvas. USE THIS TOOL only when the user wants to CREATE new text (keywords: 'create', 'add', 'new', 'write', or when they use 'a text'). DO NOT use this when the user says 'move the text' or 'move it' - use updateObject instead. IMPORTANT: The x,y parameters represent the TOP-LEFT CORNER of the text box, NOT the center (same as rectangles). To center text at position (centerX, centerY), calculate: x = centerX - estimatedWidth/2, y = centerY - fontSize/2.",
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
    { experimental_context }
  ) => {
    try {
      const context = experimental_context as ToolContext;
      const { userId, canvasId, sessionId } = context;

      // Validate canvas bounds
      validateCanvasBounds(x, y);

      // Validate color if provided
      validateColor(fill, "fill");

      // Calculate dynamic width based on content length and font size
      // Formula: content length × fontSize × average char width multiplier (0.6)
      // Minimum width of 200px to ensure readability
      const effectiveFontSize = fontSize || 16;
      const estimatedWidth = Math.max(
        200,
        content.length * effectiveFontSize * 0.6
      );

      // Build overrides object, only including defined values to preserve factory defaults
      const overrides: Partial<PersistedText> = { content };
      if (fontSize !== undefined) overrides.fontSize = fontSize;
      if (fontFamily !== undefined) overrides.fontFamily = fontFamily;
      if (fill !== undefined) overrides.fill = fill;
      if (fontWeight !== undefined) overrides.fontWeight = fontWeight;
      if (fontStyle !== undefined) overrides.fontStyle = fontStyle;
      if (textAlign !== undefined) overrides.textAlign = textAlign;

      // Create text using shape factory
      const text = textFactory.createDefault(
        { x, y, width: estimatedWidth, height: 30 },
        overrides,
        canvasId
      );

      // Convert to Firestore format and save
      const firestoreText = textFactory.toFirestore(text, userId, canvasId);

      // Add AI metadata
      if (sessionId) {
        firestoreText.createdBy = "ai";
        firestoreText.aiSessionId = sessionId;
      }

      await createObject(canvasId, firestoreText);


      return {
        success: true,
        id: text.id,
        message: getCreateTextMessage({ x, y, content }),
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
    "Update properties of an existing canvas object. USE THIS TOOL when the user wants to MODIFY or MOVE an existing object (keywords: 'move', 'change', 'make it', 'rotate', 'resize', or when they use 'the'/'it'/'that' to reference an object). DO NOT create a new object when the user says 'move the circle' - update the existing circle instead. Always check if the object is locked before updating.",
  inputSchema: z.object({
    objectId: z
      .string()
      .optional()
      .describe(
        "ID of the object to update. If not provided, will use selected object or last created object."
      ),
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
  execute: async ({ objectId, properties }, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext;
      const { userId, canvasId, selectedIds, sessionId } = context;

      // Inference logic: determine which object to update
      let targetId = objectId;

      if (!targetId) {
        // First, check if user has something selected
        if (selectedIds && selectedIds.length > 0) {
          targetId = selectedIds[0];
        } else {
          // No selection, try to find last AI-created object from this session
          const canvasContext = await buildCanvasContext(
            canvasId,
            userId,
            [],
            sessionId
          );

          if (canvasContext.lastCreatedObjectId) {
            targetId = canvasContext.lastCreatedObjectId;
          }
        }
      }

      // Validation
      if (!targetId) {
        return {
          success: false,
          error: getNoSelectionMessage(),
        };
      }

      // Get the object to check if it exists and if we can edit it
      const existingObject = await getObject(canvasId, targetId);

      if (!existingObject) {
        return {
          success: false,
          error: getObjectNotFoundMessage(),
        };
      }

      // Check if we can edit this object (lock system)
      if (!canEdit(existingObject, userId)) {
        const lockerName = existingObject.lockedBy || "another user";
        return {
          success: false,
          error: getObjectLockedMessage(lockerName),
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

      // Special handling for line objects
      // Lines have two endpoints (x, y) and (x2, y2)
      // When moving a line, both endpoints must move together to maintain shape
      if (existingObject.type === "line") {
        if (properties.x !== undefined || properties.y !== undefined) {
          // Calculate the delta for position changes
          const deltaX =
            properties.x !== undefined
              ? properties.x - existingObject.x
              : 0;
          const deltaY =
            properties.y !== undefined
              ? properties.y - existingObject.y
              : 0;

          // Apply the same delta to the end point (x2, y2)
          if (deltaX !== 0 || deltaY !== 0) {
            const existingLine = existingObject as any; // LineObject type
            updates.x2 = existingLine.x2 + deltaX;
            updates.y2 = existingLine.y2 + deltaY;

            // Validate end point bounds too
            validateCanvasBounds(updates.x2, updates.y2);
          }
        }
      }

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
      await firestoreUpdateObject(canvasId, targetId, updates);

      // Get canvas dimensions for context-aware position messages
      const canvasContext = await buildCanvasContext(canvasId, userId, []);

      // Generate context-aware message based on what was updated
      // Priority: position > color > size > rotation > opacity > other
      let message: string;

      // Check position update (highest priority)
      if (properties.x !== undefined || properties.y !== undefined) {
        const finalX =
          properties.x !== undefined ? properties.x : existingObject.x;
        const finalY =
          properties.y !== undefined ? properties.y : existingObject.y;
        const deltaX =
          properties.x !== undefined ? properties.x - existingObject.x : 0;
        const deltaY =
          properties.y !== undefined ? properties.y - existingObject.y : 0;

        message = getUpdatePositionMessage({
          x: finalX,
          y: finalY,
          deltaX,
          deltaY,
          canvasWidth: canvasContext.canvasWidth,
          canvasHeight: canvasContext.canvasHeight,
        });
      }
      // Check color update (fill or stroke)
      else if (properties.fill !== undefined) {
        message = getUpdateColorMessage({
          color: properties.fill,
          property: "fill",
        });
      } else if (properties.stroke !== undefined) {
        message = getUpdateColorMessage({
          color: properties.stroke,
          property: "stroke",
        });
      }
      // Check size update (only for objects that have width/height)
      else if (properties.width !== undefined || properties.height !== undefined) {
        const finalWidth =
          properties.width !== undefined
            ? properties.width
            : (existingObject as any).width || 0;
        const finalHeight =
          properties.height !== undefined
            ? properties.height
            : (existingObject as any).height || 0;

        message = getUpdateSizeMessage({
          width: finalWidth,
          height: finalHeight,
        });
      }
      // Check rotation update
      else if (properties.rotation !== undefined) {
        message = getUpdateRotationMessage({ rotation: properties.rotation });
      }
      // Check opacity update
      else if (properties.opacity !== undefined) {
        message = getUpdateOpacityMessage({ opacity: properties.opacity });
      }
      // Generic fallback for other updates
      else {
        message = getUpdateGenericMessage();
      }

      return {
        success: true,
        id: targetId,
        message,
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
// Delete Object Tool
// ============================================================================

export const deleteObject = tool({
  description:
    "Delete an object from the canvas. Use this when the user wants to remove or delete a shape. Requires the object to be unlocked (not being edited by another user).",
  inputSchema: z.object({
    objectId: z
      .string()
      .describe(
        "ID of the object to delete. Use lastCreatedObjectId when user says 'delete it' or 'remove that'"
      ),
  }),
  execute: async ({ objectId }, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext;
      const { userId, canvasId } = context;

      // Validate object ID
      if (!objectId) {
        return {
          success: false,
          error: "Object ID is required to delete an object",
        };
      }

      // Get the object to check if it exists and get its type
      const object = await getObject(canvasId, objectId);
      if (!object) {
        return {
          success: false,
          error: getObjectNotFoundMessage(),
        };
      }

      // Check if user can edit (object must be unlocked)
      const editable = canEdit(object, userId);
      if (!editable) {
        const lockerName = object.lockedBy || "another user";
        return {
          success: false,
          error: getObjectLockedMessage(lockerName),
        };
      }

      // Delete the object from Firestore
      await firestoreDeleteObject(canvasId, objectId);

      // Get object type for message
      const objectType = object.type || "object";

      // Return success with fun message
      return {
        success: true,
        id: objectId,
        message: getDeleteObjectMessage({ type: objectType }),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Tool] Failed to delete object:`, error);
      return {
        success: false,
        error: `Failed to delete object: ${errorMessage}`,
      };
    }
  },
});

// ============================================================================
// Get Canvas Objects Tool
// ============================================================================

export const getCanvasObjects = tool({
  description:
    "Query the current state of the canvas. Use this to find specific objects by type or properties, see what objects exist, or understand the canvas layout. Returns full object details including positions, colors, and text content.",
  inputSchema: z.object({
    filter: z
      .enum(["all", "selected"])
      .optional()
      .default("all")
      .describe(
        "Filter objects: 'all' for all objects, 'selected' for only selected objects"
      ),
    objectType: z
      .enum(["rectangle", "circle", "line", "text"])
      .optional()
      .describe(
        "Filter by object type. Leave empty to include all types."
      ),
    textContains: z
      .string()
      .optional()
      .describe(
        "For text objects, filter by text content (case-insensitive partial match). E.g., 'hello' matches 'Hello World'"
      ),
  }),
  execute: async ({ filter, objectType, textContains }, { experimental_context }) => {
    try {
      const context = experimental_context as ToolContext;
      const { canvasId, selectedIds = [] } = context;

      // Get all objects from Firestore using server-side helper
      const { getAllObjectsServerSide } = await import("@/lib/firebase/admin-helpers");
      const allObjects = await getAllObjectsServerSide(canvasId);

      // Handle empty canvas case
      if (allObjects.length === 0) {
        return {
          success: true,
          message: getCanvasEmptyMessage(),
          objectCount: 0,
          objects: [],
        };
      }

      // Start with all objects or selected objects based on filter
      let filteredObjects = allObjects;
      if (filter === "selected") {
        const selectedIdsSet = new Set(selectedIds);
        filteredObjects = allObjects.filter((obj) => selectedIdsSet.has(obj.id));

        if (filteredObjects.length === 0) {
          return {
            success: true,
            message: getNoSelectionMessage(),
            objects: [],
          };
        }
      }

      // Apply object type filter
      if (objectType) {
        filteredObjects = filteredObjects.filter((obj) => obj.type === objectType);
      }

      // Apply text content filter (case-insensitive)
      if (textContains) {
        filteredObjects = filteredObjects.filter((obj) => {
          if (obj.type === "text") {
            const textObj = obj as any;
            const content = textObj.content || "";
            return content.toLowerCase().includes(textContains.toLowerCase());
          }
          return false;
        });
      }

      // Build response message
      let message = "";
      if (filteredObjects.length === 0) {
        if (objectType && textContains) {
          message = `No ${objectType} objects found with text containing "${textContains}"`;
        } else if (objectType) {
          message = `No ${objectType} objects found on the canvas`;
        } else if (textContains) {
          message = `No text objects found containing "${textContains}"`;
        } else {
          message = getCanvasEmptyMessage();
        }
        return {
          success: true,
          message,
          objectCount: 0,
          objects: [],
        };
      }

      // Success - return filtered objects with details
      if (objectType && textContains) {
        message = `Found ${filteredObjects.length} ${objectType} object(s) containing "${textContains}"`;
      } else if (objectType) {
        message = `Found ${filteredObjects.length} ${objectType} object(s)`;
      } else if (textContains) {
        message = `Found ${filteredObjects.length} text object(s) containing "${textContains}"`;
      } else if (filter === "selected") {
        message = getSelectionCountMessage(filteredObjects.length);
      } else {
        const countMessage = getObjectCountMessage(allObjects.length);
        message = countMessage;

        // Check for milestone
        const milestoneMessage = getMilestoneMessage(allObjects.length);
        if (milestoneMessage) {
          message = `${message} ${milestoneMessage}`;
        }
      }

      return {
        success: true,
        message,
        objectCount: filteredObjects.length,
        objects: filteredObjects, // Return full object details
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
  deleteObject,
  getCanvasObjects,
};
