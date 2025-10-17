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
import { CanvasObject } from "@/types/canvas";
import { getShapeFactory } from "../_lib/shapes";
import type { PersistedRect, PersistedShape } from "../_types/shapes";

// Re-export types for backwards compatibility
export type { PersistedRect };

interface UseObjectsProps {
  canvasId: string;
  isReady: boolean;
  onObjectsUpdate: (objects: PersistedShape[]) => void;
}

export function useObjects({
  canvasId,
  isReady,
  onObjectsUpdate,
}: UseObjectsProps) {
  const { user } = useAuth();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);

  /**
   * Convert Firestore CanvasObject to local shape using factory
   */
  const canvasObjectToShape = useCallback(
    (obj: CanvasObject): PersistedShape | null => {
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
    (shape: PersistedShape): CanvasObject => {
      // Get the factory based on the shape's type
      const shapeType = shape.type;
      const factory = getShapeFactory(shapeType);
      if (!factory) {
        throw new Error(`Factory not found for shape type: ${shapeType}`);
      }

      return factory.toFirestore(shape, user?.uid || "unknown", canvasId);
    },
    [user, canvasId]
  );

  /**
   * Handle incoming objects from Firestore (real-time sync)
   */
  const handleObjectsSync = useCallback(
    (objects: CanvasObject[]) => {
      if (!isReady) return;

      try {
        // Convert Firestore objects to local shapes using factories
        const shapes: PersistedShape[] = [];

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
    async (shape: PersistedShape) => {
      if (!user || savingRef.current) return;

      try {
        savingRef.current = true;
        const canvasObject = shapeToCanvasObject(shape);
        await createObject(canvasId, canvasObject);
      } catch (error) {
        console.error("Error saving object:", error);
      } finally {
        savingRef.current = false;
      }
    },
    [user, canvasId, shapeToCanvasObject]
  );

  /**
   * Update an object in Firestore
   */
  const updateObjectInFirestore = useCallback(
    async (shape: PersistedShape) => {
      if (!user) return;

      try {
        // Get the shape type and factory
        const shapeType = shape.type;
        const factory = getShapeFactory(shapeType);

        if (!factory) {
          console.error(`No factory found for shape type: ${shapeType}`);
          return;
        }

        // Convert to Firestore format using the appropriate factory
        const firestoreObject = factory.toFirestore(shape, user.uid, canvasId);

        // Extract all fields for update (Firestore will merge)
        const updates = {
          ...firestoreObject,
          updatedBy: user.uid,
          updatedAt: Date.now(),
        };

        await updateObject(canvasId, shape.id, updates);
      } catch (error) {
        console.error("Error updating object:", error);
      }
    },
    [user, canvasId]
  );

  /**
   * Delete an object from Firestore
   */
  const deleteObjectFromFirestore = useCallback(
    async (objectId: string) => {
      try {
        await deleteObject(canvasId, objectId);
      } catch (error) {
        console.error("Error deleting object:", error);
      }
    },
    [canvasId]
  );

  // Set up real-time subscription to Firestore
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = subscribeToObjects(
      canvasId,
      handleObjectsSync,
      (error) => {
        console.error("Subscription error:", error);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [canvasId, isReady, handleObjectsSync]);

  return {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
  };
}
