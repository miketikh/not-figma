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
}

