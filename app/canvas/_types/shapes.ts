/**
 * Shape type definitions
 * Local representations of canvas shapes
 */

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
 * Persisted circle/ellipse shape (local representation)
 * Uses radiusX and radiusY to support both circles and ellipses
 */
export interface PersistedCircle {
  id: string;
  type: "circle";
  x: number; // center x
  y: number; // center y
  radiusX: number; // horizontal radius
  radiusY: number; // vertical radius
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number; // Ellipses can rotate
  // Lock info
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;
}

/**
 * Union type for all local shape types
 */
export type PersistedShape = PersistedRect | PersistedCircle;

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
  toFirestore: (shape: T, userId: string) => any;

  /**
   * Convert Firestore CanvasObject to local shape
   */
  fromFirestore: (obj: any) => T | null;

  /**
   * Check if shape meets minimum size requirements
   */
  validateSize: (shape: T) => boolean;

  /**
   * Normalize drawing coordinates (handle negative width/height)
   */
  normalizeDrawing: (start: Point, current: Point) => DrawingBounds;

  /**
   * Get draft shape data for preview rendering
   */
  getDraftData: (draft: DrawingBounds) => any;
}

