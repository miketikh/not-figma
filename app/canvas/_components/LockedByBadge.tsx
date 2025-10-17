/**
 * LockedByBadge Component
 * Displays a small avatar badge showing who is editing a locked object
 * Renders at the top-right corner of the object's bounding box
 * Shows tooltip on hover
 */

import { useState } from "react";
import {
  Group,
  Circle,
  Text,
  Label,
  Tag,
  Text as LabelText,
} from "react-konva";

interface LockedByBadgeProps {
  /** X position of the badge (top-right corner of bounding box) */
  x: number;
  /** Y position of the badge (top-right corner of bounding box) */
  y: number;
  /** Display name of the user who locked the object */
  displayName: string;
  /** Color of the user who locked the object */
  color: string;
  /** Viewport zoom level (for counter-scaling) */
  zoom: number;
}

export default function LockedByBadge({
  x,
  y,
  displayName,
  color,
  zoom,
}: LockedByBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Counter-scale so badge stays same size regardless of zoom
  const scale = 1 / zoom;

  // Get first letter of display name for avatar
  const initial = (displayName || "?")[0].toUpperCase();

  // Badge size
  const badgeSize = 24;
  const fontSize = 12;

  return (
    <Group x={x} y={y} scale={{ x: scale, y: scale }}>
      {/* Avatar circle background */}
      <Circle
        x={0}
        y={0}
        radius={badgeSize / 2}
        fill={color}
        stroke="white"
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffsetY={2}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Initial text */}
      <Text
        x={-badgeSize / 4} // Center the text horizontally
        y={-fontSize / 2} // Center the text vertically
        text={initial}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fontStyle="600"
        fill="white"
        align="center"
        listening={false}
      />

      {/* Tooltip on hover */}
      {isHovered && (
        <Label x={20} y={-10}>
          <Tag fill="rgba(0,0,0,0.8)" cornerRadius={4} />
          <LabelText
            text={`Editing: ${displayName}`}
            fontSize={12}
            fontFamily="Arial, sans-serif"
            fill="white"
            padding={6}
          />
        </Label>
      )}
    </Group>
  );
}
