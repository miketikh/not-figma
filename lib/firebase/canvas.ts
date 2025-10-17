/**
 * Canvas CRUD operations
 * Firestore operations for canvas management using nested collection structure
 *
 * IMPORTANT: All Firestore write operations use safe wrappers that automatically
 * filter out undefined values to prevent Firebase errors.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  Timestamp,
  type UpdateData,
} from "firebase/firestore";
import { db } from "./config";
import { safeSetDoc, safeUpdateDoc } from "./firestore";
import { Canvas } from "@/types/canvas";
import {
  DEFAULT_CANVAS_NAME,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  MIN_CANVAS_DIMENSION,
  MAX_CANVAS_DIMENSION,
  MAX_CANVAS_NAME_LENGTH,
} from "@/lib/constants/canvas";

// Collection name
const CANVASES_COLLECTION = "canvases";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate canvas name
 */
function validateCanvasName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Canvas name is required");
  }
  if (name.length > MAX_CANVAS_NAME_LENGTH) {
    throw new Error(
      `Canvas name must be ${MAX_CANVAS_NAME_LENGTH} characters or less`
    );
  }
}

/**
 * Validate canvas dimensions
 */
function validateCanvasDimensions(width: number, height: number): void {
  if (width < MIN_CANVAS_DIMENSION || width > MAX_CANVAS_DIMENSION) {
    throw new Error(
      `Canvas width must be between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION}`
    );
  }
  if (height < MIN_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
    throw new Error(
      `Canvas height must be between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION}`
    );
  }
}

/**
 * Convert Firestore timestamp to number
 */
function convertTimestamp(timestamp: any): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  return timestamp;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new canvas
 *
 * @param userId - ID of the user creating the canvas
 * @param name - Name of the canvas
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @param isPublic - Whether the canvas is public (default: false)
 * @returns Promise<string> - ID of the created canvas
 * @throws Error if validation fails or creation fails
 */
export async function createCanvas(
  userId: string,
  name: string = DEFAULT_CANVAS_NAME,
  width: number = DEFAULT_CANVAS_WIDTH,
  height: number = DEFAULT_CANVAS_HEIGHT,
  isPublic: boolean = false
): Promise<string> {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error("User ID is required");
    }
    validateCanvasName(name);
    validateCanvasDimensions(width, height);

    // Create canvas document reference
    const canvasRef = doc(collection(db, CANVASES_COLLECTION));
    const canvasId = canvasRef.id;

    const now = Date.now();

    // Create canvas object
    const canvas: Canvas = {
      id: canvasId,
      name: name.trim(),
      width,
      height,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      isPublic,
    };

    // Save to Firestore using safe wrapper
    await safeSetDoc(canvasRef, canvas as DocumentData);

    return canvasId;
  } catch (error) {
    console.error("Error creating canvas:", error);
    throw error;
  }
}

/**
 * Get a single canvas by ID
 *
 * @param canvasId - ID of the canvas to fetch
 * @returns Promise<Canvas | null> - Canvas object or null if not found
 * @throws Error if fetch fails
 */
export async function getCanvas(canvasId: string): Promise<Canvas | null> {
  try {
    if (!canvasId) {
      throw new Error("Canvas ID is required");
    }

    const canvasRef = doc(db, CANVASES_COLLECTION, canvasId);
    const canvasSnap = await getDoc(canvasRef);

    if (!canvasSnap.exists()) {
      return null;
    }

    const data = canvasSnap.data();

    // Convert Firestore timestamps to numbers
    return {
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Canvas;
  } catch (error) {
    console.error(`Error fetching canvas ${canvasId}:`, error);
    throw error;
  }
}

/**
 * Get all canvases for a user (owned + public canvases)
 *
 * @param userId - ID of the user
 * @returns Promise<Canvas[]> - Array of canvas objects ordered by creation date (newest first)
 * @throws Error if fetch fails
 */
export async function getUserCanvases(userId: string): Promise<Canvas[]> {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const canvasesRef = collection(db, CANVASES_COLLECTION);

    // Query 1: Canvases created by the user
    const ownedQuery = query(
      canvasesRef,
      where("createdBy", "==", userId),
      orderBy("createdAt", "desc")
    );

    // Query 2: Public canvases
    const publicQuery = query(
      canvasesRef,
      where("isPublic", "==", true),
      orderBy("createdAt", "desc")
    );

    // Execute both queries in parallel
    const [ownedSnapshot, publicSnapshot] = await Promise.all([
      getDocs(ownedQuery),
      getDocs(publicQuery),
    ]);

    // Merge results and deduplicate by canvas ID
    const canvasMap = new Map<string, Canvas>();

    // Add owned canvases
    ownedSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      canvasMap.set(doc.id, {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Canvas);
    });

    // Add public canvases (won't duplicate if already in map)
    publicSnapshot.docs.forEach((doc) => {
      if (!canvasMap.has(doc.id)) {
        const data = doc.data();
        canvasMap.set(doc.id, {
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Canvas);
      }
    });

    // Convert to array and sort by creation date (newest first)
    return Array.from(canvasMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  } catch (error) {
    console.error(`Error fetching canvases for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update canvas metadata
 *
 * @param canvasId - ID of the canvas to update
 * @param updates - Partial canvas object with fields to update
 * @returns Promise<void>
 * @throws Error if validation fails or update fails
 */
export async function updateCanvas(
  canvasId: string,
  updates: Partial<Omit<Canvas, "id" | "createdBy" | "createdAt">>
): Promise<void> {
  try {
    if (!canvasId) {
      throw new Error("Canvas ID is required");
    }

    // Validate updates
    if (updates.name !== undefined) {
      validateCanvasName(updates.name);
    }
    if (updates.width !== undefined || updates.height !== undefined) {
      // If updating dimensions, need to validate both
      const canvas = await getCanvas(canvasId);
      if (!canvas) {
        throw new Error("Canvas not found");
      }
      const newWidth = updates.width ?? canvas.width;
      const newHeight = updates.height ?? canvas.height;
      validateCanvasDimensions(newWidth, newHeight);
    }

    const canvasRef = doc(db, CANVASES_COLLECTION, canvasId);

    // Add updatedAt timestamp
    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Trim name if provided
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    await safeUpdateDoc(canvasRef, updateData as UpdateData<DocumentData>);
  } catch (error) {
    console.error(`Error updating canvas ${canvasId}:`, error);
    throw error;
  }
}

/**
 * Delete a canvas
 * Note: Firestore will automatically cascade delete the objects subcollection
 *
 * @param canvasId - ID of the canvas to delete
 * @returns Promise<void>
 * @throws Error if deletion fails
 */
export async function deleteCanvas(canvasId: string): Promise<void> {
  try {
    if (!canvasId) {
      throw new Error("Canvas ID is required");
    }

    const canvasRef = doc(db, CANVASES_COLLECTION, canvasId);
    await deleteDoc(canvasRef);

    // Note: Objects in the subcollection (canvases/{canvasId}/objects) are NOT
    // automatically deleted by Firestore. In production, you should use a
    // Cloud Function or manually delete the subcollection objects first.
    // For now, we rely on security rules to prevent access to orphaned objects.
  } catch (error) {
    console.error(`Error deleting canvas ${canvasId}:`, error);
    throw error;
  }
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to a single canvas changes
 *
 * @param canvasId - ID of the canvas to subscribe to
 * @param callback - Callback function called with canvas data (or null if deleted)
 * @param onError - Optional error handler
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToCanvas(
  canvasId: string,
  callback: (canvas: Canvas | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!canvasId) {
    throw new Error("Canvas ID is required");
  }

  const canvasRef = doc(db, CANVASES_COLLECTION, canvasId);

  return onSnapshot(
    canvasRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Canvas);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to canvas ${canvasId}:`, error);
      onError?.(error);
    }
  );
}

/**
 * Subscribe to user's canvas list (owned + public canvases)
 *
 * @param userId - ID of the user
 * @param callback - Callback function called with array of canvases
 * @param onError - Optional error handler
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToUserCanvases(
  userId: string,
  callback: (canvases: Canvas[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const canvasesRef = collection(db, CANVASES_COLLECTION);

  // Query 1: Canvases created by the user
  const ownedQuery = query(
    canvasesRef,
    where("createdBy", "==", userId),
    orderBy("createdAt", "desc")
  );

  // Query 2: Public canvases
  const publicQuery = query(
    canvasesRef,
    where("isPublic", "==", true),
    orderBy("createdAt", "desc")
  );

  // Store canvases from both queries
  const canvasMap = new Map<string, Canvas>();
  let ownedUnsubscribe: Unsubscribe | null = null;
  let publicUnsubscribe: Unsubscribe | null = null;

  // Helper to merge and emit canvases
  const emitCanvases = () => {
    const canvases = Array.from(canvasMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
    callback(canvases);
  };

  // Subscribe to owned canvases
  ownedUnsubscribe = onSnapshot(
    ownedQuery,
    (snapshot) => {
      // Update owned canvases in map
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        canvasMap.set(doc.id, {
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Canvas);
      });

      // Remove deleted owned canvases
      const ownedIds = new Set(snapshot.docs.map((doc) => doc.id));
      for (const [id, canvas] of canvasMap.entries()) {
        if (canvas.createdBy === userId && !ownedIds.has(id)) {
          canvasMap.delete(id);
        }
      }

      emitCanvases();
    },
    (error) => {
      console.error(
        `Error subscribing to owned canvases for user ${userId}:`,
        error
      );
      onError?.(error);
    }
  );

  // Subscribe to public canvases
  publicUnsubscribe = onSnapshot(
    publicQuery,
    (snapshot) => {
      // Update public canvases in map
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        canvasMap.set(doc.id, {
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Canvas);
      });

      // Remove deleted public canvases (only if not owned by user)
      const publicIds = new Set(snapshot.docs.map((doc) => doc.id));
      for (const [id, canvas] of canvasMap.entries()) {
        if (
          canvas.isPublic &&
          canvas.createdBy !== userId &&
          !publicIds.has(id)
        ) {
          canvasMap.delete(id);
        }
      }

      emitCanvases();
    },
    (error) => {
      console.error(`Error subscribing to public canvases:`, error);
      onError?.(error);
    }
  );

  // Return combined unsubscribe function
  return () => {
    ownedUnsubscribe?.();
    publicUnsubscribe?.();
  };
}
