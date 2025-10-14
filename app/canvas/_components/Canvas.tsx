"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../_store/canvas-store";
import { useAuth } from "@/hooks/useAuth";
import Toolbar from "./Toolbar";
import RemoteCursor from "./RemoteCursor";
import { createFabricRectangle } from "../_lib/objects";
import { useObjects } from "../_hooks/useObjects";
import { useCursors } from "../_hooks/useCursors";
import { LockManager, setupLockRenewalListeners } from "../_lib/locks";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

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
  const [, forceUpdate] = useState({});
  const [gridTransform, setGridTransform] = useState({ x: 0, y: 0, zoom: 1 });
  
  // Drawing state
  const isDrawingRef = useRef(false);
  const drawingObjectRef = useRef<fabric.Rect | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });
  
  // Lock management
  const lockManagerRef = useRef<LockManager>(new LockManager());
  
  // Zustand store
  const { viewport, updateViewport, activeTool } = useCanvasStore();
  const activeToolRef = useRef(activeTool);
  const { user } = useAuth();
  
  // Object persistence
  const {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
    assignIdToObject,
  } = useObjects({ canvas: fabricCanvasRef.current, isReady });
  
  // Cursor tracking
  const { remoteCursors } = useCursors({
    canvas: fabricCanvasRef.current,
    isReady,
  });

  // Transform canvas coordinates to screen coordinates
  const transformCursorPosition = (canvasX: number, canvasY: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return { x: canvasX, y: canvasY };

    const vpt = canvas.viewportTransform;
    if (!vpt) return { x: canvasX, y: canvasY };

    // Apply viewport transform: screenCoord = canvasCoord * zoom + pan
    const screenX = canvasX * vpt[0] + vpt[4];
    const screenY = canvasY * vpt[3] + vpt[5];

    return { x: screenX, y: screenY };
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Get container dimensions
    const containerWidth = width || containerRef.current.clientWidth;
    const containerHeight = height || containerRef.current.clientHeight;

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    
    // Initialize lock manager with user and canvas
    lockManagerRef.current.setUserId(user?.uid || null);
    lockManagerRef.current.setCanvas(canvas);
    
    // Start lock expiration checker
    lockManagerRef.current.startExpirationChecker();
    
    // Setup lock renewal event listeners
    setupLockRenewalListeners(canvas, lockManagerRef.current);
    
    // Restore viewport from store
    if (viewport.zoom !== 1 || viewport.x !== 0 || viewport.y !== 0) {
      canvas.setZoom(viewport.zoom);
      canvas.viewportTransform[4] = viewport.x;
      canvas.viewportTransform[5] = viewport.y;
      canvas.requestRenderAll();
      setGridTransform({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
    }
    
    setIsReady(true);

    // ========================================================================
    // Selection Event Handlers (for locking)
    // ========================================================================

    canvas.on("selection:created", async (e) => {
      const selectedObjects = e.selected;
      if (!selectedObjects || selectedObjects.length === 0) return;

      // Acquire locks for all selected objects
      for (const obj of selectedObjects) {
        const objectId = (obj as any).data?.id;
        if (objectId) {
          await lockManagerRef.current.tryAcquireLock(objectId);
        }
      }
    });

    canvas.on("selection:updated", async (e) => {
      // Release locks on deselected objects
      const deselected = e.deselected || [];
      for (const obj of deselected) {
        const objectId = (obj as any).data?.id;
        if (objectId) {
          await lockManagerRef.current.releaseLock(objectId);
        }
      }

      // Acquire locks on newly selected objects
      const selected = e.selected || [];
      for (const obj of selected) {
        const objectId = (obj as any).data?.id;
        if (objectId) {
          await lockManagerRef.current.tryAcquireLock(objectId);
        }
      }
    });

    canvas.on("selection:cleared", async () => {
      // Release all locks
      await lockManagerRef.current.releaseAllLocks();
    });

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
            // Delete from Firestore
            const objectId = (obj as any).data?.id;
            if (objectId) {
              deleteObjectFromFirestore(objectId);
            }
            // Remove from canvas
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
          // Update grid transform
          setGridTransform({ x: vpt[4], y: vpt[5], zoom: canvas.getZoom() });
          // Force re-render to update cursor positions
          forceUpdate({});
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
          // Assign ID to the new object
          assignIdToObject(drawingObjectRef.current);
          
          // Save the object to Firestore
          saveObject(drawingObjectRef.current);
          
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
      
      // Update grid transform
      const vpt = canvas.viewportTransform;
      if (vpt) {
        setGridTransform({ x: vpt[4], y: vpt[5], zoom: newZoom });
      }
      
      // Force re-render to update cursor positions
      forceUpdate({});
    });

    // Object modification events (for persistence and lock renewal)
    canvas.on("object:modified", (e) => {
      if (e.target) {
        // Renew lock on modification
        const objectId = (e.target as any).data?.id;
        if (objectId) {
          lockManagerRef.current.renewLockForObject(objectId);
        }
        
        // Save changes to Firestore
        updateObjectInFirestore(e.target);
      }
    });

    // Cleanup on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      
      // Cleanup lock manager (releases all locks and stops checker)
      lockManagerRef.current.cleanup();
      
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
    
    const vpt = canvas.viewportTransform;
    if (vpt) {
      setGridTransform({ x: vpt[4], y: vpt[5], zoom: newZoom });
    }
    
    forceUpdate({});
  };

  const handleZoomOut = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let newZoom = canvas.getZoom() / 1.1;
    if (newZoom < 0.1) newZoom = 0.1;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), newZoom);
    updateViewport({ zoom: newZoom });
    
    const vpt = canvas.viewportTransform;
    if (vpt) {
      setGridTransform({ x: vpt[4], y: vpt[5], zoom: newZoom });
    }
    
    forceUpdate({});
  };

  const handleResetZoom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), 1);
    updateViewport({ zoom: 1 });
    
    const vpt = canvas.viewportTransform;
    if (vpt) {
      setGridTransform({ x: vpt[4], y: vpt[5], zoom: 1 });
    }
    
    forceUpdate({});
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: `radial-gradient(circle, var(--color-gray-300) 1px, transparent 1px)`,
        backgroundSize: `${20 * gridTransform.zoom}px ${20 * gridTransform.zoom}px`,
        backgroundPosition: `${gridTransform.x}px ${gridTransform.y}px`,
      }}
    >
      <canvas ref={canvasRef} />
      
      {/* Toolbar (centered bottom) */}
      {isReady && <Toolbar />}
      
      {/* Zoom Controls (bottom-right) */}
      {isReady && (
        <TooltipProvider>
          <div className="absolute bottom-6 right-6 flex flex-col bg-white rounded-md overflow-hidden border shadow-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <Plus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Zoom In <span className="text-muted-foreground">(⌘+)</span></p>
              </TooltipContent>
            </Tooltip>
            
            <Separator orientation="horizontal" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleResetZoom} className="text-xs">
                  {Math.round(viewport.zoom * 100)}%
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Reset Zoom <span className="text-muted-foreground">(⌘0)</span></p>
              </TooltipContent>
            </Tooltip>
            
            <Separator orientation="horizontal" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <Minus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Zoom Out <span className="text-muted-foreground">(⌘−)</span></p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
      
      {/* Remote Cursors */}
      {isReady &&
        Object.entries(remoteCursors).map(([userId, cursor]) => {
          const screenPos = transformCursorPosition(cursor.x, cursor.y);
          return (
            <RemoteCursor
              key={userId}
              x={screenPos.x}
              y={screenPos.y}
              displayName={cursor.displayName}
              color={cursor.color}
            />
          );
        })}
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p style={{ color: 'var(--color-gray-500)' }}>
            Loading canvas...
          </p>
        </div>
      )}
    </div>
  );
}

