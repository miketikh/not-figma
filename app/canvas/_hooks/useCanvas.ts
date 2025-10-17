"use client";

import { useEffect, useState } from "react";
import { subscribeToCanvas } from "@/lib/firebase/canvas";
import { Canvas } from "@/types/canvas";

/**
 * Hook to fetch and subscribe to a single canvas metadata
 *
 * @param canvasId - ID of the canvas to fetch
 * @returns Object with canvas data, loading state, and error state
 */
export function useCanvas(canvasId: string) {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!canvasId) {
      setError(new Error("Canvas ID is required"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to canvas changes
    const unsubscribe = subscribeToCanvas(
      canvasId,
      (canvasData) => {
        setCanvas(canvasData);
        setLoading(false);
      },
      (err) => {
        console.error("Error in canvas subscription:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [canvasId]);

  return { canvas, loading, error };
}
