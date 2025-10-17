/**
 * ActiveTransformOverlay Component
 * Renders semi-transparent overlays for active transforms from remote users
 * Shows real-time visual feedback during drag/resize/rotate operations
 */

import { Rect, Ellipse, Line, Text, Group } from "react-konva";
import type { ActiveTransformWithUser } from "../_types/active-transform";

interface ActiveTransformOverlayProps {
  /** The active transform data with user info */
  activeTransform: ActiveTransformWithUser;
  /** Current viewport zoom level */
  zoom: number;
}

/**
 * Renders a semi-transparent overlay for a remote user's active transform
 * Overlay color matches the user's cursor color
 */
export default function ActiveTransformOverlay({
  activeTransform,
  zoom,
}: ActiveTransformOverlayProps) {
  const { type, displayName, color } = activeTransform;

  // Parse color and create semi-transparent version
  const overlayOpacity = 0.3;
  const labelOpacity = 1;

  // Label positioning constants
  const labelPadding = 8 / zoom; // Scale label padding with zoom
  const labelFontSize = 12 / zoom; // Scale font size with zoom
  const labelOffsetY = -20 / zoom; // Position label above shape

  // Common overlay properties
  const commonProps = {
    listening: false, // Don't interfere with interactions
    shadowEnabled: true,
    shadowColor: color,
    shadowBlur: 10 / zoom,
    shadowOpacity: 0.5,
  };

  // Render rectangle overlay
  if (
    type === "rectangle" &&
    "width" in activeTransform &&
    "height" in activeTransform
  ) {
    const { x, y, width, height, rotation } = activeTransform;

    return (
      <Group>
        {/* Rectangle overlay */}
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          rotation={rotation}
          fill={color}
          opacity={overlayOpacity}
          stroke={color}
          strokeWidth={2 / zoom}
          cornerRadius={activeTransform.cornerRadius || 0}
          {...commonProps}
        />

        {/* User name label */}
        <Text
          x={x}
          y={y + labelOffsetY}
          text={displayName}
          fontSize={labelFontSize}
          fontFamily="Inter, sans-serif"
          fill={color}
          opacity={labelOpacity}
          padding={labelPadding}
          listening={false}
        />
      </Group>
    );
  }

  // Render circle/ellipse overlay
  if (
    type === "circle" &&
    "radiusX" in activeTransform &&
    "radiusY" in activeTransform
  ) {
    const { x, y, radiusX, radiusY } = activeTransform;

    return (
      <Group>
        {/* Circle/Ellipse overlay */}
        <Ellipse
          x={x}
          y={y}
          radiusX={radiusX}
          radiusY={radiusY}
          fill={color}
          opacity={overlayOpacity}
          stroke={color}
          strokeWidth={2 / zoom}
          {...commonProps}
        />

        {/* User name label */}
        <Text
          x={x - radiusX}
          y={y - radiusY + labelOffsetY}
          text={displayName}
          fontSize={labelFontSize}
          fontFamily="Inter, sans-serif"
          fill={color}
          opacity={labelOpacity}
          padding={labelPadding}
          listening={false}
        />
      </Group>
    );
  }

  // Render line overlay
  if (type === "line" && "x2" in activeTransform && "y2" in activeTransform) {
    const { x, y, x2, y2 } = activeTransform;

    return (
      <Group>
        {/* Line overlay */}
        <Line
          points={[x, y, x2, y2]}
          stroke={color}
          strokeWidth={4 / zoom}
          opacity={overlayOpacity}
          shadowEnabled={true}
          shadowColor={color}
          shadowBlur={10 / zoom}
          shadowOpacity={0.5}
          listening={false}
        />

        {/* User name label at midpoint */}
        <Text
          x={(x + x2) / 2}
          y={(y + y2) / 2 + labelOffsetY}
          text={displayName}
          fontSize={labelFontSize}
          fontFamily="Inter, sans-serif"
          fill={color}
          opacity={labelOpacity}
          padding={labelPadding}
          listening={false}
        />
      </Group>
    );
  }

  // Render text overlay
  if (
    type === "text" &&
    "width" in activeTransform &&
    "height" in activeTransform
  ) {
    const { x, y, width, height, rotation } = activeTransform;

    return (
      <Group>
        {/* Text bounding box overlay */}
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          rotation={rotation}
          fill={color}
          opacity={overlayOpacity}
          stroke={color}
          strokeWidth={2 / zoom}
          dash={[5 / zoom, 5 / zoom]} // Dashed border for text boxes
          {...commonProps}
        />

        {/* User name label */}
        <Text
          x={x}
          y={y + labelOffsetY}
          text={displayName}
          fontSize={labelFontSize}
          fontFamily="Inter, sans-serif"
          fill={color}
          opacity={labelOpacity}
          padding={labelPadding}
          listening={false}
        />
      </Group>
    );
  }

  // Fallback - should never happen
  console.warn(`Unknown active transform type: ${type}`);
  return null;
}
