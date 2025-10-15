import type { PersistedShape } from "../_types/shapes";
import { isLockedByOtherUser } from "./locks";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";

/**
 * Find all objects that intersect with a given rectangle.
 * Automatically filters out objects locked by other users.
 *
 * @param rect - The selection rectangle to check against
 * @param objects - Array of all canvas objects
 * @param currentUserId - The current user's ID (null if not authenticated)
 * @returns Array of selectable object IDs that intersect with the rectangle
 */
export function getIntersectingObjects(
  rect: { x: number; y: number; width: number; height: number },
  objects: PersistedShape[],
  currentUserId: string | null
): string[] {
  return objects
    .filter((obj) => {
      // Filter out objects locked by other users
      const lockedByOther = isLockedByOtherUser(
        obj.lockedBy,
        obj.lockedAt,
        obj.lockTimeout || LOCK_TIMEOUT_MS,
        currentUserId
      );
      if (lockedByOther) return false;

      // Check if object intersects with selection rectangle
      return checkObjectIntersection(obj, rect);
    })
    .map((obj) => obj.id);
}

/**
 * Check if a single object is fully contained within a rectangle.
 * Objects must be completely inside the selection rectangle to be selected.
 *
 * @param obj - The canvas object to check
 * @param rect - The selection rectangle
 * @returns True if the object is fully contained within the rectangle
 */
function checkObjectIntersection(
  obj: PersistedShape,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Get object bounding box based on type
  const objBounds = getObjectBounds(obj);

  // Check if object is fully contained within selection rectangle
  return (
    objBounds.x >= rect.x &&
    objBounds.y >= rect.y &&
    objBounds.x + objBounds.width <= rect.x + rect.width &&
    objBounds.y + objBounds.height <= rect.y + rect.height
  );
}

/**
 * Get the bounding box for any canvas object.
 * Handles different shape types and accounts for rotation.
 *
 * @param obj - The canvas object
 * @returns Bounding box with x, y, width, height
 */
function getObjectBounds(obj: PersistedShape): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (obj.type === "rectangle") {
    // Account for rotation by calculating the rotated bounding box
    const rotation = obj.rotation || 0;
    if (rotation === 0) {
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      };
    }

    // Calculate the 4 corners of the rotated rectangle
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const corners = [
      { x: 0, y: 0 },
      { x: obj.width, y: 0 },
      { x: obj.width, y: obj.height },
      { x: 0, y: obj.height },
    ];

    // Rotate each corner around the origin, then offset by obj.x, obj.y
    const rotatedCorners = corners.map((corner) => ({
      x: obj.x + corner.x * cos - corner.y * sin,
      y: obj.y + corner.x * sin + corner.y * cos,
    }));

    // Find the bounding box of the rotated corners
    const xs = rotatedCorners.map((c) => c.x);
    const ys = rotatedCorners.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } else if (obj.type === "circle") {
    // Circle is centered at (x, y) with radiusX and radiusY
    return {
      x: obj.x - obj.radiusX,
      y: obj.y - obj.radiusY,
      width: obj.radiusX * 2,
      height: obj.radiusY * 2,
    };
  } else if (obj.type === "line") {
    // Line defined by two points: (x, y) and (x2, y2)
    const minX = Math.min(obj.x, obj.x2);
    const maxX = Math.max(obj.x, obj.x2);
    const minY = Math.min(obj.y, obj.y2);
    const maxY = Math.max(obj.y, obj.y2);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } else if (obj.type === "text") {
    // Account for rotation
    const rotation = obj.rotation || 0;
    if (rotation === 0) {
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      };
    }

    // Calculate the 4 corners of the rotated text box
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const corners = [
      { x: 0, y: 0 },
      { x: obj.width, y: 0 },
      { x: obj.width, y: obj.height },
      { x: 0, y: obj.height },
    ];

    // Rotate each corner around the origin, then offset by obj.x, obj.y
    const rotatedCorners = corners.map((corner) => ({
      x: obj.x + corner.x * cos - corner.y * sin,
      y: obj.y + corner.x * sin + corner.y * cos,
    }));

    // Find the bounding box of the rotated corners
    const xs = rotatedCorners.map((c) => c.x);
    const ys = rotatedCorners.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // Default fallback
  return { x: 0, y: 0, width: 0, height: 0 };
}
