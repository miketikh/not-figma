"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../_store/canvas-store";
import { useAuth } from "@/hooks/useAuth";
import Toolbar from "./Toolbar";
import RemoteCursor from "./RemoteCursor";
import { useObjects } from "../_hooks/useObjects";
import { useCursors } from "../_hooks/useCursors";
import { LockManager } from "../_lib/locks";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import StageContainer from "./StageContainer";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Rect } from "react-konva";

interface CanvasProps {
  width?: number;
  height?: number;
}

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Canvas({ width, height }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [isReady, setIsReady] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [gridTransform, setGridTransform] = useState({ x: 0, y: 0, zoom: 1 });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });
  
  // Lock management
  const lockManagerRef = useRef<LockManager>(new LockManager());
  
  // Zustand store
  const { viewport, updateViewport, activeTool } = useCanvasStore();
  const { user } = useAuth();
  
  // Object persistence (temporarily passing null for canvas)
  const {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
    assignIdToObject,
  } = useObjects({ canvas: null, isReady });
  
  // Cursor tracking (temporarily passing null for canvas)
  const { remoteCursors } = useCursors({
    canvas: null,
    isReady,
  });

  // Transform canvas coordinates to screen coordinates (placeholder for Konva)
  const transformCursorPosition = (canvasX: number, canvasY: number) => {
    // Apply viewport transform: screenCoord = canvasCoord * zoom + pan
    const screenX = canvasX * viewport.zoom + viewport.x;
    const screenY = canvasY * viewport.zoom + viewport.y;
    return { x: screenX, y: screenY };
  };

  // Keyboard handlers for Space key (pan mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault(); // Prevent page scroll
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        setIsPanning(false); // Stop panning when space released
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [spacePressed]);

  // Initialize container size
  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const containerWidth = width || containerRef.current.clientWidth;
    const containerHeight = height || containerRef.current.clientHeight;

    setContainerSize({ width: containerWidth, height: containerHeight });
    
    // Initialize lock manager with user
    lockManagerRef.current.setUserId(user?.uid || null);
    
    // Start lock expiration checker
    lockManagerRef.current.startExpirationChecker();
    
    // Restore grid transform from viewport
    setGridTransform({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
    
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      // Cleanup lock manager (releases all locks and stops checker)
      lockManagerRef.current.cleanup();
      setIsReady(false);
    };
  }, [width, height, user?.uid, viewport.x, viewport.y, viewport.zoom]);

  // Wheel zoom handler (zoom to pointer)
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate new zoom
    const delta = e.evt.deltaY;
    let newZoom = oldScale * (0.999 ** delta);
    
    // Clamp zoom
    if (newZoom > 5) newZoom = 5;
    if (newZoom < 0.1) newZoom = 0.1;

    // Calculate new position to zoom toward pointer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    };

    // Update viewport store
    updateViewport({ x: newPos.x, y: newPos.y, zoom: newZoom });
    setGridTransform({ x: newPos.x, y: newPos.y, zoom: newZoom });
  };

  // Mouse down handler for pan and drawing
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Start panning on Space+drag or middle mouse button
    if (e.evt.button === 1 || (e.evt.button === 0 && spacePressed)) {
      setIsPanning(true);
      return;
    }

    // Start drawing rectangle (left click, rectangle tool, not panning)
    if (e.evt.button === 0 && activeTool === "rectangle" && !isPanning) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert pointer to canvas coordinates (account for stage transform)
      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPoint = transform.point(pointer);

      setIsDrawing(true);
      drawStartRef.current = { x: canvasPoint.x, y: canvasPoint.y };
      setDraftRect({
        x: canvasPoint.x,
        y: canvasPoint.y,
        width: 0,
        height: 0,
      });
    }
  };

  // Mouse move handler for drawing
  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Update draft rectangle while drawing
    if (isDrawing && draftRect) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert pointer to canvas coordinates
      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPoint = transform.point(pointer);

      const startX = drawStartRef.current.x;
      const startY = drawStartRef.current.y;

      // Calculate width and height (support negative deltas)
      let width = canvasPoint.x - startX;
      let height = canvasPoint.y - startY;
      let x = startX;
      let y = startY;

      // Adjust position if width/height are negative
      if (width < 0) {
        x = canvasPoint.x;
        width = Math.abs(width);
      }
      if (height < 0) {
        y = canvasPoint.y;
        height = Math.abs(height);
      }

      setDraftRect({ x, y, width, height });
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    // Finish drawing rectangle
    if (isDrawing && draftRect) {
      setIsDrawing(false);

      // Discard if too small
      if (draftRect.width < 5 || draftRect.height < 5) {
        setDraftRect(null);
        return;
      }

      // Save the rectangle (persistence will be wired in next PR)
      console.log("Rectangle created:", draftRect);
      // TODO: Call saveObject with proper serialization in PR #45
      
      setDraftRect(null);
      return;
    }

    setIsPanning(false);
  };

  // Drag end handler to sync viewport after pan
  const handleDragEnd = () => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const newPos = { x: stage.x(), y: stage.y() };
    updateViewport(newPos);
    setGridTransform({ x: newPos.x, y: newPos.y, zoom: viewport.zoom });
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    const stage = stageRef.current;
    if (!stage) return;

    let newZoom = viewport.zoom * 1.1;
    if (newZoom > 5) newZoom = 5;

    // Zoom to center
    const center = {
      x: containerSize.width / 2,
      y: containerSize.height / 2,
    };
    
    const mousePointTo = {
      x: (center.x - viewport.x) / viewport.zoom,
      y: (center.y - viewport.y) / viewport.zoom,
    };

    const newPos = {
      x: center.x - mousePointTo.x * newZoom,
      y: center.y - mousePointTo.y * newZoom,
    };

    updateViewport({ x: newPos.x, y: newPos.y, zoom: newZoom });
    setGridTransform({ x: newPos.x, y: newPos.y, zoom: newZoom });
  };

  const handleZoomOut = () => {
    const stage = stageRef.current;
    if (!stage) return;

    let newZoom = viewport.zoom / 1.1;
    if (newZoom < 0.1) newZoom = 0.1;

    // Zoom to center
    const center = {
      x: containerSize.width / 2,
      y: containerSize.height / 2,
    };
    
    const mousePointTo = {
      x: (center.x - viewport.x) / viewport.zoom,
      y: (center.y - viewport.y) / viewport.zoom,
    };

    const newPos = {
      x: center.x - mousePointTo.x * newZoom,
      y: center.y - mousePointTo.y * newZoom,
    };

    updateViewport({ x: newPos.x, y: newPos.y, zoom: newZoom });
    setGridTransform({ x: newPos.x, y: newPos.y, zoom: newZoom });
  };

  const handleResetZoom = () => {
    // Reset to center with zoom 1
    const center = {
      x: containerSize.width / 2,
      y: containerSize.height / 2,
    };

    updateViewport({ x: center.x, y: center.y, zoom: 1 });
    setGridTransform({ x: center.x, y: center.y, zoom: 1 });
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
      {/* Konva Stage */}
      {isReady && containerSize.width > 0 && containerSize.height > 0 && (
        <StageContainer
          stageRef={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          x={viewport.x}
          y={viewport.y}
          scale={viewport.zoom}
          draggable={isPanning}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDragEnd={handleDragEnd}
        >
          {/* Draft rectangle while drawing */}
          {draftRect && (
            <Rect
              x={draftRect.x}
              y={draftRect.y}
              width={draftRect.width}
              height={draftRect.height}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3b82f6"
              strokeWidth={2 / viewport.zoom}
              listening={false}
            />
          )}
          
          {/* Persisted shapes will be rendered here in next PR */}
        </StageContainer>
      )}
      
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
