/**
 * Hook for managing canvas objects with Firestore persistence and real-time sync
 */

import { useEffect, useCallback, useRef } from "react";
import * as fabric from "fabric";
import { useAuth } from "@/hooks/useAuth";
import {
  createObject,
  updateObject,
  deleteObject,
  subscribeToObjects,
} from "@/lib/firebase/firestore";
import {
  fabricRectToCanvasObject,
  canvasObjectToFabricRect,
  generateObjectId,
} from "../_lib/objects";
import { CanvasObject, RectangleObject } from "@/types/canvas";

interface UseObjectsProps {
  canvas: fabric.Canvas | null;
  isReady: boolean;
}

export function useObjects({ canvas, isReady }: UseObjectsProps) {
  const { user } = useAuth();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);
  const syncingRef = useRef(false); // Prevent sync loops

  /**
   * Handle incoming objects from Firestore (real-time sync)
   */
  const handleObjectsSync = useCallback(
    (objects: CanvasObject[]) => {
      if (!canvas || !isReady || syncingRef.current) return;

      syncingRef.current = true;

      try {
        // Create a map of incoming objects by ID
        const incomingObjectsMap = new Map<string, CanvasObject>();
        objects.forEach((obj) => incomingObjectsMap.set(obj.id, obj));

        // Get current canvas objects
        const canvasObjects = canvas.getObjects();
        const canvasObjectIds = new Set(
          canvasObjects.map((obj) => obj.data?.id).filter(Boolean)
        );

        // 1. Update or add objects from Firestore
        objects.forEach((firestoreObj) => {
          const existingFabricObj = canvasObjects.find(
            (obj) => obj.data?.id === firestoreObj.id
          );

          if (existingFabricObj) {
            // Object exists - check if it needs updating
            // Only update if the Firestore version is newer
            if (firestoreObj.type === "rectangle") {
              const rect = existingFabricObj as fabric.Rect;
              const needsUpdate =
                rect.left !== firestoreObj.x ||
                rect.top !== firestoreObj.y ||
                rect.width !== firestoreObj.width ||
                rect.height !== firestoreObj.height ||
                rect.angle !== firestoreObj.rotation;

              if (needsUpdate) {
                rect.set({
                  left: firestoreObj.x,
                  top: firestoreObj.y,
                  width: firestoreObj.width,
                  height: firestoreObj.height,
                  angle: firestoreObj.rotation,
                  fill: firestoreObj.fill,
                  scaleX: 1,
                  scaleY: 1,
                });
                rect.setCoords();
              }
            }
          } else {
            // Object doesn't exist - add it
            if (firestoreObj.type === "rectangle") {
              const fabricRect = canvasObjectToFabricRect(
                firestoreObj as RectangleObject
              );
              canvas.add(fabricRect);
            }
            // TODO: Add support for other shape types
          }
        });

        // 2. Remove objects that no longer exist in Firestore
        canvasObjects.forEach((fabricObj) => {
          const objId = fabricObj.data?.id;
          if (objId && !incomingObjectsMap.has(objId)) {
            canvas.remove(fabricObj);
          }
        });

        canvas.requestRenderAll();
        loadedRef.current = true;
      } catch (error) {
        console.error("Error syncing objects:", error);
      } finally {
        syncingRef.current = false;
      }
    },
    [canvas, isReady]
  );

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
        if (!objectId) return;

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

  // Set up real-time subscription to Firestore
  useEffect(() => {
    if (!canvas || !isReady) return;

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
  }, [canvas, isReady, handleObjectsSync]);

  return {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
    assignIdToObject,
  };
}


