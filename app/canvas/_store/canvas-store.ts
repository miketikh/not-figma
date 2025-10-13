/**
 * Canvas state management with Zustand
 * Handles viewport state with localStorage persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Viewport, CanvasTool } from "@/types/canvas";

interface CanvasStore {
  // Viewport state
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  updateViewport: (updates: Partial<Viewport>) => void;
  resetViewport: () => void;

  // Tool state
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;

  // Canvas state
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  isPanning: boolean;
  setIsPanning: (isPanning: boolean) => void;
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 5,
};

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set) => ({
      // Viewport state
      viewport: DEFAULT_VIEWPORT,
      
      setViewport: (viewport) => set({ viewport }),
      
      updateViewport: (updates) =>
        set((state) => ({
          viewport: { ...state.viewport, ...updates },
        })),
      
      resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

      // Tool state
      activeTool: "select",
      setActiveTool: (tool) => set({ activeTool: tool }),

      // Canvas state
      isDrawing: false,
      setIsDrawing: (isDrawing) => set({ isDrawing }),
      isPanning: false,
      setIsPanning: (isPanning) => set({ isPanning }),
    }),
    {
      name: "canvas-viewport-storage", // localStorage key
      partialize: (state) => ({
        // Only persist viewport, not transient states
        viewport: state.viewport,
      }),
    }
  )
);

