"use client";

import { useEffect, useState } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";

interface StageContainerProps {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
  draggable?: boolean;
  onWheel?: (e: KonvaEventObject<WheelEvent>) => void;
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  stageRef?: React.RefObject<Konva.Stage | null>;
  children?: React.ReactNode;
  canvasWidth?: number;
  canvasHeight?: number;
  showGrid?: boolean;
}

/**
 * Wrapper for Konva Stage with a main drawing layer
 * Includes visual canvas boundaries when canvasWidth/canvasHeight are provided
 * The main drawing layer is clipped to canvas bounds - objects outside the canvas are hidden
 */
export default function StageContainer({
  width,
  height,
  x,
  y,
  scale,
  draggable = false,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDragEnd,
  dragBoundFunc,
  stageRef,
  children,
  canvasWidth,
  canvasHeight,
  showGrid = true,
}: StageContainerProps) {
  // Track actual Stage position for grid sync (updates during drag)
  const [gridPosition, setGridPosition] = useState({ x, y });

  // Sync grid position with Stage's actual position
  useEffect(() => {
    if (!stageRef?.current) return;

    let animationFrameId: number;

    const syncGridPosition = () => {
      const stage = stageRef.current;
      if (stage) {
        const currentX = stage.x();
        const currentY = stage.y();
        setGridPosition({ x: currentX, y: currentY });
      }
      animationFrameId = requestAnimationFrame(syncGridPosition);
    };

    animationFrameId = requestAnimationFrame(syncGridPosition);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stageRef]);

  return (
    <>
      {/* Grid background - CSS-based for performance */}
      {showGrid && canvasWidth && canvasHeight && (
        <div
          style={{
            position: "absolute",
            left: gridPosition.x,
            top: gridPosition.y,
            width: canvasWidth * scale,
            height: canvasHeight * scale,
            backgroundColor: "#ffffff",
            backgroundImage:
              "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: "0px 0px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={x}
        y={y}
        scaleX={scale}
        scaleY={scale}
        draggable={draggable}
        dragBoundFunc={dragBoundFunc}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDragEnd={onDragEnd}
      >
        {/* Background layer - shows canvas boundaries */}
        {canvasWidth && canvasHeight && (
          <Layer listening={false}>
            {/* Canvas background with shadow (white bg handled by CSS grid) */}
            {!showGrid && (
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="#ffffff"
                shadowColor="rgba(0, 0, 0, 0.2)"
                shadowBlur={30 / scale}
                shadowOffset={{ x: 0, y: 0 }}
                shadowOpacity={0.8}
              />
            )}

            {/* Shadow rect when grid is visible */}
            {showGrid && (
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="transparent"
                shadowColor="rgba(0, 0, 0, 0.2)"
                shadowBlur={30 / scale}
                shadowOffset={{ x: 0, y: 0 }}
                shadowOpacity={0.8}
              />
            )}

            {/* Canvas border - prominent dark border */}
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              stroke="#374151"
              strokeWidth={3 / scale}
              listening={false}
            />

            {/* Dimension label - top left corner with background */}
            <Rect
              x={10}
              y={10}
              width={120 / scale}
              height={30 / scale}
              fill="#374151"
              cornerRadius={4 / scale}
              opacity={0.9}
              listening={false}
            />
            <Text
              x={20}
              y={18}
              text={`${canvasWidth} × ${canvasHeight}`}
              fontSize={14 / scale}
              fontFamily="Inter, system-ui, sans-serif"
              fill="#ffffff"
              listening={false}
            />
          </Layer>
        )}

        {/* Main drawing layer for shapes - clipped to canvas bounds */}
        <Layer
          clipFunc={(ctx) => {
            if (canvasWidth && canvasHeight) {
              // Clip to canvas boundaries
              ctx.rect(0, 0, canvasWidth, canvasHeight);
            }
          }}
        >
          {children}
        </Layer>
      </Stage>
    </>
  );
}
