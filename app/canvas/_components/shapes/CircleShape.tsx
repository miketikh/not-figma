"use client";

import { Ellipse } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedCircle } from "../../_types/shapes";

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
  
  /** Callback when shape is selected */
  onSelect: () => void;
  
  /** Callback when shape is transformed (drag/resize) */
  onTransform: (updates: Partial<PersistedCircle>) => void;
  
  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Ellipse | null) => void;
  
  /** Callback to renew lock during interaction */
  onRenewLock: () => void;
}

/**
 * CircleShape Component
 * Renders a circle/ellipse using Konva with full interaction support
 */
export default function CircleShape({
  shape,
  isSelected,
  isLocked,
  isSelectable,
  zoom,
  onSelect,
  onTransform,
  shapeRef,
  onRenewLock,
}: CircleShapeProps) {
  // Determine stroke color based on lock status
  const strokeColor = isLocked ? "#ef4444" : shape.stroke;
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

  return (
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
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

