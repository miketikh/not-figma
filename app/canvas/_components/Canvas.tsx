"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../_store/canvas-store";

interface CanvasProps {
  width?: number;
  height?: number;
}

export default function Canvas({ width = 1920, height = 1080 }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  
  // Zustand store
  const { viewport, updateViewport } = useCanvasStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#f5f5f5",
      selection: true,
      preserveObjectStacking: true,
    });

    // Add grid pattern (Figma-like)
    const gridSize = 20;
    const gridColor = "#e0e0e0";

    // Create vertical lines
    for (let i = 0; i < width / gridSize; i++) {
      canvas.add(
        new fabric.Line([i * gridSize, 0, i * gridSize, height], {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })
      );
    }

    // Create horizontal lines
    for (let i = 0; i < height / gridSize; i++) {
      canvas.add(
        new fabric.Line([0, i * gridSize, width, i * gridSize], {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })
      );
    }

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

    // Pan functionality (Space + Drag or Middle Mouse Button)
    canvas.on("mouse:down", (opt) => {
      const evt = opt.e;
      // Middle mouse button OR Space key + left click
      if (evt instanceof MouseEvent && (evt.button === 1 || (evt.button === 0 && spacePressed))) {
        isPanningRef.current = true;
        canvas.selection = false;
        canvas.defaultCursor = "grabbing";
        lastPosRef.current = { x: evt.clientX, y: evt.clientY };
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (isPanningRef.current && opt.e instanceof MouseEvent) {
        const evt = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosRef.current.x;
          vpt[5] += evt.clientY - lastPosRef.current.y;
          canvas.requestRenderAll();
          lastPosRef.current = { x: evt.clientX, y: evt.clientY };
        }
      }
    });

    canvas.on("mouse:up", () => {
      canvas.setViewportTransform(canvas.viewportTransform);
      isPanningRef.current = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      
      // Save viewport state
      const vpt = canvas.viewportTransform;
      if (vpt) {
        updateViewport({ x: vpt[4], y: vpt[5] });
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
  }, [width, height, viewport, updateViewport]);

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
    <div className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-900">
      <canvas ref={canvasRef} />
      
      {/* Zoom Controls */}
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

