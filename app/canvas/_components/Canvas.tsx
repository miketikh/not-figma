"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore } from "../_store/canvas-store";
import { useAuth } from "@/hooks/useAuth";
import Toolbar from "./Toolbar";
import RemoteCursorKonva from "./RemoteCursorKonva";
import ActiveTransformOverlay from "./ActiveTransformOverlay";
import PropertiesPanel from "./PropertiesPanel";
import { useObjects } from "../_hooks/useObjects";
import { batchUpdateObjects } from "@/lib/firebase/firestore";
import { useCursors } from "../_hooks/useCursors";
import { useActiveTransforms } from "../_hooks/useActiveTransforms";
import { usePresence } from "../_hooks/usePresence";
import { LockManager, isLockedByOtherUser } from "../_lib/locks";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";
import { Plus, Minus, Grid3x3 } from "lucide-react";
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
import { Transformer, Rect, Circle, Ellipse, Line } from "react-konva";
import { getShapeFactory } from "../_lib/shapes";
import ShapeComponent from "./shapes";
import { isDrawingTool, isShapeTool } from "../_constants/tools";
import type { PersistedShape } from "../_types/shapes";
import { getMaxZIndex, getMinZIndex } from "../_lib/layer-management";
import {
  broadcastTransform,
  clearTransform,
  broadcastGroupTransform,
  clearGroupTransform,
} from "@/lib/firebase/realtime-transforms";
import type { ObjectTransformData } from "@/app/canvas/_types/active-transform";
import { screenToCanvasCoordinates } from "../_lib/coordinates";
import { getIntersectingObjects } from "../_lib/intersection";
import { isPointInBounds, clampPointToBounds } from "../_lib/bounds";
import { constrainViewport } from "../_lib/viewport-constraints";

interface CanvasProps {
  canvasId: string;
  canvas: {
    id: string;
    name: string;
    width: number;
    height: number;
  };
  width?: number;
  height?: number;
}

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Canvas({ canvasId, canvas, width, height }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [isReady, setIsReady] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [shiftPressed, setShiftPressed] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });

  // Selection rectangle state (for drag-to-select)
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef({ x: 0, y: 0 });

  // Persisted shapes
  const [objects, setObjects] = useState<PersistedShape[]>([]);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map());
  
  // Lock management with expiration callback
  const lockManagerRef = useRef<LockManager>(
    new LockManager(null, null, (expiredObjectIds) => {
      // Remove expired objects from selection when locks expire
      setSelectedIds(prev => prev.filter(id => !expiredObjectIds.includes(id)));
    })
  );
  
  // Zustand store
  const {
    viewport,
    updateViewport,
    activeTool,
    setActiveTool,
    defaultShapeProperties,
    updateDefaultShapeProperty,
    showGrid,
    toggleGrid,
  } = useCanvasStore();
  const { user } = useAuth();
  
  // Stable callback for Firestore updates
  const handleObjectsUpdate = useCallback((firestoreShapes: PersistedShape[]) => {
    setObjects(firestoreShapes);
  }, []);

  // Object persistence with Firestore
  const {
    saveObject,
    updateObjectInFirestore,
    deleteObjectFromFirestore,
  } = useObjects({
    canvasId,
    isReady,
    onObjectsUpdate: handleObjectsUpdate,
  });

  // Cursor tracking
  const { remoteCursors } = useCursors({
    canvasId,
    stageRef,
    isReady,
  });

  // Active transform tracking
  const { activeTransformsWithUser } = useActiveTransforms(canvasId);

  // Presence tracking (for getting locking user info)
  const { onlineUsers } = usePresence(canvasId);

  // Update Transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const selectedNodes = selectedIds
      .map((id) => shapeRefs.current.get(id))
      .filter((node): node is Konva.Shape => node !== undefined);

    transformer.nodes(selectedNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds]);

  // Handle lock acquisition/release on selection changes
  useEffect(() => {
    const lockManager = lockManagerRef.current;
    if (!lockManager) return;

    // Get previously selected IDs (from the Set of locked objects)
    const currentlyLocked = new Set(lockManager.getLockedObjects());
    const newlySelected = new Set(selectedIds);

    // Release locks on deselected objects
    currentlyLocked.forEach((id) => {
      if (!newlySelected.has(id)) {
        lockManager.releaseLock(id);
      }
    });

    // Acquire locks on newly selected objects
    selectedIds.forEach((id) => {
      if (!currentlyLocked.has(id)) {
        lockManager.tryAcquireLock(id);
      }
    });
  }, [selectedIds]);

  // Helper function for updating z-index
  const updateZIndex = useCallback((objectId: string, newZIndex: number) => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return;

    const updatedObj = { ...obj, zIndex: newZIndex };
    
    // Optimistic update
    setObjects((prev) =>
      prev.map((o) => (o.id === objectId ? updatedObj : o))
    );
    
    // Persist to Firestore
    updateObjectInFirestore(updatedObj);
  }, [objects, updateObjectInFirestore]);

  // Debounced property update handler
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handlePropertyUpdate = useCallback((objectId: string, updates: Partial<PersistedShape>) => {
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return;

    const updatedObj = { ...obj, ...updates } as PersistedShape;

    // Optimistic update to local state (immediate)
    setObjects((prev) =>
      prev.map((o) => (o.id === objectId ? updatedObj : o))
    );

    // Clear existing timer for this object
    const existingTimer = debounceTimers.current.get(objectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce Firestore writes (300ms)
    const timer = setTimeout(() => {
      updateObjectInFirestore(updatedObj);
      // Renew lock
      lockManagerRef.current.renewLockForObject(objectId);
      debounceTimers.current.delete(objectId);
    }, 300);

    debounceTimers.current.set(objectId, timer);
  }, [objects, updateObjectInFirestore]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  // Throttled transform broadcasting (50ms per object)
  const broadcastThrottleTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Group transform broadcasting (shared throttle for multi-select)
  const groupTransformThrottleTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingGroupTransforms = useRef<Record<string, ObjectTransformData>>({});

  // Batch Firestore writes on transform end (multi-select optimization)
  const transformEndBatchTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingTransformEndUpdates = useRef<Map<string, PersistedShape>>(new Map());

  const handleTransformMove = useCallback((objectId: string, updates: Partial<PersistedShape>) => {
    // Only broadcast if user has this object locked
    const obj = objects.find(o => o.id === objectId);
    if (!obj || !user) return;
    if (obj.lockedBy !== user.uid) return;

    // Prepare transform data for this object
    const transformData: ObjectTransformData = {
      type: obj.type,
      x: updates.x ?? obj.x,
      y: updates.y ?? obj.y,
    };

    // Add shape-specific properties using type narrowing
    if (obj.type === "rectangle" && "width" in obj) {
      transformData.width = (updates as any).width ?? obj.width;
      transformData.height = (updates as any).height ?? obj.height;
      transformData.rotation = (updates as any).rotation ?? obj.rotation;
    } else if (obj.type === "circle" && "radiusX" in obj) {
      transformData.radiusX = (updates as any).radiusX ?? obj.radiusX;
      transformData.radiusY = (updates as any).radiusY ?? obj.radiusY;
    } else if (obj.type === "line" && "x2" in obj) {
      transformData.x2 = (updates as any).x2 ?? obj.x2;
      transformData.y2 = (updates as any).y2 ?? obj.y2;
    } else if (obj.type === "text" && "width" in obj) {
      transformData.width = (updates as any).width ?? obj.width;
      transformData.height = (updates as any).height ?? obj.height;
      transformData.rotation = (updates as any).rotation ?? obj.rotation;
    }

    // Multi-select: Use group transform broadcasting (shared 50ms throttle)
    if (selectedIds.length > 1) {
      // Accumulate transforms for all selected objects
      pendingGroupTransforms.current[objectId] = transformData;

      // If throttle already active, just accumulate and return
      if (groupTransformThrottleTimer.current) return;

      // Set up shared throttle timer for the entire group
      groupTransformThrottleTimer.current = setTimeout(() => {
        // Broadcast all accumulated transforms as a single group
        const transforms = { ...pendingGroupTransforms.current };
        broadcastGroupTransform(canvasId, selectedIds, user.uid, transforms);

        // Clear accumulated transforms and timer
        pendingGroupTransforms.current = {};
        groupTransformThrottleTimer.current = null;
      }, 50);
    } else {
      // Single selection: Use per-object broadcasting (existing behavior)
      // Throttle broadcasts (50ms per object)
      if (broadcastThrottleTimers.current.has(objectId)) return;

      const timer = setTimeout(() => {
        broadcastThrottleTimers.current.delete(objectId);
      }, 50);

      broadcastThrottleTimers.current.set(objectId, timer);

      // Broadcast to Realtime Database
      broadcastTransform(canvasId, objectId, user.uid, transformData);
    }
  }, [objects, user, selectedIds, canvasId]);

  const handleTransformEnd = useCallback((objectId: string) => {
    if (!user) return;

    // Multi-select: Clear group transform
    if (selectedIds.length > 1) {
      clearGroupTransform(canvasId, user.uid);
      // Clear any pending group transforms
      pendingGroupTransforms.current = {};
      if (groupTransformThrottleTimer.current) {
        clearTimeout(groupTransformThrottleTimer.current);
        groupTransformThrottleTimer.current = null;
      }
    } else {
      // Single selection: Clear individual transform
      clearTransform(canvasId, objectId);
    }
  }, [user, selectedIds, canvasId]);

  // Cleanup broadcast throttle timers on unmount
  useEffect(() => {
    return () => {
      broadcastThrottleTimers.current.forEach((timer) => clearTimeout(timer));
      broadcastThrottleTimers.current.clear();

      // Cleanup group transform timer
      if (groupTransformThrottleTimer.current) {
        clearTimeout(groupTransformThrottleTimer.current);
        groupTransformThrottleTimer.current = null;
      }

      // Cleanup batch transform end timer
      if (transformEndBatchTimer.current) {
        clearTimeout(transformEndBatchTimer.current);
        transformEndBatchTimer.current = null;
      }
    };
  }, []);

  // Keyboard handlers for tool shortcuts, Space key (pan mode), Delete key, and z-index
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts - ignore if any modifier key is pressed (Cmd, Ctrl, Alt, Shift)
      // This allows browser shortcuts like Cmd+R (refresh) to work
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;
      
      if (!hasModifier) {
        if (e.key === "v" || e.key === "V") {
          setActiveTool("select");
          e.preventDefault();
        } else if (e.key === "h" || e.key === "H") {
          setActiveTool("pan");
          e.preventDefault();
        } else if (e.key === "r" || e.key === "R") {
          setActiveTool("rectangle");
          e.preventDefault();
        } else if (e.key === "c" || e.key === "C") {
          setActiveTool("circle");
          e.preventDefault();
        } else if (e.key === "l" || e.key === "L") {
          setActiveTool("line");
          e.preventDefault();
        } else if (e.key === "t" || e.key === "T") {
          setActiveTool("text");
          // Reset text content to default when activating text tool
          updateDefaultShapeProperty("text", { content: "Text" });
          e.preventDefault();
        }
      }

      if (e.code === "Space" && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault(); // Prevent page scroll
      }

      // Track shift key for conditional Transformer behavior
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        setShiftPressed(true);
      }

      // Escape: Deselect all and cancel selection rectangle
      if (e.code === "Escape") {
        setSelectedIds([]);
        if (isSelecting) {
          setIsSelecting(false);
          setSelectionRect(null);
        }
        e.preventDefault();
      }

      // Delete selected shapes
      if ((e.code === "Delete" || e.code === "Backspace") && selectedIds.length > 0) {
        // Delete from Firestore
        selectedIds.forEach((id) => deleteObjectFromFirestore(id));
        setSelectedIds([]);
        e.preventDefault(); // Prevent browser back navigation
      }

      // Layer management shortcuts
      if (selectedIds.length > 0 && (e.metaKey || e.ctrlKey)) {
        const selectedObj = objects.find(o => o.id === selectedIds[0]);
        if (!selectedObj) return;

        if (e.key === "]") {
          e.preventDefault();
          if (e.shiftKey) {
            // Bring to Front (Cmd/Ctrl + Shift + ])
            const maxZ = getMaxZIndex(objects);
            updateZIndex(selectedIds[0], maxZ + 1);
          } else {
            // Bring Forward (Cmd/Ctrl + ])
            updateZIndex(selectedIds[0], (selectedObj.zIndex || 0) + 1);
          }
        } else if (e.key === "[") {
          e.preventDefault();
          if (e.shiftKey) {
            // Send to Back (Cmd/Ctrl + Shift + [)
            const minZ = getMinZIndex(objects);
            updateZIndex(selectedIds[0], minZ - 1);
          } else {
            // Send Backward (Cmd/Ctrl + [)
            updateZIndex(selectedIds[0], (selectedObj.zIndex || 0) - 1);
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        setIsPanning(false); // Stop panning when space released
      }

      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        setShiftPressed(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [spacePressed, shiftPressed, selectedIds, objects, updateZIndex, deleteObjectFromFirestore, setActiveTool]);

  // Initialize container size
  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const containerWidth = width || containerRef.current.clientWidth;
    const containerHeight = height || containerRef.current.clientHeight;

    setContainerSize({ width: containerWidth, height: containerHeight });

    // Initialize lock manager with user and canvas
    lockManagerRef.current.setUserId(user?.uid || null);
    lockManagerRef.current.setCanvasId(canvasId);

    // Start lock expiration checker
    lockManagerRef.current.startExpirationChecker();

    setIsReady(true);

    // Cleanup on unmount
    return () => {
      // Cleanup lock manager (releases all locks and stops checker)
      lockManagerRef.current.cleanup();
      setIsReady(false);
    };
  }, [canvasId, width, height, user?.uid, viewport.x, viewport.y, viewport.zoom]);

  // Apply viewport constraints when container size or canvas size changes
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    // Apply constraints to current viewport
    const constrained = constrainViewport({
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    // Only update if position changed
    if (constrained.x !== viewport.x || constrained.y !== viewport.y) {
      updateViewport(constrained);
    }
  }, [containerSize.width, containerSize.height, canvas.width, canvas.height]);

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

    // Apply viewport constraints
    const constrained = constrainViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: newZoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    // Update viewport store
    updateViewport({ x: constrained.x, y: constrained.y, zoom: newZoom });
  };

  // Mouse down handler for pan and drawing
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Click on empty area to start selection rectangle or deselect
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty && activeTool === "select") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasPoint = screenToCanvasCoordinates(stage, pointer);
      if (!canvasPoint) return;

      // If shift key is pressed, keep existing selection and start additive selection
      // If no shift, clear selection
      if (!e.evt.shiftKey) {
        setSelectedIds([]);
      }

      // Start selection rectangle
      setIsSelecting(true);
      selectionStartRef.current = { x: canvasPoint.x, y: canvasPoint.y };
      setSelectionRect({
        x: canvasPoint.x,
        y: canvasPoint.y,
        width: 0,
        height: 0,
      });
    }

    // If stage is draggable (pan tool or space), Konva handles the panning
    // Just track the state for cursor
    if (activeTool === "pan" || spacePressed || e.evt.button === 1) {
      setIsPanning(true);
      return;
    }

    // Start drawing shape (left click, drawing tool)
    if (e.evt.button === 0 && isDrawingTool(activeTool)) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasPoint = screenToCanvasCoordinates(stage, pointer);
      if (!canvasPoint) return;

      // Check if click is within canvas bounds
      if (!isPointInBounds(canvasPoint.x, canvasPoint.y, canvas.width, canvas.height)) {
        return; // Don't start drawing outside bounds
      }

      setIsDrawing(true);
      drawStartRef.current = { x: canvasPoint.x, y: canvasPoint.y };
      setDraftRect({
        x: canvasPoint.x,
        y: canvasPoint.y,
        width: 0,
        height: 0,
      });
    }

    // Place text object (left click, text tool)
    if (e.evt.button === 0 && activeTool === "text" && clickedOnEmpty) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasPoint = screenToCanvasCoordinates(stage, pointer);
      if (!canvasPoint) return;

      // Check if click is within canvas bounds
      if (!isPointInBounds(canvasPoint.x, canvasPoint.y, canvas.width, canvas.height)) {
        return; // Don't place text outside bounds
      }

      // Get the text factory
      const factory = getShapeFactory("text");
      if (!factory) return;

      // Get default properties for text (including user-edited content)
      const defaults = isShapeTool("text")
        ? defaultShapeProperties.text
        : {};

      // Create new text object at click position
      const newText = factory.createDefault(
        { x: canvasPoint.x, y: canvasPoint.y, width: 100, height: 30 },
        defaults,
        canvasId
      );

      // Save to Firestore
      saveObject(newText);

      // Auto-select the new text so user can edit it in properties panel
      setSelectedIds([newText.id]);

      // Switch to select tool for better UX (user can immediately edit in properties)
      setActiveTool("select");
    }
  };

  // Mouse move handler for drawing and selection
  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // Update selection rectangle while selecting
    if (isSelecting) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasPoint = screenToCanvasCoordinates(stage, pointer);
      if (!canvasPoint) return;

      // Calculate rectangle from start to current position
      const startX = selectionStartRef.current.x;
      const startY = selectionStartRef.current.y;
      const endX = canvasPoint.x;
      const endY = canvasPoint.y;

      // Normalize rectangle to handle negative drag directions (all 4 quadrants)
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      setSelectionRect({ x, y, width, height });
    }

    // Update draft shape while drawing
    if (isDrawing && draftRect && activeTool) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasPoint = screenToCanvasCoordinates(stage, pointer);
      if (!canvasPoint) return;

      // Clamp current point to canvas bounds during dragging
      const clampedPoint = clampPointToBounds(
        canvasPoint.x,
        canvasPoint.y,
        canvas.width,
        canvas.height
      );

      // Get factory for current tool
      const factory = getShapeFactory(activeTool);
      if (!factory) return;

      // Use factory to normalize drawing coordinates with clamped point
      const normalized = factory.normalizeDrawing(
        drawStartRef.current,
        clampedPoint
      );

      setDraftRect(normalized);
    }
  };

  // Mouse up handler
  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    // Finish selection rectangle
    if (isSelecting && selectionRect) {
      const shiftPressed = e.evt.shiftKey;

      // Find all objects intersecting the selection rectangle
      const intersectingIds = getIntersectingObjects(
        selectionRect,
        objects,
        user?.uid || null
      );

      // Update selection based on shift key
      if (shiftPressed) {
        // Add to existing selection (avoid duplicates)
        setSelectedIds((prev) => {
          const newIds = intersectingIds.filter((id) => !prev.includes(id));
          return [...prev, ...newIds];
        });
      } else {
        // Replace selection
        setSelectedIds(intersectingIds);
      }

      // Clear selection rectangle
      setIsSelecting(false);
      setSelectionRect(null);
      return;
    }

    // Finish drawing shape
    if (isDrawing && draftRect && activeTool) {
      setIsDrawing(false);

      // Get factory for current tool
      const factory = getShapeFactory(activeTool);
      if (!factory) {
        setDraftRect(null);
        return;
      }

      // Get default properties for this shape type
      const defaults = isShapeTool(activeTool)
        ? defaultShapeProperties[activeTool]
        : {};

      // Create shape from draft using factory with default properties
      const newShape = factory.createDefault(draftRect, defaults, canvasId);

      // Validate size
      if (!factory.validateSize(newShape)) {
        setDraftRect(null);
        return;
      }

      // Save to Firestore (will automatically update local state via subscription)
      saveObject(newShape);
      setDraftRect(null);

      // If in select tool, select the new shape
      if (activeTool === "select") {
        setSelectedIds([newShape.id]);
      }

      return;
    }

    setIsPanning(false);
  };

  // Drag bound function to constrain panning in real-time
  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    // Apply viewport constraints during drag
    const constrained = constrainViewport({
      x: pos.x,
      y: pos.y,
      zoom: viewport.zoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    return constrained;
  }, [viewport.zoom, canvas.width, canvas.height, containerSize.width, containerSize.height]);

  // Drag end handler to sync viewport after pan
  const handleDragEnd = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const newPos = { x: stage.x(), y: stage.y() };

    // Apply viewport constraints (should already be constrained by dragBoundFunc, but safety net)
    const constrained = constrainViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: viewport.zoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    updateViewport(constrained);
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

    // Apply viewport constraints
    const constrained = constrainViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: newZoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    updateViewport({ x: constrained.x, y: constrained.y, zoom: newZoom });
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

    // Apply viewport constraints
    const constrained = constrainViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: newZoom,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    updateViewport({ x: constrained.x, y: constrained.y, zoom: newZoom });
  };

  const handleResetZoom = () => {
    // Reset to center with zoom 1
    const center = {
      x: containerSize.width / 2,
      y: containerSize.height / 2,
    };

    // Apply viewport constraints
    const constrained = constrainViewport({
      x: center.x,
      y: center.y,
      zoom: 1,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    });

    updateViewport({ x: constrained.x, y: constrained.y, zoom: 1 });
  };


  // Get cursor style based on active tool and state
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'pan' || spacePressed) return 'grab';
    if (activeTool === 'select') return 'default';
    if (isDrawingTool(activeTool)) return 'crosshair';
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: '#f3f4f6',
        cursor: getCursorStyle(),
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
          draggable={activeTool === "pan" || spacePressed}
          dragBoundFunc={handleDragBound}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDragEnd={handleDragEnd}
          canvasWidth={canvas.width}
          canvasHeight={canvas.height}
          showGrid={showGrid}
        >
          {/* Persisted shapes - sorted by zIndex for correct rendering order */}
          {objects
            .slice()
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((obj) => {
            const lockedByOther = isLockedByOtherUser(
              obj.lockedBy,
              obj.lockedAt,
              obj.lockTimeout || LOCK_TIMEOUT_MS,
              user?.uid || null
            );
            const isSelectable = activeTool === "select" && !lockedByOther && !spacePressed;
            const isSelected = selectedIds.includes(obj.id);

            // Get locking user info from presence
            const lockingUser = lockedByOther && obj.lockedBy
              ? onlineUsers.find(u => u.userId === obj.lockedBy)
              : undefined;

            return (
              <ShapeComponent
                key={obj.id}
                object={obj as any}
                isSelected={isSelected}
                isLocked={lockedByOther}
                isSelectable={isSelectable}
                zoom={viewport.zoom}
                lockingUserColor={lockingUser?.color}
                lockingUserName={lockingUser?.displayName || lockingUser?.email}
                onSelect={(e) => {
                  const shiftPressed = e.evt.shiftKey;

                  if (shiftPressed) {
                    // Shift-click: toggle object in/out of selection
                    setSelectedIds((prev) => {
                      if (prev.includes(obj.id)) {
                        // Remove from selection
                        return prev.filter((id) => id !== obj.id);
                      } else {
                        // Add to selection
                        return [...prev, obj.id];
                      }
                    });
                  } else {
                    // Normal click: replace selection
                    setSelectedIds([obj.id]);
                  }
                }}
                onTransform={(updates) => {
                  const updatedObj = { ...obj, ...updates };

                  // Optimistic update to local state
                  setObjects((prev) =>
                    prev.map((o) => (o.id === obj.id ? updatedObj : o))
                  );

                  // Multi-select: Batch Firestore writes
                  if (selectedIds.length > 1) {
                    // Accumulate this update
                    pendingTransformEndUpdates.current.set(obj.id, updatedObj);

                    // Clear any existing timer
                    if (transformEndBatchTimer.current) {
                      clearTimeout(transformEndBatchTimer.current);
                    }

                    // Set a short timer to batch all updates together
                    transformEndBatchTimer.current = setTimeout(() => {
                      if (!user) return;

                      // Collect all pending updates
                      const updates = Array.from(pendingTransformEndUpdates.current.values()).map((obj) => ({
                        id: obj.id,
                        changes: obj as Partial<any>,
                        updatedBy: user.uid,
                        updatedAt: Date.now(),
                      }));

                      // Batch write to Firestore
                      batchUpdateObjects(canvasId, updates);

                      // Clear pending updates
                      pendingTransformEndUpdates.current.clear();
                      transformEndBatchTimer.current = null;
                    }, 10); // 10ms to collect all transform end events
                  } else {
                    // Single selection: Write immediately (existing behavior)
                    updateObjectInFirestore(updatedObj);
                  }

                  // Clear active transform broadcast
                  handleTransformEnd(obj.id);
                }}
                onTransformMove={(updates) => {
                  // Broadcast transform in real-time
                  handleTransformMove(obj.id, updates);
                }}
                shapeRef={(node) => {
                  if (node) {
                    shapeRefs.current.set(obj.id, node);
                  } else {
                    shapeRefs.current.delete(obj.id);
                  }
                }}
                onRenewLock={() => {
                  lockManagerRef.current.renewLockForObject(obj.id);
                }}
                onEditRequest={undefined}
              />
            );
          })}

          {/* Draft shape while drawing - rendered after persisted shapes so it appears on top */}
          {draftRect && activeTool && (() => {
            const factory = getShapeFactory(activeTool);
            if (!factory) return null;

            // Get the user's custom defaults for styling the preview
            const styleDefaults = isShapeTool(activeTool)
              ? defaultShapeProperties[activeTool]
              : undefined;

            const draftData = factory.getDraftData(draftRect, styleDefaults);

            // Calculate strokeWidth (text doesn't have strokeWidth)
            const hasStrokeWidth = styleDefaults && "strokeWidth" in styleDefaults;
            const strokeWidth = hasStrokeWidth ? styleDefaults.strokeWidth : 2;

            const commonProps = {
              strokeWidth: strokeWidth / viewport.zoom,
              listening: false,
            };

            if (draftData.type === "rect") {
              return <Rect {...draftData.props} {...commonProps} />;
            } else if (draftData.type === "circle") {
              return <Circle {...draftData.props} {...commonProps} />;
            } else if (draftData.type === "ellipse") {
              return <Ellipse {...draftData.props} {...commonProps} />;
            } else if (draftData.type === "line") {
              return <Line {...draftData.props} {...commonProps} />;
            }
            return null;
          })()}

          {/* Selection Rectangle Preview */}
          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              stroke="#3b82f6"
              strokeWidth={1 / viewport.zoom}
              dash={[4 / viewport.zoom, 4 / viewport.zoom]}
              fill="rgba(59, 130, 246, 0.1)"
              listening={false}
            />
          )}

          {/* Active Transform Overlays - rendered after shapes but before Transformer */}
          {Object.entries(activeTransformsWithUser).map(([objectId, activeTransform]) => (
            <ActiveTransformOverlay
              key={`active-transform-${objectId}`}
              activeTransform={activeTransform}
              zoom={viewport.zoom}
            />
          ))}

          {/* Transformer for selection handles */}
          {activeTool === "select" && !spacePressed && (
            <Transformer
              ref={transformerRef}
              shouldOverdrawWholeArea={!shiftPressed && selectedIds.length > 1}
            />
          )}
          
          {/* Remote Cursors - rendered inside canvas */}
          {Object.entries(remoteCursors).map(([userId, cursor]) => (
            <RemoteCursorKonva
              key={userId}
              x={cursor.x}
              y={cursor.y}
              displayName={cursor.displayName}
              color={cursor.color}
              zoom={viewport.zoom}
            />
          ))}
        </StageContainer>
      )}
      
      {/* Toolbar (centered bottom) */}
      {isReady && <Toolbar />}

      {/* Grid Toggle (top-left) */}
      {isReady && (
        <TooltipProvider>
          <div className="absolute top-6 left-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleGrid}
                  className={`bg-white border shadow-md ${showGrid ? "bg-accent" : ""}`}
                >
                  <Grid3x3 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{showGrid ? "Hide Grid" : "Show Grid"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* Properties Panel (right side) */}
      {isReady && (
        <PropertiesPanel
          selectedIds={selectedIds}
          objects={objects}
          onUpdate={handlePropertyUpdate}
          currentUserId={user?.uid || null}
          activeTool={activeTool}
          defaultShapeProperties={defaultShapeProperties}
          onUpdateDefaults={updateDefaultShapeProperty}
        />
      )}
      
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
