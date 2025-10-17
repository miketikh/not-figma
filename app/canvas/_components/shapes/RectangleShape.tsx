"use client";

import { useMemo } from "react";
import { Group, Rect } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedRect } from "../../_types/shapes";
import LockedByBadge from "../LockedByBadge";
import { createRectangleDragBound } from "../../_lib/drag-bounds";

/**
 * Props for RectangleShape component
 */
export interface RectangleShapeProps {
  /** The rectangle shape data */
  shape: PersistedRect;

  /** Whether this shape is currently selected */
  isSelected: boolean;

  /** Whether this shape is locked by another user */
  isLocked: boolean;

  /** Whether this shape can be selected (depends on active tool) */
  isSelectable: boolean;

  /** Viewport zoom level (for stroke scaling) */
  zoom: number;

  /** Color of the user who locked this object (if locked) */
  lockingUserColor?: string;

  /** Display name of the user who locked this object (if locked) */
  lockingUserName?: string;

  /** Callback when shape is selected */
  onSelect: (e: KonvaEventObject<MouseEvent>) => void;

  /** Callback when shape is transformed (drag/resize/rotate) */
  onTransform: (updates: Partial<PersistedRect>) => void;

  /** Callback for real-time transform broadcasting during drag/resize/rotate */
  onTransformMove?: (updates: Partial<PersistedRect>) => void;

  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Rect | null) => void;

  /** Callback to renew lock during interaction */
  onRenewLock: () => void;

  /** Canvas width for drag bounds constraints */
  canvasWidth: number;

  /** Canvas height for drag bounds constraints */
  canvasHeight: number;
}

/**
 * RectangleShape Component
 * Renders a rectangle using Konva with full interaction support
 */
export default function RectangleShape({
  shape,
  isLocked,
  isSelectable,
  zoom,
  lockingUserColor,
  lockingUserName,
  onSelect,
  onTransform,
  onTransformMove,
  shapeRef,
  onRenewLock,
  canvasWidth,
  canvasHeight,
}: RectangleShapeProps) {
  // Determine stroke color based on lock status
  // Use locking user's color if available, otherwise fallback to red
  const strokeColor = isLocked ? lockingUserColor || "#ef4444" : shape.stroke;
  const strokeWidth = shape.strokeWidth / zoom;

  /**
   * Handle click to select
   */
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelectable) return;
    e.cancelBubble = true;
    onSelect(e);
  };

  /**
   * Handle drag move to broadcast position in real-time
   * Also constrain position to keep object partially visible
   */
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Rect;

    // Constrain position to keep at least 20 pixels visible
    const MIN_VISIBLE = 20;
    let x = node.x();
    let y = node.y();

    // Constrain X
    const minX = -(shape.width - MIN_VISIBLE);
    const maxX = canvasWidth - MIN_VISIBLE;
    x = Math.max(minX, Math.min(maxX, x));

    // Constrain Y
    const minY = -(shape.height - MIN_VISIBLE);
    const maxY = canvasHeight - MIN_VISIBLE;
    y = Math.max(minY, Math.min(maxY, y));

    // Apply constrained position
    node.x(x);
    node.y(y);

    if (!onTransformMove) return;

    // Broadcast constrained position update in real-time
    onTransformMove({
      x,
      y,
    });
  };

  /**
   * Handle drag end to update position
   */
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Rect;

    // Update position
    onTransform({
      x: node.x(),
      y: node.y(),
    });

    // Renew lock
    onRenewLock();
  };

  /**
   * Handle transform to broadcast size/rotation in real-time
   */
  const handleTransform = (e: KonvaEventObject<Event>) => {
    if (!onTransformMove) return;

    const node = e.target as Konva.Rect;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Broadcast transform update in real-time (don't reset scale yet)
    onTransformMove({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  /**
   * Handle transform end to update size/rotation
   */
  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Rect;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    // Update shape with new dimensions
    onTransform({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });

    // Renew lock
    onRenewLock();
  };

  // Memoize drag bound function to ensure stable reference
  const dragBoundFunc = useMemo(
    () => createRectangleDragBound(shape.width, shape.height, canvasWidth, canvasHeight),
    [shape.width, shape.height, canvasWidth, canvasHeight]
  );

  return (
    <Group>
      <Rect
        ref={shapeRef}
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rotation={shape.rotation}
        opacity={shape.opacity ?? 1}
        cornerRadius={shape.cornerRadius || 0}
        draggable={isSelectable}
        listening={isSelectable}
        dragBoundFunc={dragBoundFunc}
        onClick={handleClick}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />

      {/* Show locked-by badge when locked by another user */}
      {isLocked && lockingUserColor && lockingUserName && (
        <LockedByBadge
          x={shape.x + shape.width}
          y={shape.y}
          displayName={lockingUserName}
          color={lockingUserColor}
          zoom={zoom}
        />
      )}
    </Group>
  );
}
