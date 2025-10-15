"use client";

import { Group, Line } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedLine } from "../../_types/shapes";
import LockedByBadge from "../LockedByBadge";

/**
 * Props for LineShape component
 */
export interface LineShapeProps {
  /** The line shape data */
  shape: PersistedLine;

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
  onSelect: () => void;

  /** Callback when shape is transformed (drag/resize) */
  onTransform: (updates: Partial<PersistedLine>) => void;

  /** Callback for real-time transform broadcasting during drag/resize */
  onTransformMove?: (updates: Partial<PersistedLine>) => void;

  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Line | null) => void;

  /** Callback to renew lock during interaction */
  onRenewLock: () => void;
}

/**
 * LineShape Component
 * Renders a line using Konva with full interaction support
 */
export default function LineShape({
  shape,
  isSelected,
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
}: LineShapeProps) {
  // Determine stroke color based on lock status
  // Use locking user's color if available, otherwise fallback to red
  const strokeColor = isLocked
    ? (lockingUserColor || "#ef4444")
    : shape.stroke;
  const strokeWidth = shape.strokeWidth / zoom;

  /**
   * Handle click to select
   */
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelectable) return;
    e.cancelBubble = true;
    onSelect();
  };

  /**
   * Handle drag move to broadcast position in real-time
   */
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (!onTransformMove) return;

    const node = e.target as Konva.Line;

    // Calculate the delta from the drag
    const dx = node.x();
    const dy = node.y();

    // Broadcast endpoint translation in real-time
    onTransformMove({
      x: shape.x + dx,
      y: shape.y + dy,
      x2: shape.x2 + dx,
      y2: shape.y2 + dy,
    });
  };

  /**
   * Handle drag end to update position
   * When dragging a line, both endpoints move together (translation)
   */
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Line;

    // Calculate the delta from the drag
    const dx = node.x();
    const dy = node.y();

    // Update both endpoints by the drag delta
    onTransform({
      x: shape.x + dx,
      y: shape.y + dy,
      x2: shape.x2 + dx,
      y2: shape.y2 + dy,
    });

    // Reset node position to origin (since we've updated the points)
    node.position({ x: 0, y: 0 });

    // Renew lock
    onRenewLock();
  };

  /**
   * Handle transform to broadcast endpoint scaling in real-time
   */
  const handleTransform = (e: KonvaEventObject<Event>) => {
    if (!onTransformMove) return;

    const node = e.target as Konva.Line;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Get current points
    const points = node.points();

    // Apply scale to points and broadcast in real-time
    const scaledPoints = [
      points[0] * scaleX,
      points[1] * scaleY,
      points[2] * scaleX,
      points[3] * scaleY,
    ];

    // Broadcast endpoint update in real-time (don't reset scale yet)
    onTransformMove({
      x: scaledPoints[0],
      y: scaledPoints[1],
      x2: scaledPoints[2],
      y2: scaledPoints[3],
    });
  };

  /**
   * Handle transform end to update endpoints
   * This handles when the transformer is used to scale/rotate the line
   */
  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Line;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Get current points
    const points = node.points();

    // Apply scale to points
    const scaledPoints = [
      points[0] * scaleX,
      points[1] * scaleY,
      points[2] * scaleX,
      points[3] * scaleY,
    ];

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    // Update line endpoints with scaled values
    onTransform({
      x: scaledPoints[0],
      y: scaledPoints[1],
      x2: scaledPoints[2],
      y2: scaledPoints[3],
    });

    // Renew lock
    onRenewLock();
  };

  // Calculate badge position at the end of the line
  const badgeX = Math.max(shape.x, shape.x2);
  const badgeY = Math.min(shape.y, shape.y2);

  return (
    <Group>
      <Line
        ref={shapeRef}
        points={[shape.x, shape.y, shape.x2, shape.y2]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={shape.opacity ?? 1}
        draggable={isSelectable}
        listening={isSelectable}
        onClick={handleClick}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
        // Increase hit detection area for thin lines
        hitStrokeWidth={Math.max(strokeWidth * zoom, 10)}
      />

      {/* Show locked-by badge when locked by another user */}
      {isLocked && lockingUserColor && lockingUserName && (
        <LockedByBadge
          x={badgeX}
          y={badgeY}
          displayName={lockingUserName}
          color={lockingUserColor}
          zoom={zoom}
        />
      )}
    </Group>
  );
}

