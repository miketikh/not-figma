/**
 * Server-side Firebase Helper Functions
 * Uses Firebase Admin SDK for server-side operations in API routes
 *
 * These functions bypass Firestore security rules using service account credentials.
 * DO NOT use these functions in client-side code - they will fail in the browser.
 */

import { adminDb } from "./admin";
import { Canvas, CanvasObject } from "@/types/canvas";
import { Timestamp } from "firebase-admin/firestore";
import { removeUndefinedValues } from "./utils";

/**
 * Convert Firestore Admin timestamp to number
 */
function convertAdminTimestamp(timestamp: any): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  return timestamp;
}

/**
 * Get a single canvas by ID (server-side)
 *
 * @param canvasId - ID of the canvas to fetch
 * @returns Promise<Canvas | null> - Canvas object or null if not found
 * @throws Error if fetch fails
 */
export async function getCanvasServerSide(canvasId: string): Promise<Canvas | null> {
  try {
    if (!canvasId) {
      throw new Error("Canvas ID is required");
    }

    const canvasRef = adminDb.collection("canvases").doc(canvasId);
    const canvasSnap = await canvasRef.get();

    if (!canvasSnap.exists) {
      return null;
    }

    const data = canvasSnap.data();
    if (!data) {
      return null;
    }

    // Convert Firestore timestamps to numbers
    return {
      ...data,
      createdAt: convertAdminTimestamp(data.createdAt),
      updatedAt: convertAdminTimestamp(data.updatedAt),
    } as Canvas;
  } catch (error) {
    console.error(`Error fetching canvas ${canvasId}:`, error);
    throw error;
  }
}

/**
 * Get all objects for a canvas (server-side)
 *
 * @param canvasId - ID of the canvas
 * @returns Promise<CanvasObject[]> - Array of canvas objects
 * @throws Error if fetch fails
 */
export async function getAllObjectsServerSide(canvasId: string): Promise<CanvasObject[]> {
  try {
    if (!canvasId) {
      throw new Error("Canvas ID is required");
    }

    const objectsRef = adminDb.collection("canvases").doc(canvasId).collection("objects");
    const snapshot = await objectsRef.get();

    const objects: CanvasObject[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      objects.push({
        ...data,
        id: doc.id,
        createdAt: convertAdminTimestamp(data.createdAt),
        updatedAt: convertAdminTimestamp(data.updatedAt),
        lockedAt: data.lockedAt ? convertAdminTimestamp(data.lockedAt) : undefined,
      } as CanvasObject);
    });

    return objects;
  } catch (error) {
    console.error(`Error fetching objects for canvas ${canvasId}:`, error);
    throw error;
  }
}
