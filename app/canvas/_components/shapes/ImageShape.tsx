"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import type { PersistedImage } from "../../_types/shapes";
import LockedByBadge from "../LockedByBadge";
import { loadImageFromURL } from "../../_lib/image-utils";
import { createRectangleDragBound } from "../../_lib/drag-bounds";

/**
 * Props for ImageShape component
 */
export interface ImageShapeProps {
  /** The image shape data */
  shape: PersistedImage;

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
  onTransform: (updates: Partial<PersistedImage>) => void;

  /** Callback for real-time transform broadcasting during drag/resize/rotate */
  onTransformMove?: (updates: Partial<PersistedImage>) => void;

  /** Ref callback for transformer attachment */
  shapeRef: (node: Konva.Image | null) => void;

  /** Callback to renew lock during interaction */
  onRenewLock: () => void;

  /** Canvas width for drag bounds constraints */
  canvasWidth: number;

  /** Canvas height for drag bounds constraints */
  canvasHeight: number;
}

/**
 * ImageShape Component
 * Renders an image using Konva with full interaction support
 * Handles loading states, errors, and aspect ratio locking
 */
export default function ImageShape({
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
}: ImageShapeProps) {
  // Image loading state
  const [htmlImage, setHtmlImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  /**
   * Load image from URL
   */
  useEffect(() => {
    let mounted = true;

    setIsLoading(true);
    setHasError(false);

    loadImageFromURL(shape.imageUrl)
      .then((img) => {
        if (mounted) {
          setHtmlImage(img);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load image:", error);
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [shape.imageUrl]);

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
    const node = e.target;

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
    const node = e.target;

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

    const node = e.target as Konva.Image;
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
    const node = e.target as Konva.Image;
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

  /**
   * Retry loading the image
   */
  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setHasError(false);

    loadImageFromURL(shape.imageUrl)
      .then((img) => {
        setHtmlImage(img);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Retry failed to load image:", error);
        setHasError(true);
        setIsLoading(false);
      });
  }, [shape.imageUrl]);

  // Memoize drag bound function to ensure stable reference
  const dragBoundFunc = useMemo(
    () => createRectangleDragBound(shape.width, shape.height, canvasWidth, canvasHeight),
    [shape.width, shape.height, canvasWidth, canvasHeight]
  );

  return (
    <Group>
      {/* Loading state - light background with dashed border and loading text */}
      {isLoading && (
        <>
          {/* Background fill */}
          <Rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="#f8fafc"
            rotation={shape.rotation}
            opacity={0.9}
          />
          {/* Dashed border */}
          <Rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke="#94a3b8"
            strokeWidth={2 / zoom}
            dash={[10 / zoom, 5 / zoom]}
            rotation={shape.rotation}
          />
          {/* Loading text with image icon placeholder */}
          <Text
            x={shape.x}
            y={shape.y + shape.height / 2 - 15}
            width={shape.width}
            height={30}
            text="🖼️"
            fontSize={32}
            align="center"
            verticalAlign="middle"
            rotation={shape.rotation}
            opacity={0.3}
          />
          <Text
            x={shape.x}
            y={shape.y + shape.height / 2 + 15}
            width={shape.width}
            height={20}
            text="Loading image..."
            fontSize={13}
            fontFamily="Arial"
            fill="#64748b"
            align="center"
            verticalAlign="middle"
            rotation={shape.rotation}
          />
        </>
      )}

      {/* Error state - light red background with error icon and retry prompt */}
      {hasError && (
        <>
          {/* Background fill */}
          <Rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="#fef2f2"
            rotation={shape.rotation}
            opacity={0.9}
            onClick={handleRetry}
            onTap={handleRetry}
          />
          {/* Border */}
          <Rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke="#ef4444"
            strokeWidth={2 / zoom}
            rotation={shape.rotation}
            onClick={handleRetry}
            onTap={handleRetry}
          />
          {/* Error icon */}
          <Text
            x={shape.x}
            y={shape.y + shape.height / 2 - 20}
            width={shape.width}
            height={30}
            text="⚠️"
            fontSize={28}
            align="center"
            verticalAlign="middle"
            rotation={shape.rotation}
            onClick={handleRetry}
            onTap={handleRetry}
          />
          {/* Error message */}
          <Text
            x={shape.x}
            y={shape.y + shape.height / 2 + 10}
            width={shape.width}
            height={50}
            text="Failed to load image\nClick to retry or delete"
            fontSize={12}
            fontFamily="Arial"
            fill="#ef4444"
            align="center"
            verticalAlign="middle"
            rotation={shape.rotation}
            onClick={handleRetry}
            onTap={handleRetry}
          />
        </>
      )}

      {/* Loaded state - render actual image */}
      {!isLoading && !hasError && htmlImage && (
        <KonvaImage
          ref={shapeRef}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          image={htmlImage}
          rotation={shape.rotation}
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
      )}

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
