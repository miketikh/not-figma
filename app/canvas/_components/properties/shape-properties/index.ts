/**
 * Shape-specific property component registry
 * Maps shape types to their corresponding property components
 */

import { ComponentType } from "react";
import RectangleProperties from "./RectangleProperties";
import CircleProperties from "./CircleProperties";
import LineProperties from "./LineProperties";
import TextProperties from "./TextProperties";
import ImageProperties from "./ImageProperties";

/**
 * Registry mapping shape types to their property components
 */
export const shapePropertyComponents: Record<string, ComponentType<any>> = {
  rectangle: RectangleProperties,
  circle: CircleProperties,
  line: LineProperties,
  text: TextProperties,
  image: ImageProperties,
};

/**
 * Get the property component for a given shape type
 * Returns undefined if no component is registered for the type
 */
export function getPropertyComponent(
  type: string
): ComponentType<any> | undefined {
  return shapePropertyComponents[type];
}
