"use client";

import { useState } from "react";
import { PersistedCircle } from "../../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNumericInput } from "../../../_hooks/useNumericInput";

interface CirclePropertiesProps {
  shape: PersistedCircle;
  onUpdate: (updates: Partial<PersistedCircle>) => void;
  disabled?: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export default function CircleProperties({
  shape,
  onUpdate,
  disabled = false,
  canvasWidth,
  canvasHeight,
}: CirclePropertiesProps) {
  const isCircle = Math.abs(shape.radiusX - shape.radiusY) < 0.1;
  const [lockAspectRatio, setLockAspectRatio] = useState(isCircle);

  // Dynamic max radius based on canvas dimensions
  const maxRadius = Math.min(canvasWidth, canvasHeight) / 2;

  const handleRadiusXChange = (value: number) => {
    if (lockAspectRatio) {
      onUpdate({ radiusX: value, radiusY: value });
    } else {
      onUpdate({ radiusX: value });
    }
  };

  const handleRadiusYChange = (value: number) => {
    if (lockAspectRatio) {
      onUpdate({ radiusX: value, radiusY: value });
    } else {
      onUpdate({ radiusY: value });
    }
  };

  // Validation hooks for radiusX and radiusY with dynamic canvas-based limits
  const radiusXInput = useNumericInput({
    value: Math.round(shape.radiusX),
    onChange: handleRadiusXChange,
    min: 5,
    max: maxRadius,
    defaultValue: 50,
  });

  const radiusYInput = useNumericInput({
    value: Math.round(shape.radiusY),
    onChange: handleRadiusYChange,
    min: 5,
    max: maxRadius,
    defaultValue: 50,
  });

  return (
    <div className="space-y-3">
      {/* Radius inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="radius-x" className="text-xs text-gray-500">
            Radius X
          </Label>
          <Input
            id="radius-x"
            type="number"
            min="5"
            max={maxRadius}
            value={radiusXInput.displayValue}
            onChange={radiusXInput.handleChange}
            onBlur={radiusXInput.handleBlur}
            disabled={disabled}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="radius-y" className="text-xs text-gray-500">
            Radius Y
          </Label>
          <Input
            id="radius-y"
            type="number"
            min="5"
            max={maxRadius}
            value={radiusYInput.displayValue}
            onChange={radiusYInput.handleChange}
            onBlur={radiusYInput.handleBlur}
            disabled={disabled}
            className="h-8"
          />
        </div>
      </div>

      {/* Lock aspect ratio toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="lock-aspect"
          checked={lockAspectRatio}
          onChange={(e) => {
            const checked = e.target.checked;
            setLockAspectRatio(checked);
            // If locking, make both radii equal
            if (checked) {
              const avgRadius = (shape.radiusX + shape.radiusY) / 2;
              onUpdate({ radiusX: avgRadius, radiusY: avgRadius });
            }
          }}
          disabled={disabled}
          className="rounded"
        />
        <Label htmlFor="lock-aspect" className="text-sm cursor-pointer">
          Lock aspect ratio
        </Label>
      </div>

      {/* Display info if it's a perfect circle */}
      {isCircle && (
        <p className="text-xs text-gray-500">
          Perfect circle • Radius: {Math.round(shape.radiusX)}px
        </p>
      )}
    </div>
  );
}
