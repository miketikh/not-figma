import { Rect } from "react-konva";
import type { SelectionRect } from "../_types/interactions";

interface SelectionRectRendererProps {
  selectionRect: SelectionRect;
  zoom: number;
}

/**
 * Renders the selection rectangle preview during drag-to-select
 * Shows a blue dashed rectangle indicating the selection area
 */
export default function SelectionRectRenderer({
  selectionRect,
  zoom,
}: SelectionRectRendererProps) {
  return (
    <Rect
      x={selectionRect.x}
      y={selectionRect.y}
      width={selectionRect.width}
      height={selectionRect.height}
      stroke="#3b82f6"
      strokeWidth={1 / zoom}
      dash={[4 / zoom, 4 / zoom]}
      fill="rgba(59, 130, 246, 0.1)"
      listening={false}
    />
  );
}
