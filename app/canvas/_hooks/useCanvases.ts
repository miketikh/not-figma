/**
 * Hook for managing user's canvas list with real-time sync
 * Provides canvas CRUD operations with loading states and error handling
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createCanvas as createCanvasFirestore,
  deleteCanvas as deleteCanvasFirestore,
  updateCanvas as updateCanvasFirestore,
  subscribeToUserCanvases,
} from "@/lib/firebase/canvas";
import { Canvas } from "@/types/canvas";

interface UseCanvasesReturn {
  canvases: Canvas[];
  loading: boolean;
  error: Error | null;
  createCanvas: (name: string, width: number, height: number) => Promise<string>;
  deleteCanvas: (canvasId: string) => Promise<void>;
  renameCanvas: (canvasId: string, name: string) => Promise<void>;
}

/**
 * Hook to manage user's canvas list with real-time updates
 *
 * @returns {UseCanvasesReturn} Canvas list, loading state, error state, and CRUD functions
 */
export function useCanvases(): UseCanvasesReturn {
  const { user } = useAuth();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Create a new canvas
   */
  const createCanvas = useCallback(
    async (name: string, width: number, height: number): Promise<string> => {
      if (!user) {
        throw new Error("User must be authenticated to create a canvas");
      }

      try {
        const canvasId = await createCanvasFirestore(user.uid, name, width, height);
        return canvasId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create canvas");
        setError(error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Delete a canvas
   */
  const deleteCanvas = useCallback(
    async (canvasId: string): Promise<void> => {
      if (!user) {
        throw new Error("User must be authenticated to delete a canvas");
      }

      try {
        await deleteCanvasFirestore(canvasId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete canvas");
        setError(error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Rename a canvas
   */
  const renameCanvas = useCallback(
    async (canvasId: string, name: string): Promise<void> => {
      if (!user) {
        throw new Error("User must be authenticated to rename a canvas");
      }

      try {
        await updateCanvasFirestore(canvasId, { name });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to rename canvas");
        setError(error);
        throw error;
      }
    },
    [user]
  );

  /**
   * Handle canvas list updates from Firestore
   */
  const handleCanvasesUpdate = useCallback((updatedCanvases: Canvas[]) => {
    setCanvases(updatedCanvases);
    setLoading(false);
    setError(null);
  }, []);

  /**
   * Handle subscription errors
   */
  const handleError = useCallback((err: Error) => {
    console.error("Error subscribing to canvases:", err);
    setError(err);
    setLoading(false);
  }, []);

  /**
   * Subscribe to user's canvas list
   */
  useEffect(() => {
    if (!user) {
      setCanvases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUserCanvases(
      user.uid,
      handleCanvasesUpdate,
      handleError
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [user, handleCanvasesUpdate, handleError]);

  return {
    canvases,
    loading,
    error,
    createCanvas,
    deleteCanvas,
    renameCanvas,
  };
}
