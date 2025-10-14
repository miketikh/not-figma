"use client";

import { Stage, Layer } from "react-konva";
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
  stageRef?: React.RefObject<Konva.Stage | null>;
  children?: React.ReactNode;
}

/**
 * Wrapper for Konva Stage with a main drawing layer
 * Keeps Stage background transparent - grid is rendered via CSS on parent container
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
  stageRef,
  children,
}: StageContainerProps) {
  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={x}
      y={y}
      scaleX={scale}
      scaleY={scale}
      draggable={draggable}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onDragEnd={onDragEnd}
    >
      {/* Main drawing layer for shapes */}
      <Layer>{children}</Layer>
    </Stage>
  );
}

