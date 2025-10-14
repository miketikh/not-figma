"use client";

import { PersistedLine } from "../../../_types/shapes";
import { Label } from "@/components/ui/label";

interface LinePropertiesProps {
  shape: PersistedLine;
  onUpdate: (updates: Partial<PersistedLine>) => void;
  disabled?: boolean;
}

export default function LineProperties({
  shape,
  onUpdate,
  disabled = false,
}: LinePropertiesProps) {
  // Calculate line length
  const dx = shape.x2 - shape.x;
  const dy = shape.y2 - shape.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Calculate line angle in degrees
  const angleRadians = Math.atan2(dy, dx);
  const angleDegrees = angleRadians * (180 / Math.PI);

  return (
    <div className="space-y-2">
      {/* Line Length (Read-only) */}
      <div>
        <Label className="text-xs text-gray-500">Length</Label>
        <div className="text-sm font-mono text-gray-700 mt-1">
          {Math.round(length)}px
        </div>
      </div>

      {/* Line Angle (Read-only) */}
      <div>
        <Label className="text-xs text-gray-500">Angle</Label>
        <div className="text-sm font-mono text-gray-700 mt-1">
          {Math.round(angleDegrees)}°
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-400 italic mt-2">
        Drag endpoints to adjust length and angle
      </p>
    </div>
  );
}

