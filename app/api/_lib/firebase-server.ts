/**
 * Server-side Firebase operations for API routes
 *
 * Uses Firebase Admin SDK to bypass security rules.
 * DO NOT import this file in client-side code - it will fail in the browser.
 */

import { adminDb } from "@/lib/firebase/admin";
import { removeUndefinedValues } from "@/lib/firebase/utils";
import { CanvasObject } from "@/types/canvas";

/**
 * Create a canvas object (server-side)
 */
export async function createObject(canvasId: string, object: CanvasObject): Promise<void> {
  const objectRef = adminDb.collection("canvases").doc(canvasId).collection("objects").doc(object.id);
  await objectRef.set(removeUndefinedValues(object as Record<string, any>));
}

/**
 * Get a canvas object (server-side)
 */
export async function getObject(canvasId: string, objectId: string): Promise<CanvasObject | null> {
  const objectRef = adminDb.collection("canvases").doc(canvasId).collection("objects").doc(objectId);
  const doc = await objectRef.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as CanvasObject;
}

/**
 * Update a canvas object (server-side)
 */
export async function updateObject(
  canvasId: string,
  objectId: string,
  updates: Partial<CanvasObject>
): Promise<void> {
  const objectRef = adminDb.collection("canvases").doc(canvasId).collection("objects").doc(objectId);
  await objectRef.update(removeUndefinedValues(updates as Record<string, any>));
}

/**
 * Delete a canvas object (server-side)
 */
export async function deleteObject(canvasId: string, objectId: string): Promise<void> {
  const objectRef = adminDb.collection("canvases").doc(canvasId).collection("objects").doc(objectId);
  await objectRef.delete();
}

/**
 * Check if user can edit an object (pure function, works anywhere)
 */
export function canEdit(object: CanvasObject, userId: string): boolean {
  // Not locked = anyone can edit
  if (!object.lockedBy) return true;

  // I own the lock = I can edit
  if (object.lockedBy === userId) return true;

  // Lock is expired = anyone can edit
  if (object.lockedAt && object.lockTimeout) {
    const now = Date.now();
    const lockAge = now - object.lockedAt;
    const isExpired = lockAge > object.lockTimeout;
    if (isExpired) return true;
  }

  // Someone else has an active lock = cannot edit
  return false;
}
