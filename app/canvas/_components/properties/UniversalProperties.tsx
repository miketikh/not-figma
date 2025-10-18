"use client";

import { PersistedShape } from "../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayerOperation,
  calculateNewZIndex,
} from "../../_lib/layer-management";
import { useNumericInput } from "../../_hooks/useNumericInput";

interface UniversalPropertiesProps {
  object: PersistedShape;
  allObjects: PersistedShape[];
  onUpdate: (updates: Partial<PersistedShape>) => void;
  disabled?: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export default function UniversalProperties({
  object,
  allObjects,
  onUpdate,
  disabled = false,
  canvasWidth,
  canvasHeight,
}: UniversalPropertiesProps) {
  const handleLayerOperation = (operation: LayerOperation) => {
    const newZIndex = calculateNewZIndex(
      object.zIndex || 0,
      operation,
      allObjects
    );
    onUpdate({ zIndex: newZIndex });
  };

  // Check if this is a line (lines don't have width/height/rotation)
  const isLine = object.type === "line";

  // Get width/height for display (handle circle/ellipse differently)
  const getWidth = () => {
    if (object.type === "circle") {
      const width = Math.round((object.radiusX || 0) * 2);
      return isNaN(width) ? 0 : width;
    }
    if (object.type === "line") {
      return 0; // Lines don't have width
    }
    const width = Math.round(object.width || 0);
    return isNaN(width) ? 0 : width;
  };

  const getHeight = () => {
    if (object.type === "circle") {
      const height = Math.round((object.radiusY || 0) * 2);
      return isNaN(height) ? 0 : height;
    }
    if (object.type === "line") {
      return 0; // Lines don't have height
    }
    const height = Math.round(object.height || 0);
    return isNaN(height) ? 0 : height;
  };

  const handleWidthChange = (value: number) => {
    // Safety check: don't update with NaN
    if (isNaN(value)) return;

    if (object.type === "circle") {
      onUpdate({ radiusX: value / 2 });
    } else if (object.type === "rectangle" || object.type === "text") {
      onUpdate({ width: value });
    }
  };

  const handleHeightChange = (value: number) => {
    // Safety check: don't update with NaN
    if (isNaN(value)) return;

    if (object.type === "circle") {
      onUpdate({ radiusY: value / 2 });
    } else if (object.type === "rectangle" || object.type === "text") {
      onUpdate({ height: value });
    }
  };

  // Calculate minimum width based on object type
  // For text objects, minimum width should accommodate at least one character
  const getMinWidth = () => {
    if (object.type === "text") {
      // Estimate minimum width as fontSize * 0.8 to fit at least one character
      const fontSize = object.fontSize || 16;
      return Math.max(10, fontSize * 0.8);
    }
    return 10; // Default minimum for other shapes
  };

  // Validation hooks for width and height with dynamic canvas-based limits
  const widthInput = useNumericInput({
    value: getWidth(),
    onChange: handleWidthChange,
    min: getMinWidth(),
    max: canvasWidth,
    defaultValue: 100,
  });

  const heightInput = useNumericInput({
    value: getHeight(),
    onChange: handleHeightChange,
    min: 10,
    max: canvasHeight,
    defaultValue: 100,
  });

  // Validation hook for rotation with normalization
  const handleRotationChange = (value: number) => {
    // Normalize to 0-360
    let normalized = value % 360;
    if (normalized < 0) normalized += 360;
    onUpdate({ rotation: normalized });
  };

  const rotationInput = useNumericInput({
    value: Math.round(object.rotation || 0),
    onChange: handleRotationChange,
    min: 0,
    max: 360,
    defaultValue: 0,
  });

  return (
    <div className="space-y-4">
      {/* Position Section */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Position
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="pos-x" className="text-xs text-gray-500">
              X
            </Label>
            <Input
              id="pos-x"
              type="number"
              value={Math.round(object.x)}
              onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="pos-y" className="text-xs text-gray-500">
              Y
            </Label>
            <Input
              id="pos-y"
              type="number"
              value={Math.round(object.y)}
              onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Size Section - Hidden for lines */}
      {!isLine && (
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
            Size
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="size-w" className="text-xs text-gray-500">
                Width
              </Label>
              <Input
                id="size-w"
                type="number"
                min={getMinWidth()}
                max={canvasWidth}
                value={widthInput.displayValue}
                onChange={widthInput.handleChange}
                onBlur={widthInput.handleBlur}
                disabled={disabled}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="size-h" className="text-xs text-gray-500">
                Height
              </Label>
              <Input
                id="size-h"
                type="number"
                min="10"
                max={canvasHeight}
                value={heightInput.displayValue}
                onChange={heightInput.handleChange}
                onBlur={heightInput.handleBlur}
                disabled={disabled}
                className="h-8"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rotation Section - Hidden for lines */}
      {!isLine && (
        <div>
          <Label
            htmlFor="rotation"
            className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block"
          >
            Rotation
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="rotation"
              type="number"
              min="0"
              max="360"
              value={rotationInput.displayValue}
              onChange={rotationInput.handleChange}
              onBlur={rotationInput.handleBlur}
              disabled={disabled}
              className="h-8"
            />
            <span className="text-sm text-gray-500">°</span>
          </div>
        </div>
      )}

      {/* Layer Section */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Layer
        </Label>
        <TooltipProvider>
          <div className="grid grid-cols-4 gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLayerOperation(LayerOperation.TO_FRONT)}
                  disabled={disabled}
                  className="h-8"
                >
                  <ChevronsUp size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Bring to Front{" "}
                  <span className="text-muted-foreground">(⌘⇧])</span>
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleLayerOperation(LayerOperation.BRING_FORWARD)
                  }
                  disabled={disabled}
                  className="h-8"
                >
                  <ChevronUp size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Bring Forward{" "}
                  <span className="text-muted-foreground">(⌘])</span>
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleLayerOperation(LayerOperation.SEND_BACKWARD)
                  }
                  disabled={disabled}
                  className="h-8"
                >
                  <ChevronDown size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Send Backward{" "}
                  <span className="text-muted-foreground">(⌘[)</span>
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLayerOperation(LayerOperation.TO_BACK)}
                  disabled={disabled}
                  className="h-8"
                >
                  <ChevronsDown size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Send to Back{" "}
                  <span className="text-muted-foreground">(⌘⇧[)</span>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
