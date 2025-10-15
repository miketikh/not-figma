"use client";

import { Text } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedText } from "../../_types/shapes";

/**
 * Props for TextShape component
 */
export interface TextShapeProps {
  /** The text shape data */
  shape: PersistedText;
  
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
  onTransform: (updates: Partial<PersistedText>) => void;
  
  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Text | null) => void;
  
  /** Callback to renew lock during interaction */
  onRenewLock: () => void;
  
  /** Callback when double-clicked to edit */
  onEditRequest?: (textId: string) => void;
}

/**
 * TextShape Component
 * Renders text using Konva with full interaction support
 * MVP: No inline editing, edit via properties panel only
 */
export default function TextShape({
  shape,
  isSelected,
  isLocked,
  isSelectable,
  zoom,
  onSelect,
  onTransform,
  shapeRef,
  onRenewLock,
  onEditRequest,
}: TextShapeProps) {
  // Determine fill color based on lock status
  const fillColor = isLocked ? "#ef4444" : shape.fill;

  /**
   * Handle click to select
   */
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelectable) return;
    e.cancelBubble = true;
    onSelect();
  };

  /**
   * Handle double-click to edit
   */
  const handleDblClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelectable || isLocked) return;
    e.cancelBubble = true;
    if (onEditRequest) {
      onEditRequest(shape.id);
    }
  };

  /**
   * Handle drag end to update position
   */
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Text;
    
    // Update position
    onTransform({
      x: node.x(),
      y: node.y(),
    });
    
    // Renew lock
    onRenewLock();
  };

  /**
   * Handle transform (real-time during resize) to update width immediately
   * This makes text reflow in real-time as the bounding box is resized
   */
  const handleTransform = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Text;
    const scaleX = node.scaleX();

    // Calculate new width from scale
    const newWidth = Math.max(50, node.width() * scaleX);

    // Reset scale and apply to width
    node.scaleX(1);
    node.scaleY(1);

    // Update the node's width directly for immediate reflow
    node.width(newWidth);
  };

  /**
   * Handle transform end to save final size/rotation to Firestore
   */
  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Text;

    // Save final dimensions to Firestore
    onTransform({
      x: node.x(),
      y: node.y(),
      width: node.width(), // Already updated by handleTransform
      rotation: node.rotation(),
      // Note: fontSize could be scaled here in the future
      // fontSize: Math.max(8, shape.fontSize * scaleY),
    });

    // Renew lock
    onRenewLock();
  };

  // Determine text decoration style
  const textDecoration = shape.textDecoration !== "none" ? shape.textDecoration : undefined;

  return (
    <Text
      ref={shapeRef}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      text={shape.content}
      fontSize={shape.fontSize}
      fontFamily={shape.fontFamily}
      fontStyle={shape.fontStyle === "italic" ? "italic" : "normal"}
      fontVariant={shape.fontWeight}
      align={shape.textAlign}
      textDecoration={textDecoration}
      lineHeight={shape.lineHeight}
      fill={fillColor}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      rotation={shape.rotation}
      opacity={shape.opacity ?? 1}
      wrap="char" // Enable character-level wrapping (breaks mid-word at boundary)
      draggable={isSelectable}
      listening={isSelectable}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onDragEnd={handleDragEnd}
      onTransform={handleTransform} // Real-time width update during resize
      onTransformEnd={handleTransformEnd}
    />
  );
}

