/**
 * Firestore helper functions
 * CRUD operations for canvas objects
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import { CanvasObject, ObjectUpdate } from "@/types/canvas";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";

// Old flat collection name (for backwards compatibility)
const OLD_CANVAS_OBJECTS_COLLECTION = "canvasObjects";

/**
 * Get the nested collection path for canvas objects
 * Path format: canvases/{canvasId}/objects
 */
function getObjectsCollectionPath(canvasId: string): string {
  return `canvases/${canvasId}/objects`;
}

/**
 * Get reference to the old flat collection (for migration fallback)
 */
function getOldObjectsCollectionPath(): string {
  return OLD_CANVAS_OBJECTS_COLLECTION;
}

/**
 * Get reference to a specific object document
 */
function getObjectRef(canvasId: string, objectId: string) {
  return doc(db, getObjectsCollectionPath(canvasId), objectId);
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new canvas object
 */
export async function createObject(canvasId: string, object: CanvasObject): Promise<void> {
  const objectRef = getObjectRef(canvasId, object.id);
  await setDoc(objectRef, object);
}

/**
 * Get a single object by ID
 */
export async function getObject(canvasId: string, objectId: string): Promise<CanvasObject | null> {
  const objectRef = getObjectRef(canvasId, objectId);
  const objectSnap = await getDoc(objectRef);

  if (!objectSnap.exists()) {
    return null;
  }

  return objectSnap.data() as CanvasObject;
}

/**
 * Get all canvas objects for a specific canvas
 */
export async function getAllObjects(canvasId: string): Promise<CanvasObject[]> {
  const objectsRef = collection(db, getObjectsCollectionPath(canvasId));
  const q = query(objectsRef, orderBy("zIndex", "asc"), orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as CanvasObject);
}

/**
 * Update an existing object (full or partial)
 */
export async function updateObject(
  canvasId: string,
  objectId: string,
  updates: Partial<CanvasObject>
): Promise<void> {
  const objectRef = getObjectRef(canvasId, objectId);
  await updateDoc(objectRef, updates as DocumentData);
}

/**
 * Delete an object
 */
export async function deleteObject(canvasId: string, objectId: string): Promise<void> {
  const objectRef = getObjectRef(canvasId, objectId);
  await deleteDoc(objectRef);
}

/**
 * Batch update multiple objects (for performance)
 * Uses Firestore's native writeBatch API for atomic updates
 * This triggers a SINGLE snapshot event for collection listeners
 */
export async function batchUpdateObjects(canvasId: string, updates: ObjectUpdate[]): Promise<void> {
  const batch = writeBatch(db);

  updates.forEach((update) => {
    const objectRef = getObjectRef(canvasId, update.id);
    batch.update(objectRef, update.changes as DocumentData);
  });

  await batch.commit();
}

/**
 * Delete multiple objects
 */
export async function batchDeleteObjects(canvasId: string, objectIds: string[]): Promise<void> {
  const deletePromises = objectIds.map((id) => deleteObject(canvasId, id));
  await Promise.all(deletePromises);
}

// ============================================================================
// Migration Helper Functions
// ============================================================================

/**
 * Check if old data exists in the flat canvasObjects collection
 * Returns true if migration is needed
 */
export async function shouldMigrate(userId?: string): Promise<boolean> {
  try {
    const oldObjectsRef = collection(db, getOldObjectsCollectionPath());
    let q;

    if (userId) {
      // Check if this specific user has old data
      q = query(oldObjectsRef, where("createdBy", "==", userId));
    } else {
      // Check if any old data exists (limit to 1 for performance)
      q = query(oldObjectsRef);
    }

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking for old data:", error);
    return false;
  }
}

/**
 * Get objects from old flat collection (for migration fallback)
 */
async function getOldObjects(userId: string): Promise<CanvasObject[]> {
  try {
    const oldObjectsRef = collection(db, getOldObjectsCollectionPath());
    const q = query(
      oldObjectsRef,
      where("createdBy", "==", userId),
      orderBy("zIndex", "asc"),
      orderBy("createdAt", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as CanvasObject);
  } catch (error) {
    console.error("Error fetching old objects:", error);
    return [];
  }
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to all canvas objects changes for a specific canvas
 * Returns an unsubscribe function
 *
 * MIGRATION FALLBACK: If the nested collection is empty and canvasId starts with "default-canvas-",
 * it will check the old flat collection for backwards compatibility.
 */
export function subscribeToObjects(
  canvasId: string,
  callback: (objects: CanvasObject[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const objectsRef = collection(db, getObjectsCollectionPath(canvasId));
  const q = query(objectsRef, orderBy("zIndex", "asc"), orderBy("createdAt", "asc"));

  let hasCheckedFallback = false;

  return onSnapshot(
    q,
    async (snapshot) => {
      const objects = snapshot.docs.map((doc) => doc.data() as CanvasObject);

      // Fallback to old collection if:
      // 1. New collection is empty
      // 2. Canvas ID looks like a default canvas (migration target)
      // 3. We haven't already checked fallback
      if (objects.length === 0 && canvasId.startsWith("default-canvas-") && !hasCheckedFallback) {
        hasCheckedFallback = true;

        // Extract userId from canvasId (format: "default-canvas-{userId}")
        const userId = canvasId.replace("default-canvas-", "");

        try {
          const oldObjects = await getOldObjects(userId);
          if (oldObjects.length > 0) {
            console.log(`[Migration Fallback] Found ${oldObjects.length} objects in old collection for user ${userId}`);
            callback(oldObjects);
            return;
          }
        } catch (error) {
          console.error("Error loading fallback objects:", error);
        }
      }

      callback(objects);
    },
    (error) => {
      console.error("Error subscribing to objects:", error);
      onError?.(error);
    }
  );
}

/**
 * Subscribe to a single object changes
 */
export function subscribeToObject(
  canvasId: string,
  objectId: string,
  callback: (object: CanvasObject | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const objectRef = getObjectRef(canvasId, objectId);

  return onSnapshot(
    objectRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as CanvasObject);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to object ${objectId}:`, error);
      onError?.(error);
    }
  );
}

// ============================================================================
// Locking Functions
// ============================================================================

/**
 * Acquire a lock on an object
 */
export async function acquireLock(
  canvasId: string,
  objectId: string,
  userId: string
): Promise<{ success: boolean; lockedBy: string | null; expiresAt: number | null; message?: string }> {
  const now = Date.now();
  const objectRef = getObjectRef(canvasId, objectId);
  const objectSnap = await getDoc(objectRef);

  if (!objectSnap.exists()) {
    return {
      success: false,
      lockedBy: null,
      expiresAt: null,
      message: "Object not found",
    };
  }

  const obj = objectSnap.data() as CanvasObject;

  // Check if lock exists and is not expired
  if (obj.lockedBy && obj.lockedAt) {
    const lockAge = now - obj.lockedAt;
    const isExpired = lockAge > obj.lockTimeout;

    if (!isExpired && obj.lockedBy !== userId) {
      // Someone else has the lock
      return {
        success: false,
        lockedBy: obj.lockedBy,
        expiresAt: obj.lockedAt + obj.lockTimeout,
        message: "Object is being edited by another user",
      };
    }
  }

  // Acquire or renew lock
  await updateDoc(objectRef, {
    lockedBy: userId,
    lockedAt: now,
    lockTimeout: LOCK_TIMEOUT_MS,
    updatedBy: userId,
    updatedAt: now,
  });

  return { success: true, lockedBy: userId, expiresAt: now + LOCK_TIMEOUT_MS };
}

/**
 * Release a lock on an object
 */
export async function releaseLock(
  canvasId: string,
  objectId: string,
  userId: string
): Promise<boolean> {
  const objectRef = getObjectRef(canvasId, objectId);
  const objectSnap = await getDoc(objectRef);

  if (!objectSnap.exists()) return false;

  const obj = objectSnap.data() as CanvasObject;

  // Only release if we own the lock
  if (obj.lockedBy === userId) {
    await updateDoc(objectRef, {
      lockedBy: null,
      lockedAt: null,
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return true;
  }

  return false;
}

/**
 * Renew a lock on an object
 */
export async function renewLock(
  canvasId: string,
  objectId: string,
  userId: string
): Promise<boolean> {
  const objectRef = getObjectRef(canvasId, objectId);
  const objectSnap = await getDoc(objectRef);

  if (!objectSnap.exists()) return false;

  const obj = objectSnap.data() as CanvasObject;

  // Only renew if we own the lock
  if (obj.lockedBy === userId) {
    await updateDoc(objectRef, {
      lockedAt: Date.now(),
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return true;
  }

  return false;
}

/**
 * Check if a lock is expired
 */
export function isLockExpired(lockedAt: number, lockTimeout: number): boolean {
  const now = Date.now();
  const lockAge = now - lockedAt;
  return lockAge > lockTimeout;
}

/**
 * Check if user can edit an object
 */
export function canEdit(object: CanvasObject, userId: string): boolean {
  // Not locked = anyone can edit
  if (!object.lockedBy) return true;
  
  // I own the lock = I can edit
  if (object.lockedBy === userId) return true;
  
  // Lock is expired = anyone can edit
  if (object.lockedAt && isLockExpired(object.lockedAt, object.lockTimeout)) {
    return true;
  }
  
  // Someone else has an active lock = cannot edit
  return false;
}

