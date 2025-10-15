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
  opacity: number; // 0-1, affects entire shape
  zIndex: number; // layer order
  cornerRadius?: number; // optional rounded corners
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
  opacity: number; // 0-1, affects entire shape
  zIndex: number; // layer order
  // Lock info
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;
}

/**
 * Persisted line shape (local representation)
 * Lines are defined by two points (start and end)
 * No fill property - lines only have stroke
 */
export interface PersistedLine {
  id: string;
  type: "line";
  x: number; // start point x
  y: number; // start point y
  x2: number; // end point x
  y2: number; // end point y
  stroke: string;
  strokeWidth: number;
  opacity: number; // 0-1, affects entire line
  zIndex: number; // layer order
  // Lock info
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;
}

/**
 * Persisted text shape (local representation)
 * Full text support with all typography properties
 */
export interface PersistedText {
  id: string;
  type: "text";
  x: number; // top-left x
  y: number; // top-left y
  width: number; // bounding box width
  height: number; // bounding box height (auto-adjusts to content)
  content: string; // the actual text content
  fontSize: number; // font size in pixels
  fontFamily: string; // font family (Arial, Helvetica, etc.)
  fontWeight: "normal" | "bold" | "lighter" | "bolder"; // font weight
  fontStyle: "normal" | "italic"; // font style
  textAlign: "left" | "center" | "right"; // text alignment
  textDecoration: "none" | "underline" | "line-through"; // text decoration
  lineHeight: number; // line height multiplier
  fill: string; // text color
  stroke: string; // text outline color
  strokeWidth: number; // text outline width
  rotation: number;
  opacity: number; // 0-1, affects entire text
  zIndex: number; // layer order
  // Lock info
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;
}

/**
 * Union type for all local shape types
 */
export type PersistedShape = PersistedRect | PersistedCircle | PersistedLine | PersistedText;

/**
 * Style overrides for draft preview rendering
 * Allows customizing the preview appearance to match user's default properties
 */
export interface DraftStyleOverrides {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  cornerRadius?: number; // for rectangles
}

/**
 * Generic shape factory interface
 * All shape types should implement this interface
 */
export interface ShapeFactory<T> {
  /**
   * Create a shape with default styling
   * Optional overrides parameter allows customizing default properties
   */
  createDefault: (params: any, overrides?: Partial<T>) => T;

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
   * Optional styleOverrides allows customizing the preview to match user defaults
   */
  getDraftData: (
    draft: DrawingBounds,
    styleOverrides?: DraftStyleOverrides
  ) => any;
}

