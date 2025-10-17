import { Rect, Circle, Ellipse, Line } from "react-konva";
import type { DraftRect } from "../_types/interactions";
import type { CanvasTool } from "@/types/canvas";
import { getShapeFactory } from "../_lib/shapes";
import { isShapeTool } from "../_constants/tools";

interface DraftShapeRendererProps {
  draftRect: DraftRect;
  activeTool: CanvasTool;
  defaultShapeProperties: Record<string, any>;
  zoom: number;
}

/**
 * Renders the draft shape preview while drawing
 * Shows a preview of the shape being drawn before it's committed
 */
export default function DraftShapeRenderer({
  draftRect,
  activeTool,
  defaultShapeProperties,
  zoom,
}: DraftShapeRendererProps) {
  const factory = getShapeFactory(activeTool);
  if (!factory) return null;

  // Get the user's custom defaults for styling the preview
  const styleDefaults = isShapeTool(activeTool)
    ? defaultShapeProperties[activeTool]
    : undefined;

  const draftData = factory.getDraftData(draftRect, styleDefaults);

  // Calculate strokeWidth (text doesn't have strokeWidth)
  const hasStrokeWidth = styleDefaults && "strokeWidth" in styleDefaults;
  const strokeWidth = hasStrokeWidth ? styleDefaults.strokeWidth : 2;

  const commonProps = {
    strokeWidth: strokeWidth / zoom,
    listening: false,
  };

  if (draftData.type === "rect") {
    return <Rect {...draftData.props} {...commonProps} />;
  } else if (draftData.type === "circle") {
    return <Circle {...draftData.props} {...commonProps} />;
  } else if (draftData.type === "ellipse") {
    return <Ellipse {...draftData.props} {...commonProps} />;
  } else if (draftData.type === "line") {
    return <Line {...draftData.props} {...commonProps} />;
  }

  return null;
}
