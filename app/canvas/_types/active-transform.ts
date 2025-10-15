/**
 * Active Transform types
 * Real-time broadcasting of in-progress object transformations
 */

/**
 * Base active transform data
 * Contains common fields for all shape types during transformation
 */
export interface BaseActiveTransform {
  userId: string;
  objectId: string;
  type: "rectangle" | "circle" | "line" | "text";
  x: number;
  y: number;
  rotation?: number;
  timestamp: number;
}

/**
 * Active transform for rectangles
 * Includes width, height, and optional corner radius
 */
export interface RectangleActiveTransform extends BaseActiveTransform {
  type: "rectangle";
  width: number;
  height: number;
  cornerRadius?: number;
}

/**
 * Active transform for circles/ellipses
 * Uses radiusX and radiusY for independent scaling
 */
export interface CircleActiveTransform extends BaseActiveTransform {
  type: "circle";
  radiusX: number;
  radiusY: number;
}

/**
 * Active transform for lines
 * Stores both endpoints
 */
export interface LineActiveTransform extends Omit<BaseActiveTransform, "rotation"> {
  type: "line";
  x2: number;
  y2: number;
}

/**
 * Active transform for text
 * Includes width and height for text box sizing
 */
export interface TextActiveTransform extends BaseActiveTransform {
  type: "text";
  width: number;
  height: number;
}

/**
 * Union type for any active transform
 */
export type ActiveTransform =
  | RectangleActiveTransform
  | CircleActiveTransform
  | LineActiveTransform
  | TextActiveTransform;

/**
 * Active transform with user display information
 * Merged with presence data for rendering
 */
export type ActiveTransformWithUser = ActiveTransform & {
  displayName: string;
  color: string;
};

/**
 * Map of object IDs to their active transforms
 * Used for subscription callbacks
 */
export type ActiveTransformMap = Record<string, ActiveTransform>;

/**
 * Map of object IDs to active transforms with user info
 * Ready for rendering
 */
export type ActiveTransformWithUserMap = Record<string, ActiveTransformWithUser>;
