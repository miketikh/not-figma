"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore } from "../_store/canvas-store";
import { useAuth } from "@/hooks/useAuth";
import Toolbar from "./Toolbar";
import RemoteCursorKonva from "./RemoteCursorKonva";
import ActiveTransformOverlay from "./ActiveTransformOverlay";
import PropertiesPanel from "./PropertiesPanel";
import ViewControls from "./ViewControls";
import DraftShapeRenderer from "./DraftShapeRenderer";
import SelectionRectRenderer from "./SelectionRectRenderer";
import AIChatPanel from "./AIChatPanel";
import CursorCoordinates from "./CursorCoordinates";
import { useObjects } from "../_hooks/useObjects";
import { batchUpdateObjects } from "@/lib/firebase/firestore";
import { useCursors } from "../_hooks/useCursors";
import { useActiveTransforms } from "../_hooks/useActiveTransforms";
import { usePresence } from "../_hooks/usePresence";
import { isLockedByOtherUser } from "../_lib/locks";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";
import StageContainer from "./StageContainer";
import Konva from "konva";
import { Transformer } from "react-konva";
import ShapeComponent from "./shapes";
import type { PersistedShape } from "../_types/shapes";
import { useDrawing } from "../_hooks/useDrawing";
import { useSelection } from "../_hooks/useSelection";
import { useZoom } from "../_hooks/useZoom";
import { useKeyboardShortcuts } from "../_hooks/useKeyboardShortcuts";
import { useMouseHandlers } from "../_hooks/useMouseHandlers";
import { useLockManager } from "../_hooks/useLockManager";
import { useTransformBroadcast } from "../_hooks/useTransformBroadcast";
import { useDebouncedPropertyUpdate } from "../_hooks/useDebouncedPropertyUpdate";
import { getCursorStyle } from "../_lib/cursor-helpers";
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

export default function Canvas({
  canvasId,
  canvas,
  width,
  height,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [isReady, setIsReady] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [shiftPressed, setShiftPressed] = useState(false);

  // Cursor coordinates state
  const [cursorCoords, setCursorCoords] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  // Persisted shapes
  const [objects, setObjects] = useState<PersistedShape[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map());

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
    toggleAIChat,
  } = useCanvasStore();
  const { user } = useAuth();

  // Stable callback for Firestore updates
  const handleObjectsUpdate = useCallback(
    (firestoreShapes: PersistedShape[]) => {
      setObjects(firestoreShapes);
    },
    []
  );

  // Object persistence with Firestore
  const { saveObject, updateObjectInFirestore, deleteObjectFromFirestore } =
    useObjects({
      canvasId,
      isReady,
      onObjectsUpdate: handleObjectsUpdate,
    });

  // Lock manager hook - manages distributed locks for canvas objects
  const lockManager = useLockManager({
    canvasId,
    userId: user?.uid || null,
    selectedIds,
    onLockExpired: (expiredObjectIds) => {
      // Remove expired objects from selection when locks expire
      setSelectedIds((prev) =>
        prev.filter((id) => !expiredObjectIds.includes(id))
      );
    },
  });

  // Debounced property update hook - for properties panel
  const { updateProperty: handlePropertyUpdate } = useDebouncedPropertyUpdate({
    objects,
    setObjects,
    updateObjectInFirestore,
    lockManager,
    debounceMs: 300,
  });

  // Transform broadcast hook - manages real-time transform broadcasting
  const transformBroadcast = useTransformBroadcast({
    canvasId,
    user,
    objects,
    selectedIds,
  });

  // Drawing hook - manages drawing state and draft shapes
  const drawing = useDrawing({
    activeTool,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    saveObject,
    defaultShapeProperties,
    canvasId,
  });

  // Selection hook - manages selection rectangle (drag-to-select)
  const selection = useSelection({
    objects,
    selectedIds,
    setSelectedIds,
    currentUserId: user?.uid || null,
  });

  // Zoom hook - manages all zoom functionality
  const zoom = useZoom({
    stageRef,
    viewport,
    updateViewport,
    containerSize,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });

  // Mouse handlers hook - delegates to drawing and selection hooks
  const mouseHandlers = useMouseHandlers({
    stageRef,
    activeTool,
    spacePressed,
    setIsPanning,
    selectedIds,
    setSelectedIds,
    canvas: { width: canvas.width, height: canvas.height },
    viewport,
    updateViewport,
    containerSize,
    defaultShapeProperties,
    canvasId,
    saveObject,
    setActiveTool,
    onCursorMove: setCursorCoords,
    drawing,
    selection,
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

  // Helper function for updating z-index
  const updateZIndex = useCallback(
    (objectId: string, newZIndex: number) => {
      const obj = objects.find((o) => o.id === objectId);
      if (!obj) return;

      const updatedObj = { ...obj, zIndex: newZIndex };

      // Optimistic update
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? updatedObj : o))
      );

      // Persist to Firestore
      updateObjectInFirestore(updatedObj);
    },
    [objects, updateObjectInFirestore]
  );

  // Batch Firestore writes on transform end (multi-select optimization)
  const transformEndBatchTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingTransformEndUpdates = useRef<Map<string, PersistedShape>>(
    new Map()
  );

  // Cleanup batch transform end timer on unmount
  useEffect(() => {
    return () => {
      if (transformEndBatchTimer.current) {
        clearTimeout(transformEndBatchTimer.current);
        transformEndBatchTimer.current = null;
      }
    };
  }, []);

  // Keyboard shortcuts hook - manages all keyboard shortcuts
  useKeyboardShortcuts({
    activeTool,
    setActiveTool,
    spacePressed,
    setSpacePressed,
    shiftPressed,
    setShiftPressed,
    selectedIds,
    setSelectedIds,
    objects,
    updateZIndex,
    deleteObjects: (ids: string[]) => {
      ids.forEach((id) => deleteObjectFromFirestore(id));
    },
    isSelecting: selection.isSelecting,
    cancelSelection: selection.cancelSelection,
    updateDefaultShapeProperty: (tool, properties) => {
      // Type guard to ensure tool is a valid shape type
      if (
        tool === "rectangle" ||
        tool === "circle" ||
        tool === "line" ||
        tool === "text"
      ) {
        updateDefaultShapeProperty(tool, properties);
      }
    },
    toggleAIChat,
  });

  // Stop panning when space released
  useEffect(() => {
    if (!spacePressed) {
      setIsPanning(false);
    }
  }, [spacePressed]);

  // Initialize container size
  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const containerWidth = width || containerRef.current.clientWidth;
    const containerHeight = height || containerRef.current.clientHeight;

    setContainerSize({ width: containerWidth, height: containerHeight });
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      setIsReady(false);
    };
  }, [width, height]);

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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: "#f3f4f6",
        cursor: getCursorStyle(activeTool, isPanning, spacePressed),
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
          dragBoundFunc={mouseHandlers.handleDragBound}
          onWheel={zoom.handleWheel}
          onMouseDown={mouseHandlers.handleMouseDown}
          onMouseMove={mouseHandlers.handleMouseMove}
          onMouseUp={mouseHandlers.handleMouseUp}
          onMouseEnter={mouseHandlers.handleMouseEnter}
          onMouseLeave={mouseHandlers.handleMouseLeave}
          onDragEnd={mouseHandlers.handleDragEnd}
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
              const isSelectable =
                activeTool === "select" && !lockedByOther && !spacePressed;
              const isSelected = selectedIds.includes(obj.id);

              // Get locking user info from presence
              const lockingUser =
                lockedByOther && obj.lockedBy
                  ? onlineUsers.find((u) => u.userId === obj.lockedBy)
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
                  lockingUserName={
                    lockingUser?.displayName || lockingUser?.email
                  }
                  canvasWidth={canvas.width}
                  canvasHeight={canvas.height}
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
                      pendingTransformEndUpdates.current.set(
                        obj.id,
                        updatedObj
                      );

                      // Clear any existing timer
                      if (transformEndBatchTimer.current) {
                        clearTimeout(transformEndBatchTimer.current);
                      }

                      // Set a short timer to batch all updates together
                      transformEndBatchTimer.current = setTimeout(() => {
                        if (!user) return;

                        // Collect all pending updates
                        const updates = Array.from(
                          pendingTransformEndUpdates.current.values()
                        ).map((obj) => ({
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
                    transformBroadcast.clearTransformBroadcast(obj.id);
                  }}
                  onTransformMove={(updates) => {
                    // Broadcast transform in real-time
                    transformBroadcast.broadcastTransformMove(obj.id, updates);
                  }}
                  shapeRef={(node) => {
                    if (node) {
                      shapeRefs.current.set(obj.id, node);
                    } else {
                      shapeRefs.current.delete(obj.id);
                    }
                  }}
                  onRenewLock={() => {
                    lockManager.renewLockForObject(obj.id);
                  }}
                  onEditRequest={undefined}
                />
              );
            })}

          {/* Draft shape while drawing - rendered after persisted shapes so it appears on top */}
          {drawing.draftRect && activeTool && (
            <DraftShapeRenderer
              draftRect={drawing.draftRect}
              activeTool={activeTool}
              defaultShapeProperties={defaultShapeProperties}
              zoom={viewport.zoom}
            />
          )}

          {/* Selection Rectangle Preview */}
          {selection.selectionRect && (
            <SelectionRectRenderer
              selectionRect={selection.selectionRect}
              zoom={viewport.zoom}
            />
          )}

          {/* Active Transform Overlays - rendered after shapes but before Transformer */}
          {Object.entries(activeTransformsWithUser).map(
            ([objectId, activeTransform]) => (
              <ActiveTransformOverlay
                key={`active-transform-${objectId}`}
                activeTransform={activeTransform}
                zoom={viewport.zoom}
              />
            )
          )}

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

      {/* View Controls (bottom-right) - Grid toggle and zoom controls */}
      {isReady && (
        <ViewControls
          zoom={viewport.zoom}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onResetZoom={zoom.resetZoom}
          showGrid={showGrid}
          onToggleGrid={toggleGrid}
        />
      )}

      {/* AI Chat Panel (slides in from right) */}
      {isReady && (
        <AIChatPanel
          canvasId={canvasId}
          selectedIds={selectedIds}
          onAutoSelect={(objectId) => {
            setSelectedIds([objectId]);
          }}
        />
      )}

      {/* Cursor Coordinates Display */}
      {isReady && (
        <CursorCoordinates
          x={cursorCoords.x}
          y={cursorCoords.y}
          visible={cursorCoords.visible}
        />
      )}

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p style={{ color: "var(--color-gray-500)" }}>Loading canvas...</p>
        </div>
      )}
    </div>
  );
}
