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
  orderBy,
  onSnapshot,
  Unsubscribe,
  DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import { CanvasObject, ObjectUpdate } from "@/types/canvas";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";

// Collection name
const CANVAS_OBJECTS_COLLECTION = "canvasObjects";

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new canvas object
 */
export async function createObject(object: CanvasObject): Promise<void> {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, object.id);
  await setDoc(objectRef, object);
}

/**
 * Get a single object by ID
 */
export async function getObject(objectId: string): Promise<CanvasObject | null> {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
  const objectSnap = await getDoc(objectRef);
  
  if (!objectSnap.exists()) {
    return null;
  }
  
  return objectSnap.data() as CanvasObject;
}

/**
 * Get all canvas objects
 */
export async function getAllObjects(): Promise<CanvasObject[]> {
  const objectsRef = collection(db, CANVAS_OBJECTS_COLLECTION);
  const q = query(objectsRef, orderBy("zIndex", "asc"), orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => doc.data() as CanvasObject);
}

/**
 * Update an existing object (full or partial)
 */
export async function updateObject(
  objectId: string,
  updates: Partial<CanvasObject>
): Promise<void> {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
  await updateDoc(objectRef, updates as DocumentData);
}

/**
 * Delete an object
 */
export async function deleteObject(objectId: string): Promise<void> {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
  await deleteDoc(objectRef);
}

/**
 * Batch update multiple objects (for performance)
 */
export async function batchUpdateObjects(updates: ObjectUpdate[]): Promise<void> {
  const updatePromises = updates.map((update) =>
    updateObject(update.id, update.changes)
  );
  await Promise.all(updatePromises);
}

/**
 * Delete multiple objects
 */
export async function batchDeleteObjects(objectIds: string[]): Promise<void> {
  const deletePromises = objectIds.map((id) => deleteObject(id));
  await Promise.all(deletePromises);
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to all canvas objects changes
 * Returns an unsubscribe function
 */
export function subscribeToObjects(
  callback: (objects: CanvasObject[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const objectsRef = collection(db, CANVAS_OBJECTS_COLLECTION);
  const q = query(objectsRef, orderBy("zIndex", "asc"), orderBy("createdAt", "asc"));
  
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
  objectId: string,
  callback: (object: CanvasObject | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
  
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
  objectId: string,
  userId: string
): Promise<{ success: boolean; lockedBy: string | null; expiresAt: number | null; message?: string }> {
  const now = Date.now();
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
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
  objectId: string,
  userId: string
): Promise<boolean> {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
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
  objectId: string,
  userId: string
): Promise<boolean> {
  const objectRef = doc(db, CANVAS_OBJECTS_COLLECTION, objectId);
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

