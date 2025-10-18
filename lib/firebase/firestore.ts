/**
 * Firestore helper functions
 * CRUD operations for canvas objects
 *
 * IMPORTANT: All Firestore write operations use safe wrappers that automatically
 * filter out undefined values to prevent Firebase errors.
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
  orderBy,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  DocumentData,
  type DocumentReference,
  type WithFieldValue,
  type UpdateData,
  type SetOptions,
} from "firebase/firestore";
import { db } from "./config";
import { CanvasObject, ObjectUpdate } from "@/types/canvas";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";
import { removeUndefinedValues } from "./utils";

/**
 * Get the nested collection path for canvas objects
 * Path format: canvases/{canvasId}/objects
 */
function getObjectsCollectionPath(canvasId: string): string {
  return `canvases/${canvasId}/objects`;
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

// ============================================================================
// Safe Wrapper Utilities
// ============================================================================

/**
 * Safe wrapper for Firestore setDoc that filters undefined values.
 * Use this instead of calling setDoc directly.
 *
 * @param reference - Document reference to write to
 * @param data - Data to write (undefined values will be filtered out)
 * @param options - Optional set options (merge, mergeFields)
 * @returns Promise that resolves when write is complete
 *
 * @example
 * ```typescript
 * import { safeSetDoc } from '@/lib/firebase/firestore';
 *
 * await safeSetDoc(docRef, {
 *   name: 'John',
 *   age: undefined, // This will be filtered out
 *   email: 'john@example.com'
 * });
 * ```
 */
export async function safeSetDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: WithFieldValue<T>,
  options?: SetOptions
): Promise<void> {
  const cleanedData = removeUndefinedValues(data as Record<string, any>);
  return setDoc(reference, cleanedData as WithFieldValue<T>, options || {});
}

/**
 * Safe wrapper for Firestore updateDoc that filters undefined values.
 * Use this instead of calling updateDoc directly.
 *
 * @param reference - Document reference to update
 * @param data - Update data (undefined values will be filtered out)
 * @returns Promise that resolves when update is complete
 *
 * @example
 * ```typescript
 * import { safeUpdateDoc } from '@/lib/firebase/firestore';
 *
 * await safeUpdateDoc(docRef, {
 *   lastSeen: Date.now(),
 *   status: undefined // This will be filtered out
 * });
 * ```
 */
export async function safeUpdateDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: UpdateData<T>
): Promise<void> {
  const cleanedData = removeUndefinedValues(data as Record<string, any>);
  return updateDoc(reference, cleanedData as UpdateData<T>);
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new canvas object
 */
export async function createObject(
  canvasId: string,
  object: CanvasObject
): Promise<void> {
  const objectRef = getObjectRef(canvasId, object.id);
  await safeSetDoc(objectRef, object as DocumentData);
}

/**
 * Get a single object by ID
 */
export async function getObject(
  canvasId: string,
  objectId: string
): Promise<CanvasObject | null> {
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
  const q = query(
    objectsRef,
    orderBy("zIndex", "asc"),
    orderBy("createdAt", "asc")
  );
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
  await safeUpdateDoc(objectRef, updates as UpdateData<DocumentData>);
}

/**
 * Delete an object
 */
export async function deleteObject(
  canvasId: string,
  objectId: string
): Promise<void> {
  const objectRef = getObjectRef(canvasId, objectId);
  await deleteDoc(objectRef);
}

/**
 * Batch update multiple objects (for performance)
 * Uses Firestore's native writeBatch API for atomic updates
 * This triggers a SINGLE snapshot event for collection listeners
 */
export async function batchUpdateObjects(
  canvasId: string,
  updates: ObjectUpdate[]
): Promise<void> {
  const batch = writeBatch(db);

  updates.forEach((update) => {
    const objectRef = getObjectRef(canvasId, update.id);
    // Use removeUndefinedValues to clean the data before adding to batch
    const cleanedChanges = removeUndefinedValues(update.changes);
    batch.update(objectRef, cleanedChanges as DocumentData);
  });

  await batch.commit();
}

/**
 * Delete multiple objects
 */
export async function batchDeleteObjects(
  canvasId: string,
  objectIds: string[]
): Promise<void> {
  const deletePromises = objectIds.map((id) => deleteObject(canvasId, id));
  await Promise.all(deletePromises);
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to all canvas objects changes for a specific canvas
 * Returns an unsubscribe function
 */
export function subscribeToObjects(
  canvasId: string,
  callback: (objects: CanvasObject[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const objectsRef = collection(db, getObjectsCollectionPath(canvasId));
  const q = query(
    objectsRef,
    orderBy("zIndex", "asc"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const objects = snapshot.docs.map((doc) => doc.data() as CanvasObject);
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
): Promise<{
  success: boolean;
  lockedBy: string | null;
  expiresAt: number | null;
  message?: string;
}> {
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
  await safeUpdateDoc(objectRef, {
    lockedBy: userId,
    lockedAt: now,
    lockTimeout: LOCK_TIMEOUT_MS,
    updatedBy: userId,
    updatedAt: now,
  } as UpdateData<DocumentData>);

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
    await safeUpdateDoc(objectRef, {
      lockedBy: null,
      lockedAt: null,
      updatedBy: userId,
      updatedAt: Date.now(),
    } as UpdateData<DocumentData>);
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
    await safeUpdateDoc(objectRef, {
      lockedAt: Date.now(),
      updatedBy: userId,
      updatedAt: Date.now(),
    } as UpdateData<DocumentData>);
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
