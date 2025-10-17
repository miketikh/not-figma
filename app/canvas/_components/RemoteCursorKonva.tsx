/**
 * Remote cursor component for displaying other users' cursors
 * Konva version - renders inside the canvas Stage
 */

import { Group, Path, Text, Rect } from "react-konva";

interface RemoteCursorKonvaProps {
  x: number;
  y: number;
  displayName: string;
  color: string;
  zoom: number; // For counter-scaling to keep cursor constant size
}

export default function RemoteCursorKonva({
  x,
  y,
  displayName,
  color,
  zoom,
}: RemoteCursorKonvaProps) {
  // Counter-scale so cursor stays same size regardless of zoom
  const scale = 1 / zoom;

  return (
    <Group
      x={x}
      y={y}
      scale={{ x: scale, y: scale }}
      listening={false} // Don't intercept mouse events
    >
      {/* Cursor arrow path */}
      <Path
        data="M 5.5 3.5 L 19.5 12.5 L 12.5 14.5 L 9.5 20.5 L 5.5 3.5 Z"
        fill={color}
        stroke="white"
        strokeWidth={1.5}
        lineJoin="round"
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={4}
        shadowOffsetY={2}
      />

      {/* Name label background */}
      <Rect
        x={20}
        y={20}
        width={displayName.length * 7 + 12} // Approximate width based on text length
        height={22}
        fill={color}
        cornerRadius={4}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffsetY={2}
      />

      {/* Name label text */}
      <Text
        x={26}
        y={24}
        text={displayName}
        fontSize={12}
        fontFamily="Arial, sans-serif"
        fontStyle="500"
        fill="white"
      />
    </Group>
  );
}
