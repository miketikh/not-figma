"use client";

import { useEffect, useState, useCallback } from "react";
import { subscribeToCanvas } from "@/lib/firebase/canvas";
import { Canvas } from "@/types/canvas";

/**
 * Hook to fetch and subscribe to a single canvas metadata
 *
 * @param canvasId - ID of the canvas to fetch
 * @returns Object with canvas data, loading state, error state, and retry function
 */
export function useCanvas(canvasId: string) {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Retry function to manually trigger re-subscription
   */
  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);
  }, []);

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
  }, [canvasId, retryCount]);

  return { canvas, loading, error, retry };
}
