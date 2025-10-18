/**
 * Shape factories for canvas objects
 * Centralizes shape creation, conversion, and drawing logic
 */

import {
  CanvasObject,
  RectangleObject,
  LineObject,
  TextObject,
} from "@/types/canvas";
import { generateObjectId } from "./objects";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";
import type {
  Point,
  DrawingBounds,
  PersistedRect,
  PersistedCircle,
  PersistedLine,
  PersistedText,
  ShapeFactory,
} from "../_types/shapes";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize numeric values to prevent NaN and enforce bounds
 * Used when converting Firestore objects to prevent invalid data from breaking the UI
 */
function sanitizeNumber(
  val: number,
  defaultVal: number,
  min?: number,
  max?: number
): number {
  if (val == null || !isFinite(val) || isNaN(val)) return defaultVal;
  if (min !== undefined && val < min) return min;
  if (max !== undefined && val > max) return max;
  return val;
}

// ============================================================================
// Rectangle Factory
// ============================================================================

/**
 * Rectangle shape factory
 * Handles creation, conversion, and validation of rectangles
 */
export const rectangleFactory: ShapeFactory<PersistedRect> = {
  /**
   * Create a rectangle with default styling
   * Optional overrides parameter allows customizing default properties
   */
  createDefault: (
    { x, y, width, height }: DrawingBounds,
    overrides?: Partial<PersistedRect>,
    canvasId?: string
  ): PersistedRect => {
    return {
      id: generateObjectId(),
      type: "rectangle",
      canvasId: canvasId || "",
      x,
      y,
      width,
      height,
      fill: "rgba(59, 130, 246, 0.3)",
      stroke: "#3b82f6",
      strokeWidth: 2,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      cornerRadius: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
      ...overrides, // Apply any custom overrides
    };
  },

  /**
   * Create rectangle from draft drawing bounds
   */
  createFromDraft: (draft: DrawingBounds): PersistedRect => {
    return rectangleFactory.createDefault(draft);
  },

  /**
   * Convert local PersistedRect to Firestore RectangleObject
   */
  toFirestore: (
    rect: PersistedRect,
    userId: string,
    canvasId?: string
  ): RectangleObject => {
    const now = Date.now();

    return {
      id: rect.id,
      type: "rectangle",
      canvasId: canvasId || "",

      // Ownership & Sync
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,

      // Locking
      lockedBy: rect.lockedBy,
      lockedAt: rect.lockedAt,
      lockTimeout: rect.lockTimeout,

      // Transform
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotation: rect.rotation,

      // Styling
      fill: rect.fill,
      fillOpacity: rect.opacity,
      stroke: rect.stroke,
      strokeWidth: rect.strokeWidth,
      strokeOpacity: rect.opacity,
      strokeStyle: "solid",

      // Layer
      zIndex: rect.zIndex,

      // Interaction
      locked: false,
      visible: true,

      // Optional
      cornerRadius: rect.cornerRadius || 0,
    };
  },

  /**
   * Convert Firestore RectangleObject to local PersistedRect
   */
  fromFirestore: (obj: CanvasObject): PersistedRect | null => {
    if (obj.type !== "rectangle") return null;

    const rectObj = obj as RectangleObject;
    return {
      id: rectObj.id,
      type: "rectangle",
      canvasId: rectObj.canvasId || "",
      x: sanitizeNumber(rectObj.x, 0),
      y: sanitizeNumber(rectObj.y, 0),
      width: sanitizeNumber(rectObj.width, 100, 1, 10000),
      height: sanitizeNumber(rectObj.height, 100, 1, 10000),
      fill: rectObj.fill,
      stroke: rectObj.stroke,
      strokeWidth: sanitizeNumber(rectObj.strokeWidth, 0, 0, 100),
      rotation: sanitizeNumber(rectObj.rotation, 0),
      opacity: sanitizeNumber(rectObj.fillOpacity, 1, 0, 1),
      zIndex: sanitizeNumber(rectObj.zIndex, 0),
      cornerRadius: sanitizeNumber(rectObj.cornerRadius, 0, 0, 500),
      lockedBy: rectObj.lockedBy,
      lockedAt: rectObj.lockedAt,
      lockTimeout: rectObj.lockTimeout,
    };
  },

  /**
   * Validate rectangle meets minimum size requirements
   */
  validateSize: (rect: PersistedRect): boolean => {
    return rect.width >= 5 && rect.height >= 5;
  },

  /**
   * Normalize drawing coordinates to handle dragging in any direction
   */
  normalizeDrawing: (start: Point, current: Point): DrawingBounds => {
    let width = current.x - start.x;
    let height = current.y - start.y;
    let x = start.x;
    let y = start.y;

    // Handle negative width (dragging left)
    if (width < 0) {
      x = current.x;
      width = Math.abs(width);
    }

    // Handle negative height (dragging up)
    if (height < 0) {
      y = current.y;
      height = Math.abs(height);
    }

    return { x, y, width, height };
  },

  /**
   * Get draft rectangle data for preview rendering
   * Accepts optional style overrides to match user's default properties
   */
  getDraftData: (draft: DrawingBounds, styleOverrides = {}) => {
    return {
      type: "rect" as const,
      props: {
        x: draft.x,
        y: draft.y,
        width: draft.width,
        height: draft.height,
        fill: styleOverrides.fill ?? "rgba(59, 130, 246, 0.3)",
        stroke: styleOverrides.stroke ?? "#3b82f6",
        opacity: styleOverrides.opacity,
        cornerRadius: styleOverrides.cornerRadius,
      },
    };
  },
};

// ============================================================================
// Circle Factory
// ============================================================================

/**
 * Circle/Ellipse shape factory
 * Handles creation, conversion, and validation of circles and ellipses
 */
export const circleFactory: ShapeFactory<PersistedCircle> = {
  /**
   * Create a circle/ellipse with default styling
   * Optional overrides parameter allows customizing default properties
   */
  createDefault: (
    { x, y, width, height }: DrawingBounds,
    overrides?: Partial<PersistedCircle>,
    canvasId?: string
  ): PersistedCircle => {
    // Calculate radiusX and radiusY from bounding box
    const radiusX = (width || 0) / 2;
    const radiusY = (height || 0) / 2;

    // Center position is the center of the bounding box
    const centerX = x + (width || 0) / 2;
    const centerY = y + (height || 0) / 2;

    return {
      id: generateObjectId(),
      type: "circle",
      canvasId: canvasId || "",
      x: centerX,
      y: centerY,
      radiusX,
      radiusY,
      fill: "rgba(236, 72, 153, 0.3)",
      stroke: "#ec4899",
      strokeWidth: 2,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
      ...overrides, // Apply any custom overrides
    };
  },

  /**
   * Create circle from draft drawing bounds
   */
  createFromDraft: (draft: DrawingBounds): PersistedCircle => {
    return circleFactory.createDefault(draft);
  },

  /**
   * Convert local PersistedCircle to Firestore CircleObject
   */
  toFirestore: (
    circle: PersistedCircle,
    userId: string,
    canvasId?: string
  ): CanvasObject => {
    const now = Date.now();

    // Convert radiusX and radiusY to width and height (diameter)
    const width = (circle.radiusX || 0) * 2;
    const height = (circle.radiusY || 0) * 2;

    return {
      id: circle.id,
      type: "circle",
      canvasId: canvasId || "",

      // Ownership & Sync
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,

      // Locking
      lockedBy: circle.lockedBy,
      lockedAt: circle.lockedAt,
      lockTimeout: circle.lockTimeout,

      // Transform (CircleObject uses width/height as diameters)
      x: circle.x || 0,
      y: circle.y || 0,
      width,
      height,
      rotation: circle.rotation,

      // Styling
      fill: circle.fill,
      fillOpacity: circle.opacity,
      stroke: circle.stroke,
      strokeWidth: circle.strokeWidth,
      strokeOpacity: circle.opacity,
      strokeStyle: "solid",

      // Layer
      zIndex: circle.zIndex,

      // Interaction
      locked: false,
      visible: true,
    };
  },

  /**
   * Convert Firestore CircleObject to local PersistedCircle
   */
  fromFirestore: (obj: CanvasObject): PersistedCircle | null => {
    if (obj.type !== "circle") return null;

    const circleObj = obj as any;
    // CircleObject stores diameters as width/height, convert to radiusX/radiusY
    const radiusX = sanitizeNumber(circleObj.width, 100, 1, 10000) / 2;
    const radiusY = sanitizeNumber(circleObj.height, 100, 1, 10000) / 2;

    return {
      id: circleObj.id,
      type: "circle",
      canvasId: circleObj.canvasId || "",
      x: sanitizeNumber(circleObj.x, 0),
      y: sanitizeNumber(circleObj.y, 0),
      radiusX,
      radiusY,
      fill: circleObj.fill,
      stroke: circleObj.stroke,
      strokeWidth: sanitizeNumber(circleObj.strokeWidth, 0, 0, 100),
      rotation: sanitizeNumber(circleObj.rotation, 0),
      opacity: sanitizeNumber(circleObj.fillOpacity, 1, 0, 1),
      zIndex: sanitizeNumber(circleObj.zIndex, 0),
      lockedBy: circleObj.lockedBy,
      lockedAt: circleObj.lockedAt,
      lockTimeout: circleObj.lockTimeout,
    };
  },

  /**
   * Validate circle/ellipse meets minimum size requirements
   */
  validateSize: (circle: PersistedCircle): boolean => {
    return circle.radiusX >= 5 && circle.radiusY >= 5;
  },

  /**
   * Normalize drawing coordinates for circle/ellipse
   * Calculates bounding box from drag distance
   */
  normalizeDrawing: (start: Point, current: Point): DrawingBounds => {
    // Same as rectangle normalization - we'll convert to radiusX/radiusY in createDefault
    let width = current.x - start.x;
    let height = current.y - start.y;
    let x = start.x;
    let y = start.y;

    if (width < 0) {
      x = current.x;
      width = Math.abs(width);
    }

    if (height < 0) {
      y = current.y;
      height = Math.abs(height);
    }

    return { x, y, width, height };
  },

  /**
   * Get draft circle/ellipse data for preview rendering
   * Accepts optional style overrides to match user's default properties
   */
  getDraftData: (draft: DrawingBounds, styleOverrides = {}) => {
    const radiusX = draft.width / 2;
    const radiusY = draft.height / 2;
    const centerX = draft.x + draft.width / 2;
    const centerY = draft.y + draft.height / 2;

    return {
      type: "ellipse" as const,
      props: {
        x: centerX,
        y: centerY,
        radiusX,
        radiusY,
        fill: styleOverrides.fill ?? "rgba(236, 72, 153, 0.3)",
        stroke: styleOverrides.stroke ?? "#ec4899",
        opacity: styleOverrides.opacity,
      },
    };
  },
};

// ============================================================================
// Line Factory
// ============================================================================

/**
 * Line shape factory
 * Handles creation, conversion, and validation of lines
 */
export const lineFactory: ShapeFactory<PersistedLine> = {
  /**
   * Create a line with default styling
   * Optional overrides parameter allows customizing default properties
   */
  createDefault: (
    { x, y, width, height }: DrawingBounds,
    overrides?: Partial<PersistedLine>,
    canvasId?: string
  ): PersistedLine => {
    // Convert bounding box to line endpoints
    const x2 = x + width;
    const y2 = y + height;

    return {
      id: generateObjectId(),
      type: "line",
      canvasId: canvasId || "",
      x,
      y,
      x2,
      y2,
      stroke: "#a855f7", // Purple
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
      ...overrides, // Apply any custom overrides
    };
  },

  /**
   * Create line from draft drawing bounds
   */
  createFromDraft: (draft: DrawingBounds): PersistedLine => {
    return lineFactory.createDefault(draft);
  },

  /**
   * Convert local PersistedLine to Firestore LineObject
   */
  toFirestore: (
    line: PersistedLine,
    userId: string,
    canvasId?: string
  ): LineObject => {
    const now = Date.now();

    return {
      id: line.id,
      type: "line",
      canvasId: canvasId || "",

      // Ownership & Sync
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,

      // Locking
      lockedBy: line.lockedBy,
      lockedAt: line.lockedAt,
      lockTimeout: line.lockTimeout,

      // Transform (lines use x, y, x2, y2 instead of width/height)
      x: line.x,
      y: line.y,
      x2: line.x2,
      y2: line.y2,
      rotation: 0, // Lines don't rotate

      // Styling (lines don't have fill)
      stroke: line.stroke,
      strokeWidth: line.strokeWidth,
      strokeOpacity: line.opacity,
      strokeStyle: "solid",

      // Layer
      zIndex: line.zIndex,

      // Interaction
      locked: false,
      visible: true,
    };
  },

  /**
   * Convert Firestore LineObject to local PersistedLine
   */
  fromFirestore: (obj: CanvasObject): PersistedLine | null => {
    if (obj.type !== "line") return null;

    const lineObj = obj as LineObject;
    return {
      id: lineObj.id,
      type: "line",
      canvasId: lineObj.canvasId || "",
      x: sanitizeNumber(lineObj.x, 0),
      y: sanitizeNumber(lineObj.y, 0),
      x2: sanitizeNumber(lineObj.x2, 100),
      y2: sanitizeNumber(lineObj.y2, 100),
      stroke: lineObj.stroke,
      strokeWidth: sanitizeNumber(lineObj.strokeWidth, 2, 0, 100),
      opacity: sanitizeNumber(lineObj.strokeOpacity, 1, 0, 1),
      zIndex: sanitizeNumber(lineObj.zIndex, 0),
      lockedBy: lineObj.lockedBy,
      lockedAt: lineObj.lockedAt,
      lockTimeout: lineObj.lockTimeout,
    };
  },

  /**
   * Validate line meets minimum length requirements
   */
  validateSize: (line: PersistedLine): boolean => {
    // Calculate line length using distance formula
    const dx = line.x2 - line.x;
    const dy = line.y2 - line.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return length >= 10; // Minimum 10 pixels
  },

  /**
   * Normalize drawing coordinates to handle dragging in any direction
   * For lines, we DON'T normalize - the start point stays fixed!
   */
  normalizeDrawing: (start: Point, current: Point): DrawingBounds => {
    // For lines, keep the start point FIXED and allow negative width/height
    // This lets us drag in any direction from the anchor point
    const width = current.x - start.x;
    const height = current.y - start.y;

    return {
      x: start.x,
      y: start.y,
      width,
      height,
    };
  },

  /**
   * Get draft line data for preview rendering
   * Accepts optional style overrides to match user's default properties
   */
  getDraftData: (draft: DrawingBounds, styleOverrides = {}) => {
    return {
      type: "line" as const,
      props: {
        points: [
          draft.x,
          draft.y,
          draft.x + draft.width,
          draft.y + draft.height,
        ],
        stroke: styleOverrides.stroke ?? "#a855f7",
        strokeWidth: styleOverrides.strokeWidth ?? 2,
        opacity: styleOverrides.opacity ?? 1,
      },
    };
  },
};

// ============================================================================
// Text Factory
// ============================================================================

/**
 * Text shape factory
 * Handles creation, conversion, and validation of text objects
 * Full typography support with all text properties
 */
export const textFactory: ShapeFactory<PersistedText> = {
  /**
   * Create a text with default styling
   * Optional overrides parameter allows customizing default properties
   */
  createDefault: (
    { x, y, width, height }: DrawingBounds,
    overrides?: Partial<PersistedText>,
    canvasId?: string
  ): PersistedText => {
    return {
      id: generateObjectId(),
      type: "text",
      canvasId: canvasId || "",
      x,
      y,
      width: width || 100, // Default width
      height: height || 30, // Default height (will auto-adjust)
      content: "Text",
      fontSize: 16,
      fontFamily: "Arial",
      fontWeight: "normal",
      fontStyle: "normal",
      textAlign: "left",
      textDecoration: "none",
      lineHeight: 1.2,
      fill: "#000000", // Black text
      stroke: "#000000",
      strokeWidth: 0, // No outline by default
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
      ...overrides, // Apply any custom overrides
    };
  },

  /**
   * Create text from draft (not really used for click-to-place, but required by interface)
   */
  createFromDraft: (draft: DrawingBounds): PersistedText => {
    return textFactory.createDefault(draft);
  },

  /**
   * Convert local PersistedText to Firestore TextObject
   */
  toFirestore: (
    text: PersistedText,
    userId: string,
    canvasId?: string
  ): TextObject => {
    const now = Date.now();

    return {
      id: text.id,
      type: "text",
      canvasId: canvasId || "",

      // Ownership & Sync
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,

      // Locking
      lockedBy: text.lockedBy,
      lockedAt: text.lockedAt,
      lockTimeout: text.lockTimeout,

      // Transform
      x: text.x,
      y: text.y,
      width: text.width,
      height: text.height,
      rotation: text.rotation,

      // Text Content
      content: text.content,
      fontSize: text.fontSize,

      // Typography
      fontFamily: text.fontFamily,
      fontWeight: text.fontWeight,
      fontStyle: text.fontStyle,
      textAlign: text.textAlign,
      textDecoration: text.textDecoration,
      lineHeight: text.lineHeight,

      // Styling
      fill: text.fill,
      fillOpacity: text.opacity,
      stroke: text.stroke,
      strokeWidth: text.strokeWidth,
      strokeOpacity: text.opacity,
      strokeStyle: "solid",

      // Layer
      zIndex: text.zIndex,

      // Interaction
      locked: false,
      visible: true,
    };
  },

  /**
   * Convert Firestore TextObject to local PersistedText
   */
  fromFirestore: (obj: CanvasObject): PersistedText | null => {
    if (obj.type !== "text") return null;

    const textObj = obj as TextObject;

    return {
      id: textObj.id,
      type: "text",
      canvasId: textObj.canvasId || "",
      x: sanitizeNumber(textObj.x, 0), // Default to origin if NaN
      y: sanitizeNumber(textObj.y, 0), // Default to origin if NaN
      width: sanitizeNumber(textObj.width, 100, 10, 10000), // Min 10px, max 10000px
      height: sanitizeNumber(textObj.height, 30, 10, 10000), // Min 10px, max 10000px
      content: textObj.content,
      fontSize: sanitizeNumber(textObj.fontSize, 16, 8, 500), // Min 8px, max 500px
      fontFamily: textObj.fontFamily || "Arial", // backward compatibility
      fontWeight: textObj.fontWeight || "normal", // backward compatibility
      fontStyle: textObj.fontStyle || "normal", // backward compatibility
      textAlign: textObj.textAlign || "left", // backward compatibility
      textDecoration: textObj.textDecoration || "none", // backward compatibility
      lineHeight: textObj.lineHeight ?? 1.2, // backward compatibility
      fill: textObj.fill,
      stroke: textObj.stroke || "#000000", // backward compatibility
      strokeWidth: textObj.strokeWidth ?? 0, // backward compatibility
      rotation: sanitizeNumber(textObj.rotation, 0),
      opacity: sanitizeNumber(textObj.fillOpacity, 1, 0, 1), // 0-1 range
      zIndex: sanitizeNumber(textObj.zIndex, 0),
      lockedBy: textObj.lockedBy,
      lockedAt: textObj.lockedAt,
      lockTimeout: textObj.lockTimeout,
    };
  },

  /**
   * Validate text has content
   */
  validateSize: (): boolean => {
    // Allow empty text for MVP (user can edit in properties panel)
    return true;
    // Alternative: return text.content.length > 0;
  },

  /**
   * Normalize drawing coordinates (not really used for text, but required by interface)
   */
  normalizeDrawing: (start: Point): DrawingBounds => {
    // Text is click-to-place, not drag-to-draw
    // Just return the click position
    return {
      x: start.x,
      y: start.y,
      width: 100,
      height: 30,
    };
  },

  /**
   * Get draft text data for preview rendering
   * For MVP, text doesn't show draft preview (click-to-place)
   */
  getDraftData: () => {
    return null; // No draft preview for text tool
  },
};

// ============================================================================
// Shape Factory Registry
// ============================================================================

/**
 * Map of shape type to factory
 * Add new shape factories here as they are implemented
 */
export const shapeFactories: Record<string, ShapeFactory<any>> = {
  rectangle: rectangleFactory,
  circle: circleFactory,
  line: lineFactory,
  text: textFactory,
};

/**
 * Get shape factory by type
 * Returns undefined if no factory exists for the given type
 */
export function getShapeFactory(type: string): ShapeFactory<any> | undefined {
  return shapeFactories[type];
}

/**
 * Check if a shape factory exists for the given type
 */
export function hasShapeFactory(type: string): boolean {
  return type in shapeFactories;
}
