/**
 * Hook for managing canvas objects with Firestore persistence
 */

import { useEffect, useCallback, useRef } from "react";
import * as fabric from "fabric";
import { useAuth } from "@/hooks/useAuth";
import {
  createObject,
  getAllObjects,
  updateObject,
  deleteObject,
} from "@/lib/firebase/firestore";
import {
  fabricRectToCanvasObject,
  canvasObjectToFabricRect,
  generateObjectId,
} from "../_lib/objects";
import { RectangleObject } from "@/types/canvas";

interface UseObjectsProps {
  canvas: fabric.Canvas | null;
  isReady: boolean;
}

export function useObjects({ canvas, isReady }: UseObjectsProps) {
  const { user } = useAuth();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);

  /**
   * Load all objects from Firestore on mount
   */
  const loadObjects = useCallback(async () => {
    if (!canvas || !isReady || loadedRef.current) return;

    try {
      console.log("Loading objects from Firestore...");
      const objects = await getAllObjects();
      console.log(`Loaded ${objects.length} objects`);

      // Remove existing objects (if any) but keep canvas settings
      const existingObjects = canvas.getObjects();
      existingObjects.forEach((obj) => canvas.remove(obj));

      // Add each object to canvas
      objects.forEach((obj) => {
        if (obj.type === "rectangle") {
          const fabricRect = canvasObjectToFabricRect(obj as RectangleObject);
          canvas.add(fabricRect);
        }
        // TODO: Add support for other shape types (circle, line, text)
      });

      canvas.requestRenderAll();
      loadedRef.current = true;
    } catch (error) {
      console.error("Error loading objects:", error);
    }
  }, [canvas, isReady]);

  /**
   * Save an object to Firestore
   */
  const saveObject = useCallback(
    async (fabricObject: fabric.Object) => {
      if (!user || savingRef.current) return;

      try {
        savingRef.current = true;

        if (fabricObject instanceof fabric.Rect) {
          const canvasObject = fabricRectToCanvasObject(fabricObject, user.uid);
          await createObject(canvasObject);
          console.log("Object saved:", canvasObject.id);
        }
        // TODO: Add support for other shape types
      } catch (error) {
        console.error("Error saving object:", error);
      } finally {
        savingRef.current = false;
      }
    },
    [user]
  );

  /**
   * Update an object in Firestore
   */
  const updateObjectInFirestore = useCallback(
    async (fabricObject: fabric.Object) => {
      if (!user) return;

      try {
        const objectId = fabricObject.data?.id;
        if (!objectId) {
          console.warn("Object has no ID, cannot update");
          return;
        }

        if (fabricObject instanceof fabric.Rect) {
          // Calculate actual dimensions (width/height * scale)
          const actualWidth = (fabricObject.width || 0) * (fabricObject.scaleX || 1);
          const actualHeight = (fabricObject.height || 0) * (fabricObject.scaleY || 1);
          
          const updates = {
            x: fabricObject.left || 0,
            y: fabricObject.top || 0,
            width: actualWidth,
            height: actualHeight,
            rotation: fabricObject.angle || 0,
            updatedBy: user.uid,
            updatedAt: Date.now(),
          };

          await updateObject(objectId, updates);
          console.log("Object updated:", objectId);
        }
        // TODO: Add support for other shape types
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
      console.log("Object deleted:", objectId);
    } catch (error) {
      console.error("Error deleting object:", error);
    }
  }, []);

  /**
   * Assign ID to a new object
   */
  const assignIdToObject = useCallback((fabricObject: fabric.Object) => {
    if (!fabricObject.data?.id) {
      fabricObject.data = { id: generateObjectId() };
    }
  }, []);

  // Load objects on mount
  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  return {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
    assignIdToObject,
    loadObjects,
  };
}


