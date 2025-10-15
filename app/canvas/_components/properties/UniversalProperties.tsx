"use client";

import { PersistedShape } from "../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getMaxZIndex,
  getMinZIndex,
  LayerOperation,
  calculateNewZIndex,
} from "../../_lib/layer-management";

interface UniversalPropertiesProps {
  object: PersistedShape;
  allObjects: PersistedShape[];
  onUpdate: (updates: Partial<PersistedShape>) => void;
  disabled?: boolean;
}

export default function UniversalProperties({
  object,
  allObjects,
  onUpdate,
  disabled = false,
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
      return Math.round((object.radiusX || 0) * 2);
    }
    if (object.type === "line") {
      return 0; // Lines don't have width
    }
    return Math.round(object.width || 0);
  };

  const getHeight = () => {
    if (object.type === "circle") {
      return Math.round((object.radiusY || 0) * 2);
    }
    if (object.type === "line") {
      return 0; // Lines don't have height
    }
    return Math.round(object.height || 0);
  };

  const handleWidthChange = (value: number) => {
    if (object.type === "circle") {
      onUpdate({ radiusX: value / 2 });
    } else if (object.type === "rectangle") {
      onUpdate({ width: value });
    }
  };

  const handleHeightChange = (value: number) => {
    if (object.type === "circle") {
      onUpdate({ radiusY: value / 2 });
    } else if (object.type === "rectangle") {
      onUpdate({ height: value });
    }
  };

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
              min="1"
              value={getWidth()}
              onChange={(e) =>
                handleWidthChange(parseFloat(e.target.value) || 1)
              }
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
              min="1"
              value={getHeight()}
              onChange={(e) =>
                handleHeightChange(parseFloat(e.target.value) || 1)
              }
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
            value={Math.round(object.rotation || 0)}
            onChange={(e) => {
              let value = parseFloat(e.target.value) || 0;
              // Normalize to 0-360
              value = value % 360;
              if (value < 0) value += 360;
              onUpdate({ rotation: value });
            }}
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
                  Bring Forward <span className="text-muted-foreground">(⌘])</span>
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
                  Send Backward <span className="text-muted-foreground">(⌘[)</span>
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

