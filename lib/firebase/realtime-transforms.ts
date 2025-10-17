/**
 * Realtime Database helper functions for active transform broadcasting
 * High-frequency updates for real-time transform visibility (~50ms / 20 updates per second)
 *
 * IMPORTANT: All Realtime Database write operations use safe wrappers that
 * automatically filter out undefined values to prevent Firebase errors.
 */

import { ref, remove, onValue, Unsubscribe } from "firebase/database";
import { realtimeDb } from "./config";
import { safeSet } from "./realtime-utils";
import type {
  ActiveTransform,
  ActiveTransformMap,
  GroupActiveTransform,
  ObjectTransformData,
} from "@/app/canvas/_types/active-transform";

/**
 * Get the session path for active transforms
 */
function getTransformsSessionPath(
  canvasId: string,
  type: "activeTransforms" | "groupTransforms"
): string {
  return `sessions/${canvasId}/${type}`;
}

// ============================================================================
// Active Transform Functions (High-frequency updates ~50ms / 20 updates per second)
// ============================================================================

/**
 * Broadcast an active transform for an object
 * Called during drag/resize/rotate operations to show real-time updates to other users
 *
 * @param canvasId - The ID of the canvas
 * @param objectId - The ID of the object being transformed
 * @param userId - The ID of the user performing the transform
 * @param transformData - The current transform state
 */
export async function broadcastTransform(
  canvasId: string,
  objectId: string,
  userId: string,
  transformData: Omit<ActiveTransform, "userId" | "objectId" | "timestamp">
): Promise<void> {
  const transformRef = ref(
    realtimeDb,
    `${getTransformsSessionPath(canvasId, "activeTransforms")}/${objectId}`
  );

  const activeTransform: ActiveTransform = {
    ...transformData,
    userId,
    objectId,
    timestamp: Date.now(),
  } as ActiveTransform;

  // Use safe wrapper to automatically filter undefined values
  await safeSet(transformRef, activeTransform);
}

/**
 * Clear an active transform when transformation is complete
 * Called on dragEnd, transformEnd, or when user deselects object
 *
 * @param canvasId - The ID of the canvas
 * @param objectId - The ID of the object to clear transform for
 */
export async function clearTransform(
  canvasId: string,
  objectId: string
): Promise<void> {
  const transformRef = ref(
    realtimeDb,
    `${getTransformsSessionPath(canvasId, "activeTransforms")}/${objectId}`
  );
  await remove(transformRef);
}

/**
 * Clear all active transforms for a specific user
 * Useful for cleanup on disconnect or when user stops transforming
 *
 * @param canvasId - The ID of the canvas
 * @param userId - The ID of the user to clear transforms for
 * @param activeTransforms - Current active transforms map to filter
 */
export async function clearUserTransforms(
  canvasId: string,
  userId: string,
  activeTransforms: ActiveTransformMap
): Promise<void> {
  const objectIds = Object.keys(activeTransforms).filter(
    (objectId) => activeTransforms[objectId].userId === userId
  );

  await Promise.all(
    objectIds.map((objectId) => clearTransform(canvasId, objectId))
  );
}

/**
 * Subscribe to all active transforms
 * Returns real-time updates when any object is being transformed
 *
 * @param canvasId - The ID of the canvas
 * @param callback - Function called with updated transforms map
 * @returns Unsubscribe function
 */
export function subscribeToActiveTransforms(
  canvasId: string,
  callback: (transforms: ActiveTransformMap) => void
): Unsubscribe {
  const transformsRef = ref(
    realtimeDb,
    getTransformsSessionPath(canvasId, "activeTransforms")
  );

  return onValue(transformsRef, (snapshot) => {
    const transforms: ActiveTransformMap = snapshot.val() || {};
    callback(transforms);
  });
}

/**
 * Set up disconnect cleanup for a user's active transforms
 * Automatically removes all transforms when user disconnects
 */
export async function setupTransformDisconnectCleanup(): Promise<void> {
  // Note: Firebase onDisconnect works per-reference
  // We'll handle cleanup by removing transforms when the user's presence goes offline
  // The actual cleanup will be triggered by the presence disconnect handler
  // This function is a placeholder for potential future per-transform disconnect logic
  // Currently, transforms are ephemeral and will be cleaned up via the presence system
}

/**
 * Clean up stale transforms that haven't been updated recently
 * Should be called periodically to prevent abandoned transforms from lingering
 *
 * @param canvasId - The ID of the canvas
 * @param activeTransforms - Current active transforms map
 * @param maxAge - Maximum age in milliseconds (default 5 seconds)
 */
export async function cleanupStaleTransforms(
  canvasId: string,
  activeTransforms: ActiveTransformMap,
  maxAge: number = 5000
): Promise<void> {
  const now = Date.now();
  const staleObjectIds = Object.keys(activeTransforms).filter(
    (objectId) => now - activeTransforms[objectId].timestamp > maxAge
  );

  await Promise.all(
    staleObjectIds.map((objectId) => clearTransform(canvasId, objectId))
  );
}

// ============================================================================
// Group Transform Functions (Multi-select optimization)
// ============================================================================

/**
 * Broadcast a group transform for multiple objects being transformed together
 * Reduces broadcast frequency from N objects × 20/sec to 1 × 20/sec
 * Called during multi-select drag/resize/rotate operations
 *
 * @param canvasId - The ID of the canvas
 * @param objectIds - Array of object IDs being transformed together
 * @param userId - The ID of the user performing the transform
 * @param transforms - Map of objectId to transform data
 */
export async function broadcastGroupTransform(
  canvasId: string,
  objectIds: string[],
  userId: string,
  transforms: Record<string, ObjectTransformData>
): Promise<void> {
  const groupTransformRef = ref(
    realtimeDb,
    `${getTransformsSessionPath(canvasId, "groupTransforms")}/${userId}`
  );

  const groupTransform: GroupActiveTransform = {
    userId,
    objectIds,
    transforms,
    timestamp: Date.now(),
  };

  // Use safe wrapper to automatically filter undefined values
  await safeSet(groupTransformRef, groupTransform);
}

/**
 * Clear a group transform when transformation is complete
 * Called on transformEnd when user stops dragging/resizing multiple objects
 *
 * @param canvasId - The ID of the canvas
 * @param userId - The ID of the user to clear group transform for
 */
export async function clearGroupTransform(
  canvasId: string,
  userId: string
): Promise<void> {
  const groupTransformRef = ref(
    realtimeDb,
    `${getTransformsSessionPath(canvasId, "groupTransforms")}/${userId}`
  );
  await remove(groupTransformRef);
}

/**
 * Subscribe to all group transforms
 * Returns real-time updates when any user is transforming multiple objects
 *
 * @param canvasId - The ID of the canvas
 * @param callback - Function called with updated group transforms map (userId -> GroupActiveTransform)
 * @returns Unsubscribe function
 */
export function subscribeToGroupTransforms(
  canvasId: string,
  callback: (groupTransforms: Record<string, GroupActiveTransform>) => void
): Unsubscribe {
  const groupTransformsRef = ref(
    realtimeDb,
    getTransformsSessionPath(canvasId, "groupTransforms")
  );

  return onValue(groupTransformsRef, (snapshot) => {
    const groupTransforms: Record<string, GroupActiveTransform> =
      snapshot.val() || {};
    callback(groupTransforms);
  });
}
