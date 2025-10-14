/**
 * Canvas object creation and manipulation helpers
 */

import * as fabric from "fabric";
import { RectangleObject } from "@/types/canvas";

/**
 * Generate a unique ID for canvas objects
 */
export function generateObjectId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a rectangle object (Fabric.js)
 */
export function createFabricRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  options?: Partial<fabric.Rect>
): fabric.Rect {
  return new fabric.Rect({
    left: x,
    top: y,
    width,
    height,
    fill: "#3b82f6", // Blue
    stroke: "#1e40af", // Darker blue
    strokeWidth: 2,
    cornerColor: "#3b82f6",
    cornerSize: 8,
    transparentCorners: false,
    ...options,
  });
}

/**
 * Convert Fabric rectangle to our data model
 */
export function fabricRectToCanvasObject(
  rect: fabric.Rect,
  userId: string
): RectangleObject {
  const now = Date.now();
  
  return {
    id: rect.data?.id || generateObjectId(),
    type: "rectangle",
    
    // Ownership & Sync
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
    
    // Locking
    lockedBy: null,
    lockedAt: null,
    lockTimeout: 30000,
    
    // Transform
    x: rect.left || 0,
    y: rect.top || 0,
    width: rect.width || 100,
    height: rect.height || 100,
    rotation: rect.angle || 0,
    
    // Styling
    fill: (rect.fill as string) || "#3b82f6",
    fillOpacity: rect.opacity || 1,
    stroke: (rect.stroke as string) || "#1e40af",
    strokeWidth: rect.strokeWidth || 2,
    strokeOpacity: 1,
    strokeStyle: "solid",
    
    // Layer
    zIndex: 0, // Will be set properly when saved
    
    // Interaction
    locked: false,
    visible: true,
    
    // Optional
    cornerRadius: 0,
  };
}

/**
 * Convert our data model to Fabric rectangle
 */
export function canvasObjectToFabricRect(obj: RectangleObject): fabric.Rect {
  const rect = new fabric.Rect({
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    angle: obj.rotation,
    fill: obj.fill,
    opacity: obj.fillOpacity,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    cornerColor: "#3b82f6",
    cornerSize: 8,
    transparentCorners: false,
    selectable: !obj.locked,
    evented: !obj.locked,
    visible: obj.visible,
  });
  
  // Store ID in data for reference
  rect.data = { id: obj.id };
  
  return rect;
}

/**
 * Default rectangle dimensions
 */
export const DEFAULT_RECT_WIDTH = 100;
export const DEFAULT_RECT_HEIGHT = 100;




