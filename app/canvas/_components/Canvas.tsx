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
import { ImageUploadDialog } from "./ImageUploadDialog";
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
import { useToast } from "@/components/ui/toast";
import { validateImageUpload } from "@/lib/firebase/storage-validation";
import { uploadImage, deleteImage } from "@/lib/firebase/storage";
import { generateObjectId } from "@/app/canvas/_lib/objects";
import { getImageDimensions, scaleImageToFit } from "@/app/canvas/_lib/image-utils";
import { Upload } from "lucide-react";

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

  // Image upload state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(
    new Set()
  );
  // Note: uploadingImages will be used in PR #10 to show loading spinners on canvas

  // Track when user is actively transforming an image
  const [isTransformingImage, setIsTransformingImage] = useState(false);

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
    clearChatHistory,
  } = useCanvasStore();
  const { user } = useAuth();
  const { addToast } = useToast();

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

  /**
   * Handle object deletion
   * For images, also delete from Firebase Storage
   */
  const handleObjectDelete = useCallback(
    async (objectId: string) => {
      // Find the object to check if it's an image
      const object = objects.find((obj) => obj.id === objectId);

      if (object && object.type === "image") {
        // Extract file extension from imageUrl
        const urlParts = object.imageUrl.split(".");
        const extension = urlParts[urlParts.length - 1].split("?")[0]; // Remove query params

        try {
          // Delete from Storage first
          await deleteImage(canvasId, objectId, extension);
        } catch (error) {
          console.error("Error deleting image from storage:", error);
          // Continue with Firestore deletion even if Storage deletion fails
        }
      }

      // Delete from Firestore
      await deleteObjectFromFirestore(objectId);

      // Remove from selection
      setSelectedIds((prev) => prev.filter((id) => id !== objectId));
    },
    [objects, canvasId, deleteObjectFromFirestore, setSelectedIds]
  );

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

  // Handler to open image upload dialog
  const openImageUploadDialog = useCallback(() => {
    setIsImageUploadDialogOpen(true);
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
    openImageUploadDialog,
  });

  // Stop panning when space released
  useEffect(() => {
    if (!spacePressed) {
      setIsPanning(false);
    }
  }, [spacePressed]);

  // Initialize container size and observe resize changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Function to update container size
    const updateContainerSize = () => {
      const containerWidth = width || container.clientWidth;
      const containerHeight = height || container.clientHeight;
      setContainerSize({ width: containerWidth, height: containerHeight });
    };

    // Initial measurement
    updateContainerSize();
    setIsReady(true);

    // Create ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to debounce rapid resize events
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width: observedWidth, height: observedHeight } = entry.contentRect;
          const containerWidth = width || observedWidth;
          const containerHeight = height || observedHeight;
          setContainerSize({ width: containerWidth, height: containerHeight });
        }
      });
    });

    // Start observing the container
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
      setIsReady(false);
    };
  }, [width, height]);

  // Clear AI chat history when canvasId changes
  useEffect(() => {
    // Clear chat history to ensure each canvas has isolated chat
    clearChatHistory();
  }, [canvasId, clearChatHistory]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize.width, containerSize.height, canvas.width, canvas.height]);

  // Drag-and-drop handlers for image upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the container itself, not child elements
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      if (!user) {
        addToast({
          title: "Error",
          description: "You must be logged in to upload images",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Calculate drop location from mouse position (account for viewport pan/zoom)
      const stage = stageRef.current;
      if (!stage) return;

      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      // Convert screen coordinates to canvas coordinates
      const dropX = (pointerPosition.x - viewport.x) / viewport.zoom;
      const dropY = (pointerPosition.y - viewport.y) / viewport.zoom;

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file
        const validation = await validateImageUpload(file);
        if (!validation.valid) {
          addToast({
            title: "Invalid Image",
            description: validation.error || "Failed to validate image",
            variant: "destructive",
            duration: 5000,
          });
          continue;
        }

        // Generate unique image ID
        const imageId = generateObjectId();

        try {
          // Add to uploading set
          setUploadingImages((prev) => new Set(prev).add(imageId));

          // Get image dimensions
          const dimensions = await getImageDimensions(file);

          // Upload to Firebase Storage
          const downloadURL = await uploadImage(file, canvasId, imageId);

          // Scale to reasonable size for initial placement (max 800px)
          const scaled = scaleImageToFit(
            dimensions.width,
            dimensions.height,
            800,
            800
          );

          // Calculate position with cascade offset for multiple files
          const offsetX = i * 50;
          const offsetY = i * 50;
          const x = dropX + offsetX - scaled.width / 2;
          const y = dropY + offsetY - scaled.height / 2;

          // Create image object using factory pattern (will be implemented in PR #9)
          // For now, we'll save it directly as we don't have imageFactory yet
          const imageObject = {
            id: imageId,
            type: "image" as const,
            x,
            y,
            width: scaled.width,
            height: scaled.height,
            rotation: 0,
            opacity: 1,
            zIndex: objects.length,
            imageUrl: downloadURL,
            originalWidth: dimensions.width,
            originalHeight: dimensions.height,
            fileName: file.name,
            fileSize: file.size,
            lockedBy: null,
            lockedAt: null,
            lockTimeout: LOCK_TIMEOUT_MS,
          };

          // Save to Firestore
          await saveObject(imageObject as any);

          // Remove from uploading set
          setUploadingImages((prev) => {
            const next = new Set(prev);
            next.delete(imageId);
            return next;
          });

          // Show success toast
          addToast({
            title: "Success",
            description: `Image "${file.name}" uploaded successfully`,
            variant: "success",
            duration: 3000,
          });
        } catch (error) {
          console.error("Error uploading image:", error);

          // Remove from uploading set
          setUploadingImages((prev) => {
            const next = new Set(prev);
            next.delete(imageId);
            return next;
          });

          // Show error toast
          addToast({
            title: "Upload Failed",
            description:
              error instanceof Error
                ? error.message
                : "Failed to upload image. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    },
    [
      user,
      addToast,
      stageRef,
      viewport,
      canvasId,
      objects.length,
      saveObject,
    ]
  );

  // Handler for image imported from URL via dialog
  const handleImageImported = useCallback(
    async (imageData: {
      id: string;
      imageUrl: string;
      originalWidth: number;
      originalHeight: number;
      width: number;
      height: number;
      x: number;
      y: number;
    }) => {
      if (!user) return;

      try {
        // Create image object
        const imageObject = {
          id: imageData.id,
          type: "image" as const,
          x: imageData.x,
          y: imageData.y,
          width: imageData.width,
          height: imageData.height,
          rotation: 0,
          opacity: 1,
          zIndex: objects.length,
          imageUrl: imageData.imageUrl,
          originalWidth: imageData.originalWidth,
          originalHeight: imageData.originalHeight,
          lockedBy: null,
          lockedAt: null,
          lockTimeout: LOCK_TIMEOUT_MS,
        };

        // Save to Firestore
        await saveObject(imageObject as any);

        // Show success toast
        addToast({
          title: "Success",
          description: "Image imported from URL successfully",
          variant: "success",
          duration: 3000,
        });
      } catch (error) {
        console.error("Error saving imported image:", error);
        addToast({
          title: "Error",
          description: "Failed to save image. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    },
    [user, objects.length, saveObject, addToast]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: "#f3f4f6",
        cursor: getCursorStyle(activeTool, isPanning, spacePressed),
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
              keepRatio={
                // Enable aspect ratio lock for images based on their aspectRatioLocked property
                // Shift key temporarily inverts the lock state
                selectedIds.length === 1 &&
                objects.find((obj) => obj.id === selectedIds[0])?.type === "image"
                  ? (() => {
                      const image = objects.find((obj) => obj.id === selectedIds[0]);
                      const aspectRatioLocked = image?.type === "image" ? (image.aspectRatioLocked ?? true) : false;
                      // Shift key inverts the lock state: locked becomes unlocked, unlocked becomes locked
                      return shiftPressed ? !aspectRatioLocked : aspectRatioLocked;
                    })()
                  : false
              }
              onTransformStart={() => {
                // Track if we're transforming an image
                const selectedObj = objects.find((obj) => obj.id === selectedIds[0]);
                if (selectedObj?.type === "image") {
                  setIsTransformingImage(true);
                }
              }}
              onTransformEnd={() => {
                setIsTransformingImage(false);
              }}
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
      {isReady && <Toolbar onImageUploadClick={openImageUploadDialog} />}

      {/* Aspect Ratio Lock Visual Indicator */}
      {isReady && isTransformingImage && shiftPressed && selectedIds.length === 1 && (
        (() => {
          const selectedImage = objects.find((obj) => obj.id === selectedIds[0]);
          if (selectedImage?.type !== "image") return null;
          const aspectRatioLocked = selectedImage.aspectRatioLocked ?? true;
          // Only show indicator when Shift is actually changing the lock state
          const message = aspectRatioLocked
            ? "Aspect ratio unlocked"
            : "Aspect ratio locked";

          return (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 pointer-events-none">
              {message}
            </div>
          );
        })()
      )}

      {/* Properties Panel (right side) */}
      {isReady && (
        <PropertiesPanel
          selectedIds={selectedIds}
          objects={objects}
          onUpdate={handlePropertyUpdate}
          onDelete={handleObjectDelete}
          currentUserId={user?.uid || null}
          activeTool={activeTool}
          defaultShapeProperties={defaultShapeProperties}
          onUpdateDefaults={updateDefaultShapeProperty}
          canvasWidth={canvas.width}
          canvasHeight={canvas.height}
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

      {/* Drop Zone Overlay - shown when dragging files over canvas */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-4 border-4 border-dashed border-blue-500 rounded-lg bg-blue-500/10 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 text-blue-600">
            <Upload className="h-16 w-16" />
            <p className="text-2xl font-semibold">Drop image here</p>
            <p className="text-sm text-blue-600/80">
              Supports PNG, JPEG, WebP, GIF, SVG (max 5MB)
            </p>
          </div>
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p style={{ color: "var(--color-gray-500)" }}>Loading canvas...</p>
        </div>
      )}

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        open={isImageUploadDialogOpen}
        onOpenChange={setIsImageUploadDialogOpen}
        canvasId={canvasId}
        viewportCenter={{
          x: containerSize.width / 2 / viewport.zoom - viewport.x / viewport.zoom,
          y: containerSize.height / 2 / viewport.zoom - viewport.y / viewport.zoom,
        }}
        onImageImported={handleImageImported}
      />
    </div>
  );
}
