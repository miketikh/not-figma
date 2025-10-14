"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../_store/canvas-store";
import { useAuth } from "@/hooks/useAuth";
import Toolbar from "./Toolbar";
import { createFabricRectangle } from "../_lib/objects";

interface CanvasProps {
  width?: number;
  height?: number;
}

export default function Canvas({ width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  
  // Drawing state
  const isDrawingRef = useRef(false);
  const drawingObjectRef = useRef<fabric.Rect | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });
  
  // Zustand store
  const { viewport, updateViewport, activeTool } = useCanvasStore();
  const activeToolRef = useRef(activeTool);
  const { user } = useAuth();

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Get container dimensions
    const containerWidth = width || containerRef.current.clientWidth;
    const containerHeight = height || containerRef.current.clientHeight;

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#f5f5f5",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    
    // Restore viewport from store
    if (viewport.zoom !== 1 || viewport.x !== 0 || viewport.y !== 0) {
      canvas.setZoom(viewport.zoom);
      canvas.viewportTransform[4] = viewport.x;
      canvas.viewportTransform[5] = viewport.y;
      canvas.requestRenderAll();
    }
    
    setIsReady(true);

    // Track space key state
    let spacePressed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spacePressed) {
        spacePressed = true;
        canvas.defaultCursor = "grab";
        e.preventDefault(); // Prevent page scroll
      }
      
      // Delete selected objects
      if ((e.code === "Delete" || e.code === "Backspace") && !e.repeat) {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj) => {
            canvas.remove(obj);
          });
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          e.preventDefault(); // Prevent browser back navigation on Backspace
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressed = false;
        if (!isPanningRef.current) {
          canvas.defaultCursor = "default";
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Mouse down handler
    canvas.on("mouse:down", (opt) => {
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);
      
      // Pan functionality (Space + Drag or Middle Mouse Button)
      if ('button' in evt && (evt.button === 1 || (evt.button === 0 && spacePressed))) {
        isPanningRef.current = true;
        canvas.selection = false;
        canvas.defaultCursor = "grabbing";
        lastPosRef.current = { x: evt.clientX, y: evt.clientY };
        return;
      }
      
      // Rectangle drawing
      if (activeToolRef.current === "rectangle" && 'button' in evt && evt.button === 0) {
        isDrawingRef.current = true;
        drawStartRef.current = { x: pointer.x, y: pointer.y };
        
        const rect = createFabricRectangle(pointer.x, pointer.y, 0, 0, {
          selectable: false,
          evented: false,
        });
        drawingObjectRef.current = rect;
        canvas.add(rect);
        canvas.selection = false;
      }
    });

    canvas.on("mouse:move", (opt) => {
      const evt = opt.e;
      const pointer = canvas.getPointer(evt);
      
      // Handle panning
      if (isPanningRef.current && 'clientX' in evt && 'clientY' in evt) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosRef.current.x;
          vpt[5] += evt.clientY - lastPosRef.current.y;
          canvas.requestRenderAll();
          lastPosRef.current = { x: evt.clientX, y: evt.clientY };
        }
        return;
      }
      
      // Handle rectangle drawing
      if (isDrawingRef.current && drawingObjectRef.current) {
        const startX = drawStartRef.current.x;
        const startY = drawStartRef.current.y;
        
        // Calculate width and height
        const width = pointer.x - startX;
        const height = pointer.y - startY;
        
        // Update rectangle dimensions
        if (width < 0) {
          drawingObjectRef.current.set({ left: pointer.x, width: Math.abs(width) });
        } else {
          drawingObjectRef.current.set({ width: Math.abs(width) });
        }
        
        if (height < 0) {
          drawingObjectRef.current.set({ top: pointer.y, height: Math.abs(height) });
        } else {
          drawingObjectRef.current.set({ height: Math.abs(height) });
        }
        
        canvas.requestRenderAll();
      }
    });

    canvas.on("mouse:up", () => {
      // Finish panning
      if (isPanningRef.current) {
        canvas.setViewportTransform(canvas.viewportTransform);
        isPanningRef.current = false;
        canvas.selection = activeToolRef.current === "select";
        canvas.defaultCursor = "default";
        
        // Save viewport state
        const vpt = canvas.viewportTransform;
        if (vpt) {
          updateViewport({ x: vpt[4], y: vpt[5] });
        }
      }
      
      // Finish drawing rectangle
      if (isDrawingRef.current && drawingObjectRef.current) {
        isDrawingRef.current = false;
        
        // If rectangle is too small, remove it
        if (drawingObjectRef.current.width! < 5 || drawingObjectRef.current.height! < 5) {
          canvas.remove(drawingObjectRef.current);
        } else {
          // Only make the rectangle selectable if we're in select tool mode
          const isSelectMode = activeToolRef.current === "select";
          drawingObjectRef.current.set({
            selectable: isSelectMode,
            evented: isSelectMode,
          });
          
          // Only set as active object if in select mode
          if (isSelectMode) {
            canvas.setActiveObject(drawingObjectRef.current);
          }
        }
        
        drawingObjectRef.current = null;
        canvas.selection = activeToolRef.current === "select";
        canvas.requestRenderAll();
      }
    });

    // Zoom functionality (Mouse Wheel)
    canvas.on("mouse:wheel", (opt) => {
      const evt = opt.e as WheelEvent;
      evt.preventDefault();
      evt.stopPropagation();

      const delta = evt.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;

      // Clamp zoom between 0.1 and 5
      if (newZoom > 5) newZoom = 5;
      if (newZoom < 0.1) newZoom = 0.1;

      // Zoom to mouse pointer position
      const point = new fabric.Point(evt.offsetX, evt.offsetY);
      canvas.zoomToPoint(point, newZoom);
      
      // Save viewport state
      updateViewport({ zoom: newZoom });
    });

    console.log("Canvas initialized:", { width, height });

    // Cleanup on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.dispose();
      fabricCanvasRef.current = null;
      setIsReady(false);
    };
  }, [width, height]);

  // Keep activeToolRef in sync with the store state
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Separate effect to handle tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Update object selectability when tool changes
    canvas.forEachObject((obj) => {
      obj.selectable = activeTool === "select";
      obj.evented = activeTool === "select";
      obj.setCoords();  // Force update hit-testing cache
    });
    
    canvas.selection = activeTool === "select";
    canvas.requestRenderAll();
  }, [activeTool]);

  const handleZoomIn = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let newZoom = canvas.getZoom() * 1.1;
    if (newZoom > 5) newZoom = 5;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    updateViewport({ zoom: newZoom });
  };

  const handleZoomOut = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let newZoom = canvas.getZoom() / 1.1;
    if (newZoom < 0.1) newZoom = 0.1;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    updateViewport({ zoom: newZoom });
  };

  const handleResetZoom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), 1);
    updateViewport({ zoom: 1 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <canvas ref={canvasRef} />
      
      {/* Toolbar (centered bottom) */}
      {isReady && <Toolbar />}
      
      {/* Zoom Controls (bottom-right) */}
      {isReady && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Zoom In"
          >
            <span className="text-lg font-semibold">+</span>
          </button>
          <button
            onClick={handleResetZoom}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-xs"
            title="Reset Zoom (100%)"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Zoom Out"
          >
            <span className="text-lg font-semibold">−</span>
          </button>
        </div>
      )}
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            Loading canvas...
          </p>
        </div>
      )}
    </div>
  );
}

