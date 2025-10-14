/**
 * Shape Component Router
 * Delegates rendering to the appropriate shape component based on object type
 */

import { CanvasObject } from "@/types/canvas";
import { PersistedRect } from "../../_lib/shapes";
import RectangleShape from "./RectangleShape";
import Konva from "konva";

/**
 * Common props for all shape components
 */
export interface ShapeComponentProps {
  /** The canvas object to render */
  object: CanvasObject;
  
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
  onTransform: (updates: any) => void;
  
  /** Ref callback for transformer attachment */
  shapeRef: (node: any) => void;
  
  /** Callback to renew lock during interaction */
  onRenewLock: () => void;
}

/**
 * ShapeComponent Router
 * Renders the appropriate shape component based on the object's type
 */
export default function ShapeComponent(props: ShapeComponentProps): JSX.Element | null {
  const {
    object,
    isSelected,
    isLocked,
    isSelectable,
    zoom,
    onSelect,
    onTransform,
    shapeRef,
    onRenewLock,
  } = props;

  // Route to the appropriate shape component based on type
  switch (object.type) {
    case "rectangle":
      return (
        <RectangleShape
          shape={object as PersistedRect}
          isSelected={isSelected}
          isLocked={isLocked}
          isSelectable={isSelectable}
          zoom={zoom}
          onSelect={onSelect}
          onTransform={onTransform}
          shapeRef={shapeRef as (node: Konva.Rect | null) => void}
          onRenewLock={onRenewLock}
        />
      );

    case "circle":
    case "line":
    case "text":
      // Not yet implemented - will be added in future PRs
      console.warn(`Shape type "${object.type}" not yet implemented`);
      return null;

    default:
      // Unknown shape type
      console.error(`Unknown shape type: ${(object as any).type}`);
      return null;
  }
}
