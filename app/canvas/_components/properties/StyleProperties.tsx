"use client";

import { useState } from "react";
import { PersistedShape } from "../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HexColorPicker } from "react-colorful";

interface StylePropertiesProps {
  object: PersistedShape;
  onUpdate: (updates: Partial<PersistedShape>) => void;
  disabled?: boolean;
}

export default function StyleProperties({
  object,
  onUpdate,
  disabled = false,
}: StylePropertiesProps) {
  const [showFillPicker, setShowFillPicker] = useState(false);
  const [showStrokePicker, setShowStrokePicker] = useState(false);

  // Parse fill color to hex (handle rgba format)
  const getFillColor = () => {
    const fill = object.fill;
    if (fill.startsWith("#")) return fill;
    if (fill === "transparent") return "#000000";
    // Try to extract hex from rgba
    if (fill.startsWith("rgba")) {
      // Default to a color if we can't parse
      return "#3b82f6";
    }
    return fill;
  };

  // Parse stroke color to hex
  const getStrokeColor = () => {
    const stroke = object.stroke;
    if (stroke.startsWith("#")) return stroke;
    return stroke;
  };

  const handleFillColorChange = (color: string) => {
    // Check if "No Fill" is enabled
    const noFillCheckbox = document.getElementById(
      "no-fill"
    ) as HTMLInputElement;
    if (noFillCheckbox?.checked) {
      onUpdate({ fill: color }); // Update color but keep it transparent for now
    } else {
      onUpdate({ fill: color });
    }
  };

  const handleNoFillChange = (checked: boolean) => {
    if (checked) {
      onUpdate({ fill: "transparent" });
    } else {
      // Restore to a default color - use blue as fallback if currently transparent
      const currentColor = getFillColor();
      const restoredColor = object.fill === "transparent" ? "#3b82f6" : currentColor;
      onUpdate({ fill: restoredColor });
    }
  };

  const isTransparent = object.fill === "transparent";

  return (
    <div className="space-y-4">
      {/* Fill Section */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Fill
        </Label>
        
        <div className="space-y-2">
          {/* Color preview/button */}
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              if (isTransparent) {
                // If transparent, restore a default color
                handleNoFillChange(false);
              } else {
                setShowFillPicker(!showFillPicker);
              }
            }}
            disabled={disabled}
            className="w-full h-8 rounded border border-gray-300 flex items-center px-2 gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              className="w-5 h-5 rounded border border-gray-300"
              style={{
                backgroundColor: isTransparent ? "transparent" : object.fill,
                backgroundImage: isTransparent
                  ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                  : "none",
                backgroundSize: "10px 10px",
                backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
              }}
            />
            <span className="text-sm flex-1 text-left">
              {isTransparent ? "No Fill (click to restore)" : getFillColor().toUpperCase()}
            </span>
          </button>

          {/* Color picker popover */}
          {showFillPicker && !isTransparent && (
            <div className="relative">
              <div className="absolute top-0 left-0 z-10 bg-white p-2 rounded-lg shadow-lg border">
                <HexColorPicker
                  color={getFillColor()}
                  onChange={handleFillColorChange}
                />
                <button
                  type="button"
                  onClick={() => setShowFillPicker(false)}
                  className="mt-2 w-full text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* No Fill checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="no-fill"
              checked={isTransparent}
              onChange={(e) => handleNoFillChange(e.target.checked)}
              disabled={disabled}
              className="rounded"
            />
            <Label htmlFor="no-fill" className="text-sm cursor-pointer">
              No Fill
            </Label>
          </div>
        </div>
      </div>

      {/* Stroke Section */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Stroke
        </Label>
        
        <div className="space-y-2">
          {/* Color preview/button */}
          <button
            type="button"
            onClick={() => !disabled && setShowStrokePicker(!showStrokePicker)}
            disabled={disabled}
            className="w-full h-8 rounded border border-gray-300 flex items-center px-2 gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              className="w-5 h-5 rounded border border-gray-300"
              style={{ backgroundColor: object.stroke }}
            />
            <span className="text-sm flex-1 text-left">
              {getStrokeColor().toUpperCase()}
            </span>
          </button>

          {/* Color picker popover */}
          {showStrokePicker && (
            <div className="relative">
              <div className="absolute top-0 left-0 z-10 bg-white p-2 rounded-lg shadow-lg border">
                <HexColorPicker
                  color={getStrokeColor()}
                  onChange={(color) => onUpdate({ stroke: color })}
                />
                <button
                  type="button"
                  onClick={() => setShowStrokePicker(false)}
                  className="mt-2 w-full text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Stroke width */}
          <div>
            <Label htmlFor="stroke-width" className="text-xs text-gray-500">
              Width
            </Label>
            <Input
              id="stroke-width"
              type="number"
              min="0"
              value={object.strokeWidth || 0}
              onChange={(e) =>
                onUpdate({ strokeWidth: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Opacity Section */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Opacity
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((object.opacity ?? 1) * 100)}
            onChange={(e) =>
              onUpdate({ opacity: parseFloat(e.target.value) / 100 })
            }
            disabled={disabled}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12 text-right">
            {Math.round((object.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

