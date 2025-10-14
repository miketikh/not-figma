/**
 * Shape factories for canvas objects
 * Centralizes shape creation, conversion, and drawing logic
 */

import { CanvasObject, RectangleObject } from "@/types/canvas";
import { generateObjectId } from "./objects";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";
import type {
  Point,
  DrawingBounds,
  PersistedRect,
  PersistedCircle,
  ShapeFactory,
} from "../_types/shapes";

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
   */
  createDefault: ({ x, y, width, height }: DrawingBounds): PersistedRect => {
    return {
      id: generateObjectId(),
      type: "rectangle",
      x,
      y,
      width,
      height,
      fill: "rgba(59, 130, 246, 0.3)",
      stroke: "#3b82f6",
      strokeWidth: 2,
      rotation: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
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
  toFirestore: (rect: PersistedRect, userId: string): RectangleObject => {
    const now = Date.now();

    return {
      id: rect.id,
      type: "rectangle",

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
      fillOpacity: 1,
      stroke: rect.stroke,
      strokeWidth: rect.strokeWidth,
      strokeOpacity: 1,
      strokeStyle: "solid",

      // Layer
      zIndex: 0,

      // Interaction
      locked: false,
      visible: true,

      // Optional
      cornerRadius: 0,
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
      x: rectObj.x,
      y: rectObj.y,
      width: rectObj.width,
      height: rectObj.height,
      fill: rectObj.fill,
      stroke: rectObj.stroke,
      strokeWidth: rectObj.strokeWidth,
      rotation: rectObj.rotation,
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
   */
  getDraftData: (draft: DrawingBounds) => {
    return {
      type: "rect" as const,
      props: {
        x: draft.x,
        y: draft.y,
        width: draft.width,
        height: draft.height,
        fill: "rgba(59, 130, 246, 0.3)",
        stroke: "#3b82f6",
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
   */
  createDefault: ({ x, y, width, height }: DrawingBounds): PersistedCircle => {
    // Calculate radiusX and radiusY from bounding box
    const radiusX = (width || 0) / 2;
    const radiusY = (height || 0) / 2;
    
    // Center position is the center of the bounding box
    const centerX = x + (width || 0) / 2;
    const centerY = y + (height || 0) / 2;
    
    return {
      id: generateObjectId(),
      type: "circle",
      x: centerX,
      y: centerY,
      radiusX,
      radiusY,
      fill: "rgba(236, 72, 153, 0.3)",
      stroke: "#ec4899",
      strokeWidth: 2,
      rotation: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
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
  toFirestore: (circle: PersistedCircle, userId: string): CanvasObject => {
    const now = Date.now();
    
    // Convert radiusX and radiusY to width and height (diameter)
    const width = (circle.radiusX || 0) * 2;
    const height = (circle.radiusY || 0) * 2;

    return {
      id: circle.id,
      type: "circle",

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
      fillOpacity: 1,
      stroke: circle.stroke,
      strokeWidth: circle.strokeWidth,
      strokeOpacity: 1,
      strokeStyle: "solid",

      // Layer
      zIndex: 0,

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
    const radiusX = (circleObj.width || 0) / 2;
    const radiusY = (circleObj.height || 0) / 2;
    
    return {
      id: circleObj.id,
      type: "circle",
      x: circleObj.x,
      y: circleObj.y,
      radiusX,
      radiusY,
      fill: circleObj.fill,
      stroke: circleObj.stroke,
      strokeWidth: circleObj.strokeWidth,
      rotation: circleObj.rotation || 0,
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
   */
  getDraftData: (draft: DrawingBounds) => {
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
        fill: "rgba(236, 72, 153, 0.3)",
        stroke: "#ec4899",
      },
    };
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

