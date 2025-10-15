"use client";

import { PersistedShape } from "../_types/shapes";
import { Separator } from "@/components/ui/separator";
import UniversalProperties from "./properties/UniversalProperties";
import StyleProperties from "./properties/StyleProperties";
import { getPropertyComponent } from "./properties/shape-properties";
import { isLockedByOtherUser } from "../_lib/locks";
import { LOCK_TIMEOUT_MS } from "@/lib/constants/locks";
import { CanvasTool } from "@/types/canvas";
import { isShapeTool } from "../_constants/tools";
import { DefaultShapeProperties } from "../_store/canvas-store";

interface PropertiesPanelProps {
  selectedIds: string[];
  objects: PersistedShape[];
  onUpdate: (objectId: string, updates: Partial<PersistedShape>) => void;
  currentUserId: string | null;
  activeTool: CanvasTool;
  defaultShapeProperties: DefaultShapeProperties;
  onUpdateDefaults: (
    shapeType: "rectangle" | "circle" | "line" | "text",
    updates: any
  ) => void;
}

export default function PropertiesPanel({
  selectedIds,
  objects,
  onUpdate,
  currentUserId,
  activeTool,
  defaultShapeProperties,
  onUpdateDefaults,
}: PropertiesPanelProps) {
  // Get selected objects
  const selectedObjects = objects.filter((obj) =>
    selectedIds.includes(obj.id)
  );

  // Check if we're in drawing mode (shape tool active)
  const hasSelection = selectedIds.length > 0;

  // Show default properties when shape tool is active and nothing selected
  if (isShapeTool(activeTool) && !hasSelection) {
    const shapeType = activeTool; // TypeScript knows this is "rectangle" | "circle" | "line" now
    const ShapePropertiesComponent = getPropertyComponent(shapeType);

    // Create a mock shape object with default properties for UI display
    const mockShape: any = 
      shapeType === "rectangle"
        ? {
            type: "rectangle",
            fill: defaultShapeProperties.rectangle.fill,
            stroke: defaultShapeProperties.rectangle.stroke,
            strokeWidth: defaultShapeProperties.rectangle.strokeWidth,
            opacity: defaultShapeProperties.rectangle.opacity,
            cornerRadius: defaultShapeProperties.rectangle.cornerRadius,
            width: 100, // Default width for max calculation
            height: 100, // Default height for max calculation
          }
        : shapeType === "circle"
        ? {
            type: "circle",
            fill: defaultShapeProperties.circle.fill,
            stroke: defaultShapeProperties.circle.stroke,
            strokeWidth: defaultShapeProperties.circle.strokeWidth,
            opacity: defaultShapeProperties.circle.opacity,
            radiusX: 50, // Default radius for display
            radiusY: 50, // Default radius for display
          }
        : shapeType === "line"
        ? {
            type: "line",
            stroke: defaultShapeProperties.line?.stroke ?? "#a855f7",
            strokeWidth: defaultShapeProperties.line?.strokeWidth ?? 2,
            opacity: defaultShapeProperties.line?.opacity ?? 1,
            x: 0,
            y: 0,
            x2: 100,
            y2: 100,
          }
        : {
            type: "text",
            x: 0,
            y: 0,
            width: 100,
            height: 30,
            content: "Text", // Always default to "Text", don't save content as a default
            fontSize: defaultShapeProperties.text?.fontSize ?? 16,
            fontFamily: defaultShapeProperties.text?.fontFamily ?? "Arial",
            fontWeight: defaultShapeProperties.text?.fontWeight ?? "normal",
            fontStyle: defaultShapeProperties.text?.fontStyle ?? "normal",
            textAlign: defaultShapeProperties.text?.textAlign ?? "left",
            textDecoration: defaultShapeProperties.text?.textDecoration ?? "none",
            lineHeight: defaultShapeProperties.text?.lineHeight ?? 1.2,
            fill: defaultShapeProperties.text?.fill ?? "#000000",
            stroke: defaultShapeProperties.text?.stroke ?? "#000000",
            strokeWidth: defaultShapeProperties.text?.strokeWidth ?? 0,
            opacity: defaultShapeProperties.text?.opacity ?? 1,
          };

    return (
      <div className="absolute top-4 right-4 w-[280px] bg-white rounded-lg border shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-sm">Default Properties</h3>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {shapeType} • New shapes will use these
          </p>
        </div>

        {/* Scrollable content */}
        <div className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto space-y-4">
          {/* Style Properties only (no position/size for defaults) */}
          <StyleProperties
            object={mockShape}
            onUpdate={(updates) => onUpdateDefaults(shapeType, updates)}
            disabled={false}
          />

          {/* Shape-specific properties */}
          {ShapePropertiesComponent && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  {shapeType}
                </h4>
                <ShapePropertiesComponent
                  shape={mockShape}
                  onUpdate={(updates: any) => onUpdateDefaults(shapeType, updates)}
                  disabled={false}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // No selection and not in drawing mode
  if (!hasSelection) {
    return (
      <div className="absolute top-4 right-4 w-[280px] bg-white rounded-lg border shadow-lg p-4">
        <h3 className="font-semibold text-sm mb-2">Properties</h3>
        <p className="text-sm text-gray-500">
          Select a shape to edit its properties
        </p>
      </div>
    );
  }

  // Multi-selection state
  if (selectedIds.length > 1) {
    return (
      <div className="absolute top-4 right-4 w-[280px] bg-white rounded-lg border shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-sm">Properties</h3>
          <p className="text-xs text-gray-500 mt-1">
            {selectedIds.length} objects selected
          </p>
        </div>
        <div className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-sm text-gray-500 mb-4">
            Multi-select editing coming soon. Currently showing properties for
            single selection only.
          </p>
        </div>
      </div>
    );
  }

  // Single selection
  const selectedObject = selectedObjects[0];
  if (!selectedObject) return null;

  // Check if locked by another user (not the current user)
  const lockedByOther = isLockedByOtherUser(
    selectedObject.lockedBy,
    selectedObject.lockedAt,
    selectedObject.lockTimeout || LOCK_TIMEOUT_MS,
    currentUserId
  );

  // Get shape-specific component
  const ShapePropertiesComponent = getPropertyComponent(selectedObject.type);

  return (
    <div className="absolute top-4 right-4 w-[280px] bg-white rounded-lg border shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">Properties</h3>
        <p className="text-xs text-gray-500 mt-1 capitalize">
          {selectedObject.type}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto space-y-4">
        {/* Locked banner */}
        {lockedByOther && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
            <p className="font-semibold">Locked by another user</p>
            <p className="text-red-600">Properties are read-only</p>
          </div>
        )}

        {/* Universal Properties */}
        <UniversalProperties
          object={selectedObject}
          allObjects={objects}
          onUpdate={(updates) => onUpdate(selectedObject.id, updates)}
          disabled={lockedByOther}
        />

        <Separator />

        {/* Style Properties */}
        <StyleProperties
          object={selectedObject}
          onUpdate={(updates) => onUpdate(selectedObject.id, updates)}
          disabled={lockedByOther}
        />

        {/* Shape-specific properties */}
        {ShapePropertiesComponent && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                {selectedObject.type}
              </h4>
              <ShapePropertiesComponent
                shape={selectedObject}
                onUpdate={(updates: Partial<PersistedShape>) =>
                  onUpdate(selectedObject.id, updates)
                }
                disabled={lockedByOther}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

