/**
 * Realtime Database helper functions for active transform broadcasting
 * High-frequency updates for real-time transform visibility (~50ms / 20 updates per second)
 */

import {
  ref,
  set,
  remove,
  onValue,
  onDisconnect,
  Unsubscribe,
} from "firebase/database";
import { realtimeDb } from "./config";
import type { ActiveTransform, ActiveTransformMap } from "@/app/canvas/_types/active-transform";

// Session ID - in production, this could be a room/canvas ID
const SESSION_ID = "canvas-session-default";

// ============================================================================
// Active Transform Functions (High-frequency updates ~50ms / 20 updates per second)
// ============================================================================

/**
 * Broadcast an active transform for an object
 * Called during drag/resize/rotate operations to show real-time updates to other users
 *
 * @param objectId - The ID of the object being transformed
 * @param userId - The ID of the user performing the transform
 * @param transformData - The current transform state
 */
export async function broadcastTransform(
  objectId: string,
  userId: string,
  transformData: Omit<ActiveTransform, "userId" | "objectId" | "timestamp">
): Promise<void> {
  const transformRef = ref(realtimeDb, `sessions/${SESSION_ID}/activeTransforms/${objectId}`);

  const activeTransform: ActiveTransform = {
    ...transformData,
    userId,
    objectId,
    timestamp: Date.now(),
  } as ActiveTransform;

  await set(transformRef, activeTransform);
}

/**
 * Clear an active transform when transformation is complete
 * Called on dragEnd, transformEnd, or when user deselects object
 *
 * @param objectId - The ID of the object to clear transform for
 */
export async function clearTransform(objectId: string): Promise<void> {
  const transformRef = ref(realtimeDb, `sessions/${SESSION_ID}/activeTransforms/${objectId}`);
  await remove(transformRef);
}

/**
 * Clear all active transforms for a specific user
 * Useful for cleanup on disconnect or when user stops transforming
 *
 * @param userId - The ID of the user to clear transforms for
 * @param activeTransforms - Current active transforms map to filter
 */
export async function clearUserTransforms(
  userId: string,
  activeTransforms: ActiveTransformMap
): Promise<void> {
  const objectIds = Object.keys(activeTransforms).filter(
    (objectId) => activeTransforms[objectId].userId === userId
  );

  await Promise.all(objectIds.map((objectId) => clearTransform(objectId)));
}

/**
 * Subscribe to all active transforms
 * Returns real-time updates when any object is being transformed
 *
 * @param callback - Function called with updated transforms map
 * @returns Unsubscribe function
 */
export function subscribeToActiveTransforms(
  callback: (transforms: ActiveTransformMap) => void
): Unsubscribe {
  const transformsRef = ref(realtimeDb, `sessions/${SESSION_ID}/activeTransforms`);

  return onValue(transformsRef, (snapshot) => {
    const transforms: ActiveTransformMap = snapshot.val() || {};
    callback(transforms);
  });
}

/**
 * Set up disconnect cleanup for a user's active transforms
 * Automatically removes all transforms when user disconnects
 *
 * @param userId - The ID of the user to set up cleanup for
 */
export async function setupTransformDisconnectCleanup(userId: string): Promise<void> {
  // Get reference to all active transforms
  const transformsRef = ref(realtimeDb, `sessions/${SESSION_ID}/activeTransforms`);

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
 * @param maxAge - Maximum age in milliseconds (default 5 seconds)
 * @param activeTransforms - Current active transforms map
 */
export async function cleanupStaleTransforms(
  activeTransforms: ActiveTransformMap,
  maxAge: number = 5000
): Promise<void> {
  const now = Date.now();
  const staleObjectIds = Object.keys(activeTransforms).filter(
    (objectId) => now - activeTransforms[objectId].timestamp > maxAge
  );

  await Promise.all(staleObjectIds.map((objectId) => clearTransform(objectId)));
}
