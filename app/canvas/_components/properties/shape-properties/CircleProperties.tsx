"use client";

import { useState } from "react";
import { PersistedCircle } from "../../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CirclePropertiesProps {
  shape: PersistedCircle;
  onUpdate: (updates: Partial<PersistedCircle>) => void;
  disabled?: boolean;
}

export default function CircleProperties({
  shape,
  onUpdate,
  disabled = false,
}: CirclePropertiesProps) {
  const isCircle = Math.abs(shape.radiusX - shape.radiusY) < 0.1;
  const [lockAspectRatio, setLockAspectRatio] = useState(isCircle);

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
            min="1"
            value={Math.round(shape.radiusX)}
            onChange={(e) =>
              handleRadiusXChange(parseFloat(e.target.value) || 1)
            }
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
            min="1"
            value={Math.round(shape.radiusY)}
            onChange={(e) =>
              handleRadiusYChange(parseFloat(e.target.value) || 1)
            }
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

