/**
 * AI type definitions
 * Types for AI commands, context, and function calling (Phase 3)
 */

import { CanvasObject, Viewport } from "./canvas";

/**
 * AI command
 */
export interface AICommand {
  id: string;
  userId: string;
  command: string;
  timestamp: number;
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    objectIds: string[];
    message: string;
  };
  error?: string;
}

/**
 * AI function call types
 */
export type AIFunction =
  | "createShape"
  | "moveShape"
  | "resizeShape"
  | "rotateShape"
  | "deleteShape"
  | "updateStyle"
  | "getCanvasState"
  | "selectObjects"
  | "arrangeLayout";

/**
 * AI context (for function calling)
 */
export interface AIContext {
  objects: CanvasObject[];
  selectedIds: string[];
  viewport: Viewport;
  userId: string;
  canvasId: string;
}

/**
 * Summary of selected object with full details
 */
export interface SelectedObjectSummary {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  colors: {
    fill?: string;
    stroke?: string;
  };
  rotation?: number;
  content?: string; // For text objects
}

/**
 * Object type counts for unselected objects
 */
export interface ObjectTypeCounts {
  rectangles: number;
  circles: number;
  lines: number;
  texts: number;
  total: number;
}

/**
 * Canvas context optimized for AI consumption (token-efficient)
 * Returned by buildCanvasContext() helper
 */
export interface CanvasContextResult {
  canvasId: string;
  userId: string;
  canvasWidth: number;
  canvasHeight: number;
  objectCount: number;
  selectedObjects: SelectedObjectSummary[];
  aiCreatedObjects: SelectedObjectSummary[];
  unselectedCounts: ObjectTypeCounts;
  summary: string;
  lastCreatedObjectId?: string | null;
}

/**
 * AI tool execution result
 */
export interface AIToolResult {
  toolName: string;
  success: boolean;
  objectIds?: string[];
  message: string;
  error?: string;
}

/**
 * AI chat message
 */
export interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolResults?: AIToolResult[];
}
