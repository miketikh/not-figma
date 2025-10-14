/**
 * Canvas object creation and manipulation helpers
 */

/**
 * Generate a unique ID for canvas objects
 */
export function generateObjectId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
