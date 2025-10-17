"use client";

import { useMemo } from "react";
import { Group, Ellipse } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedCircle } from "../../_types/shapes";
import LockedByBadge from "../LockedByBadge";
import { createCircleDragBound } from "../../_lib/drag-bounds";

/**
 * Props for CircleShape component
 */
export interface CircleShapeProps {
  /** The circle shape data */
  shape: PersistedCircle;

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

  /** Callback when shape is transformed (drag/resize) */
  onTransform: (updates: Partial<PersistedCircle>) => void;

  /** Callback for real-time transform broadcasting during drag/resize */
  onTransformMove?: (updates: Partial<PersistedCircle>) => void;

  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Ellipse | null) => void;

  /** Callback to renew lock during interaction */
  onRenewLock: () => void;

  /** Canvas width for drag bounds constraints */
  canvasWidth: number;

  /** Canvas height for drag bounds constraints */
  canvasHeight: number;
}

/**
 * CircleShape Component
 * Renders a circle/ellipse using Konva with full interaction support
 */
export default function CircleShape({
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
}: CircleShapeProps) {
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
    const node = e.target as Konva.Ellipse;

    // Constrain position to keep at least 20 pixels visible
    const MIN_VISIBLE = 20;
    let x = node.x();
    let y = node.y();

    // Constrain X (x is center, so account for radius)
    // When going left: bottom edge (x + radiusX) must stay >= MIN_VISIBLE
    // When going right: top edge (x - radiusX) must stay <= canvasWidth - MIN_VISIBLE
    const minX = MIN_VISIBLE - shape.radiusX;
    const maxX = canvasWidth - MIN_VISIBLE + shape.radiusX;
    x = Math.max(minX, Math.min(maxX, x));

    // Constrain Y (y is center, so account for radius)
    // When going up: bottom edge (y + radiusY) must stay >= MIN_VISIBLE
    // When going down: top edge (y - radiusY) must stay <= canvasHeight - MIN_VISIBLE
    const minY = MIN_VISIBLE - shape.radiusY;
    const maxY = canvasHeight - MIN_VISIBLE + shape.radiusY;
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
    const node = e.target as Konva.Ellipse;

    // Update center position
    onTransform({
      x: node.x(),
      y: node.y(),
    });

    // Renew lock
    onRenewLock();
  };

  /**
   * Handle transform to broadcast radii in real-time
   */
  const handleTransform = (e: KonvaEventObject<Event>) => {
    if (!onTransformMove) return;

    const node = e.target as Konva.Ellipse;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Broadcast transform update in real-time (don't reset scale yet)
    onTransformMove({
      x: node.x(),
      y: node.y(),
      radiusX: Math.max(5, node.radiusX() * scaleX),
      radiusY: Math.max(5, node.radiusY() * scaleY),
    });
  };

  /**
   * Handle transform end to update radiusX and radiusY
   */
  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Ellipse;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to radii
    node.scaleX(1);
    node.scaleY(1);

    // Update ellipse with new radii (allow independent scaling)
    onTransform({
      x: node.x(),
      y: node.y(),
      radiusX: Math.max(5, node.radiusX() * scaleX),
      radiusY: Math.max(5, node.radiusY() * scaleY),
    });

    // Renew lock
    onRenewLock();
  };

  // Memoize drag bound function to ensure stable reference
  const dragBoundFunc = useMemo(
    () => createCircleDragBound(shape.radiusX, shape.radiusY, canvasWidth, canvasHeight),
    [shape.radiusX, shape.radiusY, canvasWidth, canvasHeight]
  );

  return (
    <Group>
      <Ellipse
        ref={shapeRef}
        x={shape.x}
        y={shape.y}
        radiusX={shape.radiusX}
        radiusY={shape.radiusY}
        fill={shape.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={shape.opacity ?? 1}
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
          x={shape.x + shape.radiusX}
          y={shape.y - shape.radiusY}
          displayName={lockingUserName}
          color={lockingUserColor}
          zoom={zoom}
        />
      )}
    </Group>
  );
}
