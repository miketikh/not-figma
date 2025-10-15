"use client";

import { Group, Text } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedText } from "../../_types/shapes";
import LockedByBadge from "../LockedByBadge";

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

  /** Color of the user who locked this object (if locked) */
  lockingUserColor?: string;

  /** Display name of the user who locked this object (if locked) */
  lockingUserName?: string;

  /** Callback when shape is selected */
  onSelect: (e: KonvaEventObject<MouseEvent>) => void;

  /** Callback when shape is transformed (drag/resize/rotate) */
  onTransform: (updates: Partial<PersistedText>) => void;

  /** Callback for real-time transform broadcasting during drag/resize/rotate */
  onTransformMove?: (updates: Partial<PersistedText>) => void;

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
  lockingUserColor,
  lockingUserName,
  onSelect,
  onTransform,
  onTransformMove,
  shapeRef,
  onRenewLock,
  onEditRequest,
}: TextShapeProps) {
  // Determine fill color based on lock status
  // Use locking user's color if available, otherwise fallback to red
  const fillColor = isLocked
    ? (lockingUserColor || "#ef4444")
    : shape.fill;

  /**
   * Handle click to select
   */
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelectable) return;
    e.cancelBubble = true;
    onSelect(e);
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
   * Handle drag move to broadcast position in real-time
   */
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (!onTransformMove) return;

    const node = e.target as Konva.Text;

    // Broadcast position update in real-time
    onTransformMove({
      x: node.x(),
      y: node.y(),
    });
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
   * Also broadcasts the transform for real-time collaboration
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

    // Broadcast transform update in real-time
    if (onTransformMove) {
      onTransformMove({
        x: node.x(),
        y: node.y(),
        width: newWidth,
        rotation: node.rotation(),
      });
    }
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
    <Group>
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
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransform={handleTransform} // Real-time width update during resize + broadcast
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

