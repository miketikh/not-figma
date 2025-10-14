"use client";

import { Rect } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { PersistedRect } from "../../_lib/shapes";

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
  
  /** Callback when shape is selected */
  onSelect: () => void;
  
  /** Callback when shape is transformed (drag/resize/rotate) */
  onTransform: (updates: Partial<PersistedRect>) => void;
  
  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Rect | null) => void;
  
  /** Callback to renew lock during interaction */
  onRenewLock: () => void;
}

/**
 * RectangleShape Component
 * Renders a rectangle using Konva with full interaction support
 */
export default function RectangleShape({
  shape,
  isSelected,
  isLocked,
  isSelectable,
  zoom,
  onSelect,
  onTransform,
  shapeRef,
  onRenewLock,
}: RectangleShapeProps) {
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

  return (
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
      draggable={isSelectable}
      listening={isSelectable}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

