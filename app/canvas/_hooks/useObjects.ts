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
import { getShapeFactory, PersistedRect } from "../_lib/shapes";

// Re-export PersistedRect for backwards compatibility
export type { PersistedRect };

interface UseObjectsProps {
  isReady: boolean;
  onObjectsUpdate: (objects: PersistedRect[]) => void;
}

export function useObjects({ isReady, onObjectsUpdate }: UseObjectsProps) {
  const { user } = useAuth();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);

  /**
   * Convert Firestore CanvasObject to local shape using factory
   */
  const canvasObjectToShape = useCallback(
    (obj: CanvasObject): PersistedRect | null => {
      const factory = getShapeFactory(obj.type);
      if (!factory) {
        console.warn(`No factory found for shape type: ${obj.type}`);
        return null;
      }
      
      return factory.fromFirestore(obj);
    },
    []
  );

  /**
   * Convert local shape to Firestore CanvasObject using factory
   */
  const shapeToCanvasObject = useCallback(
    (shape: PersistedRect): CanvasObject => {
      // For now, we assume rectangles. In the future, we'd detect type from shape properties
      const factory = getShapeFactory("rectangle");
      if (!factory) {
        throw new Error("Rectangle factory not found");
      }

      return factory.toFirestore(shape, user?.uid || "unknown");
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
        // Convert Firestore objects to local shapes using factories
        const shapes: PersistedRect[] = [];

        objects.forEach((obj) => {
          const shape = canvasObjectToShape(obj);
          if (shape) {
            shapes.push(shape);
          }
        });

        // Update the Canvas component's state
        onObjectsUpdate(shapes);
        loadedRef.current = true;
      } catch (error) {
        console.error("Error syncing objects:", error);
      }
    },
    [isReady, onObjectsUpdate, canvasObjectToShape]
  );

  /**
   * Save an object to Firestore
   */
  const saveObject = useCallback(
    async (shape: PersistedRect) => {
      if (!user || savingRef.current) return;

      try {
        savingRef.current = true;
        const canvasObject = shapeToCanvasObject(shape);
        await createObject(canvasObject);
      } catch (error) {
        console.error("Error saving object:", error);
      } finally {
        savingRef.current = false;
      }
    },
    [user, shapeToCanvasObject]
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
