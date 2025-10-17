/**
 * Canvas configuration constants
 * Centralized configuration for canvas creation and management
 */

/**
 * Default canvas name for new canvases
 */
export const DEFAULT_CANVAS_NAME = "Untitled Canvas";

/**
 * Default canvas dimensions (1920x1080 - Full HD)
 */
export const DEFAULT_CANVAS_WIDTH = 1920;
export const DEFAULT_CANVAS_HEIGHT = 1080;

/**
 * Canvas dimension constraints
 */
export const MIN_CANVAS_DIMENSION = 100;
export const MAX_CANVAS_DIMENSION = 10000;

/**
 * Maximum canvas name length
 */
export const MAX_CANVAS_NAME_LENGTH = 100;

/**
 * Preset canvas dimensions
 * Common canvas size presets for quick selection
 */
export const CANVAS_DIMENSION_PRESETS = [
  {
    name: "1920×1080 (HD)",
    width: 1920,
    height: 1080,
  },
  {
    name: "1024×768 (Standard)",
    width: 1024,
    height: 768,
  },
  {
    name: "800×600 (Small)",
    width: 800,
    height: 600,
  },
] as const;
