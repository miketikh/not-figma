"use client";

import { PersistedRect } from "../../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RectanglePropertiesProps {
  shape: PersistedRect;
  onUpdate: (updates: Partial<PersistedRect>) => void;
  disabled?: boolean;
}

export default function RectangleProperties({
  shape,
  onUpdate,
  disabled = false,
}: RectanglePropertiesProps) {
  const maxCornerRadius = Math.min(shape.width, shape.height) / 2;

  return (
    <div className="space-y-2">
      <Label htmlFor="corner-radius" className="text-xs text-gray-500">
        Corner Radius
      </Label>
      <Input
        id="corner-radius"
        type="number"
        min="0"
        max={maxCornerRadius}
        value={shape.cornerRadius || 0}
        onChange={(e) => {
          let value = parseFloat(e.target.value) || 0;
          // Clamp to max
          value = Math.min(value, maxCornerRadius);
          onUpdate({ cornerRadius: value });
        }}
        disabled={disabled}
        className="h-8"
      />
      <p className="text-xs text-gray-400">
        Max: {Math.round(maxCornerRadius)}px
      </p>
    </div>
  );
}

