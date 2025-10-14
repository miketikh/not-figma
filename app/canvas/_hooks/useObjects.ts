/**
 * Hook for managing canvas objects with Firestore persistence and real-time sync
 * Konva version - works with plain object state instead of Fabric canvas
 */

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createObject,
  updateObject,
  deleteObject,
  subscribeToObjects,
} from "@/lib/firebase/firestore";
import { generateObjectId } from "../_lib/objects";
import { CanvasObject, RectangleObject } from "@/types/canvas";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";

// PersistedRect interface is now defined in Canvas.tsx where it's used
// This hook works with the generic types and converts to/from Firestore
export interface PersistedRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation?: number;
  // Lock info
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout?: number;
}

interface UseObjectsProps {
  isReady: boolean;
  onObjectsUpdate: (objects: PersistedRect[]) => void;
}

export function useObjects({ isReady, onObjectsUpdate }: UseObjectsProps) {
  const { user } = useAuth();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);

  /**
   * Convert Firestore CanvasObject to PersistedRect
   */
  const canvasObjectToPersistedRect = useCallback(
    (obj: CanvasObject): PersistedRect | null => {
      if (obj.type === "rectangle") {
        const rectObj = obj as RectangleObject;
        return {
          id: rectObj.id,
          x: rectObj.x,
          y: rectObj.y,
          width: rectObj.width,
          height: rectObj.height,
          fill: rectObj.fill,
          stroke: rectObj.stroke,
          strokeWidth: rectObj.strokeWidth,
          rotation: rectObj.rotation,
          // Include lock info
          lockedBy: rectObj.lockedBy,
          lockedAt: rectObj.lockedAt,
          lockTimeout: rectObj.lockTimeout,
        };
      }
      return null;
    },
    []
  );

  /**
   * Convert PersistedRect to Firestore RectangleObject
   */
  const persistedRectToCanvasObject = useCallback(
    (rect: PersistedRect, isNew: boolean = false): RectangleObject => {
      const now = Date.now();

      return {
        id: rect.id,
        type: "rectangle",

        // Ownership & Sync
        createdBy: user?.uid || "unknown",
        createdAt: isNew ? now : 0, // Will be overridden for updates
        updatedBy: user?.uid || "unknown",
        updatedAt: now,

        // Locking
        lockedBy: null,
        lockedAt: null,
        lockTimeout: LOCK_TIMEOUT_MS,

        // Transform
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: rect.rotation || 0,

        // Styling
        fill: rect.fill,
        fillOpacity: 1,
        stroke: rect.stroke,
        strokeWidth: rect.strokeWidth,
        strokeOpacity: 1,
        strokeStyle: "solid",

        // Layer
        zIndex: 0,

        // Interaction
        locked: false,
        visible: true,

        // Optional
        cornerRadius: 0,
      };
    },
    [user]
  );

  /**
   * Handle incoming objects from Firestore (real-time sync)
   */
  const handleObjectsSync = useCallback(
    (objects: CanvasObject[]) => {
      if (!isReady) return;

      try {
        // Convert Firestore objects to PersistedRect
        const rects: PersistedRect[] = [];

        objects.forEach((obj) => {
          if (obj.type === "rectangle") {
            const rect = canvasObjectToPersistedRect(obj);
            if (rect) {
              rects.push(rect);
            }
          }
        });

        // Update the Canvas component's state
        onObjectsUpdate(rects);
        loadedRef.current = true;
      } catch (error) {
        console.error("Error syncing objects:", error);
      }
    },
    [isReady, onObjectsUpdate, canvasObjectToPersistedRect]
  );

  /**
   * Save an object to Firestore
   */
  const saveObject = useCallback(
    async (rect: PersistedRect) => {
      if (!user || savingRef.current) return;

      try {
        savingRef.current = true;
        const canvasObject = persistedRectToCanvasObject(rect, true);
        await createObject(canvasObject);
      } catch (error) {
        console.error("Error saving object:", error);
      } finally {
        savingRef.current = false;
      }
    },
    [user, persistedRectToCanvasObject]
  );

  /**
   * Update an object in Firestore
   */
  const updateObjectInFirestore = useCallback(
    async (rect: PersistedRect) => {
      if (!user) return;

      try {
        const updates = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          rotation: rect.rotation || 0,
          updatedBy: user.uid,
          updatedAt: Date.now(),
        };

        await updateObject(rect.id, updates);
      } catch (error) {
        console.error("Error updating object:", error);
      }
    },
    [user]
  );

  /**
   * Delete an object from Firestore
   */
  const deleteObjectFromFirestore = useCallback(async (objectId: string) => {
    try {
      await deleteObject(objectId);
    } catch (error) {
      console.error("Error deleting object:", error);
    }
  }, []);

  /**
   * Generate ID for a new object
   */
  const generateId = useCallback(() => {
    return generateObjectId();
  }, []);

  // Set up real-time subscription to Firestore
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = subscribeToObjects(
      handleObjectsSync,
      (error) => {
        console.error("Subscription error:", error);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [isReady, handleObjectsSync]);

  return {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
    generateId,
  };
}
