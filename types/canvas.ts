/**
 * Canvas type definitions
 * Core types for canvas objects, viewport, and state management
 */

// ============================================================================
// Canvas Objects
// ============================================================================

/**
 * Base interface for all canvas objects
 * Contains common fields shared across all shape types
 */
export interface BaseCanvasObject {
  // Identity
  id: string;
  type: "rectangle" | "circle" | "line" | "text";

  // Ownership & Sync
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;

  // Collaborative Locking
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;

  // Transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  // Styling
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeStyle: "solid" | "dashed" | "dotted";

  // Layer Management
  zIndex: number;

  // Selection & Interaction
  locked: boolean;
  visible: boolean;

  // AI Attribution (optional, for Phase 3)
  createdByAI?: boolean;
  aiCommandId?: string;
}

/**
 * Rectangle object
 */
export interface RectangleObject extends BaseCanvasObject {
  type: "rectangle";
  cornerRadius?: number;
}

/**
 * Circle/Ellipse object
 * If width === height, it's a circle
 * If width !== height, it's an ellipse
 */
export interface CircleObject extends BaseCanvasObject {
  type: "circle";
}

/**
 * Line object
 * Lines don't use width/height/fill properties
 */
export interface LineObject
  extends Omit<
    BaseCanvasObject,
    "width" | "height" | "fill" | "fillOpacity"
  > {
  type: "line";
  x2: number;
  y2: number;
}

/**
 * Text object
 */
export interface TextObject extends BaseCanvasObject {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold" | "lighter" | "bolder";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  textDecoration: "none" | "underline" | "line-through";
  lineHeight: number;
}

/**
 * Union type for any canvas object
 */
export type CanvasObject =
  | RectangleObject
  | CircleObject
  | LineObject
  | TextObject;

// ============================================================================
// Viewport & Canvas State
// ============================================================================

/**
 * Viewport state (pan/zoom)
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * Canvas dimensions
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Available canvas tools
 */
export type CanvasTool =
  | "select"
  | "rectangle"
  | "circle"
  | "line"
  | "text"
  | "pan";

/**
 * Canvas state (local client state)
 */
export interface CanvasState {
  objects: Record<string, CanvasObject>;
  selectedIds: string[];
  viewport: Viewport;
  dimensions: CanvasDimensions;
  isDrawing: boolean;
  isPanning: boolean;
  tool: CanvasTool;
}

// ============================================================================
// Cursor & Presence
// ============================================================================

/**
 * Cursor position (high-frequency updates via Realtime Database)
 */
export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Maps for Realtime Database
 */
export type CursorMap = Record<string, CursorPosition>;

// ============================================================================
// Locking System
// ============================================================================

/**
 * Lock request
 */
export interface LockRequest {
  objectId: string;
  userId: string;
  timestamp: number;
}

/**
 * Lock response
 */
export interface LockResponse {
  success: boolean;
  lockedBy: string | null;
  expiresAt: number | null;
  message?: string;
}

/**
 * Lock helper functions interface
 */
export interface LockHelpers {
  acquireLock: (objectId: string, userId: string) => Promise<LockResponse>;
  releaseLock: (objectId: string, userId: string) => Promise<boolean>;
  renewLock: (objectId: string, userId: string) => Promise<boolean>;
  checkLock: (
    objectId: string
  ) => Promise<{ isLocked: boolean; lockedBy: string | null }>;
  isLockExpired: (lockedAt: number, lockTimeout: number) => boolean;
}

// ============================================================================
// Sync & Updates (for Phase 2)
// ============================================================================

/**
 * Object update (for delta updates)
 */
export interface ObjectUpdate {
  id: string;
  changes: Partial<CanvasObject>;
  updatedBy: string;
  updatedAt: number;
}

/**
 * Batch update (for message batching)
 */
export interface BatchUpdate {
  updates: ObjectUpdate[];
  timestamp: number;
}

/**
 * Object operation types
 */
export type ObjectOperation =
  | { type: "create"; object: CanvasObject }
  | { type: "update"; id: string; changes: Partial<CanvasObject> }
  | { type: "delete"; id: string }
  | { type: "batch"; operations: ObjectOperation[] };

// ============================================================================
// Selection & History (Phase 2)
// ============================================================================

/**
 * Selection state
 */
export interface Selection {
  ids: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * History entry (for undo/redo)
 */
export interface HistoryEntry {
  timestamp: number;
  operation: ObjectOperation;
  inverse: ObjectOperation;
}

/**
 * History state
 */
export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
}

