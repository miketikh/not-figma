/**
 * Shape factories for canvas objects
 * Centralizes shape creation, conversion, and drawing logic
 */

import { CanvasObject, RectangleObject } from "@/types/canvas";
import { generateObjectId } from "./objects";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Point in canvas space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Drawing bounds (normalized, always positive width/height)
 */
export interface DrawingBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Persisted rectangle shape (local representation)
 */
export interface PersistedRect {
  id: string;
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number;
  // Lock info
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;
}

/**
 * Generic shape factory interface
 * All shape types should implement this interface
 */
export interface ShapeFactory<T> {
  /**
   * Create a shape with default styling
   */
  createDefault: (params: any) => T;

  /**
   * Convert draft drawing bounds to final shape
   */
  createFromDraft: (draft: DrawingBounds) => T;

  /**
   * Convert local shape to Firestore CanvasObject
   */
  toFirestore: (shape: T, userId: string) => CanvasObject;

  /**
   * Convert Firestore CanvasObject to local shape
   */
  fromFirestore: (obj: CanvasObject) => T | null;

  /**
   * Check if shape meets minimum size requirements
   */
  validateSize: (shape: T) => boolean;

  /**
   * Normalize drawing coordinates (handle negative width/height)
   */
  normalizeDrawing: (start: Point, current: Point) => DrawingBounds;
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
  // circle: circleFactory,      // Will be added in PR #6
  // line: lineFactory,          // Will be added in PR #7
  // text: textFactory,          // Will be added in PR #8
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

