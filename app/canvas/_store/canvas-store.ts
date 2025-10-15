/**
 * Canvas state management with Zustand
 * Handles viewport state with localStorage persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Viewport, CanvasTool } from "@/types/canvas";

// Default properties that can be customized per shape type
export interface DefaultShapeProperties {
  rectangle: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    cornerRadius: number;
  };
  circle: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
  };
  line: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
  };
  text: {
    fontSize: number;
    fontFamily: string;
    fontWeight: "normal" | "bold" | "lighter" | "bolder";
    fontStyle: "normal" | "italic";
    textAlign: "left" | "center" | "right";
    textDecoration: "none" | "underline" | "line-through";
    lineHeight: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
  };
}

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

  // Default shape properties
  defaultShapeProperties: DefaultShapeProperties;
  updateDefaultShapeProperty: <T extends keyof DefaultShapeProperties>(
    shapeType: T,
    updates: Partial<DefaultShapeProperties[T]>
  ) => void;
  resetDefaultShapeProperties: () => void;
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 5,
};

const DEFAULT_SHAPE_PROPERTIES: DefaultShapeProperties = {
  rectangle: {
    fill: "rgba(59, 130, 246, 0.3)",
    stroke: "#3b82f6",
    strokeWidth: 2,
    opacity: 1,
    cornerRadius: 0,
  },
  circle: {
    fill: "rgba(236, 72, 153, 0.3)",
    stroke: "#ec4899",
    strokeWidth: 2,
    opacity: 1,
  },
  line: {
    stroke: "#a855f7", // Purple
    strokeWidth: 2,
    opacity: 1,
  },
  text: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "normal",
    fontStyle: "normal",
    textAlign: "left",
    textDecoration: "none",
    lineHeight: 1.2,
    fill: "#000000", // Black
    stroke: "#000000",
    strokeWidth: 0, // No outline by default
    opacity: 1,
  },
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

      // Default shape properties
      defaultShapeProperties: DEFAULT_SHAPE_PROPERTIES,
      
      updateDefaultShapeProperty: (shapeType, updates) =>
        set((state) => ({
          defaultShapeProperties: {
            ...state.defaultShapeProperties,
            [shapeType]: {
              ...state.defaultShapeProperties[shapeType],
              ...updates,
            },
          },
        })),
      
      resetDefaultShapeProperties: () =>
        set({ defaultShapeProperties: DEFAULT_SHAPE_PROPERTIES }),
    }),
    {
      name: "canvas-viewport-storage", // localStorage key
      partialize: (state) => ({
        // Persist viewport and default shape properties
        viewport: state.viewport,
        defaultShapeProperties: state.defaultShapeProperties,
      }),
    }
  )
);

