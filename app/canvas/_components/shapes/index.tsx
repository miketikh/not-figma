/**
 * Shape Component Router
 * Delegates rendering to the appropriate shape component based on object type
 */

import type {
  PersistedRect,
  PersistedCircle,
  PersistedLine,
  PersistedText,
} from "../../_types/shapes";
import RectangleShape from "./RectangleShape";
import CircleShape from "./CircleShape";
import LineShape from "./LineShape";
import TextShape from "./TextShape";
import type Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";

/**
 * Base shape interface that all local shapes must have
 */
interface BaseShape {
  id: string;
  type: string;
  [key: string]: any;
}

/**
 * Common props for all shape components
 */
export interface ShapeComponentProps {
  /** The shape object to render (local representation) */
  object: BaseShape;

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
  onTransform: (updates: any) => void;

  /** Callback for real-time transform broadcasting during drag/resize/rotate */
  onTransformMove?: (updates: any) => void;

  /** Ref callback for transformer attachment */
  shapeRef: (node: any) => void;

  /** Callback to renew lock during interaction */
  onRenewLock: () => void;

  /** Optional callback for text editing (double-click) */
  onEditRequest?: (textId: string) => void;
}

/**
 * ShapeComponent Router
 * Renders the appropriate shape component based on the object's type
 */
export default function ShapeComponent(props: ShapeComponentProps) {
  const {
    object,
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
          lockingUserColor={lockingUserColor}
          lockingUserName={lockingUserName}
          onSelect={onSelect}
          onTransform={onTransform}
          onTransformMove={onTransformMove}
          shapeRef={shapeRef as (node: Konva.Rect | null) => void}
          onRenewLock={onRenewLock}
        />
      );

    case "circle":
      return (
        <CircleShape
          shape={object as PersistedCircle}
          isSelected={isSelected}
          isLocked={isLocked}
          isSelectable={isSelectable}
          zoom={zoom}
          lockingUserColor={lockingUserColor}
          lockingUserName={lockingUserName}
          onSelect={onSelect}
          onTransform={onTransform}
          onTransformMove={onTransformMove}
          shapeRef={shapeRef as (node: Konva.Ellipse | null) => void}
          onRenewLock={onRenewLock}
        />
      );

    case "line":
      return (
        <LineShape
          shape={object as PersistedLine}
          isSelected={isSelected}
          isLocked={isLocked}
          isSelectable={isSelectable}
          zoom={zoom}
          lockingUserColor={lockingUserColor}
          lockingUserName={lockingUserName}
          onSelect={onSelect}
          onTransform={onTransform}
          onTransformMove={onTransformMove}
          shapeRef={shapeRef as (node: Konva.Line | null) => void}
          onRenewLock={onRenewLock}
        />
      );

    case "text":
      return (
        <TextShape
          shape={object as PersistedText}
          isSelected={isSelected}
          isLocked={isLocked}
          isSelectable={isSelectable}
          zoom={zoom}
          lockingUserColor={lockingUserColor}
          lockingUserName={lockingUserName}
          onSelect={onSelect}
          onTransform={onTransform}
          onTransformMove={onTransformMove}
          shapeRef={shapeRef as (node: Konva.Text | null) => void}
          onRenewLock={onRenewLock}
          onEditRequest={onEditRequest}
        />
      );

    default:
      // Unknown shape type - should never happen if factories are properly registered
      console.error(`No component found for shape type: ${object.type}`);
      return null;
  }
}
