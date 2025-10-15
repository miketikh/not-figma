"use client";

import { PersistedText } from "../../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextPropertiesProps {
  shape: PersistedText;
  onUpdate: (updates: Partial<PersistedText>) => void;
  disabled?: boolean;
}

export default function TextProperties({
  shape,
  onUpdate,
  disabled = false,
}: TextPropertiesProps) {
  return (
    <div className="space-y-4">
      {/* Content */}
      <div>
        <Label htmlFor="text-content" className="text-xs text-gray-500 mb-2 block">
          Content
        </Label>
        <textarea
          id="text-content"
          rows={4}
          value={shape.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Enter text..."
        />
      </div>

      {/* Font Size */}
      <div>
        <Label htmlFor="font-size" className="text-xs text-gray-500">
          Font Size
        </Label>
        <Input
          id="font-size"
          type="number"
          min="8"
          max="200"
          value={shape.fontSize}
          onChange={(e) =>
            onUpdate({ fontSize: parseInt(e.target.value) || 16 })
          }
          disabled={disabled}
          className="h-8"
        />
        <p className="text-xs text-gray-400 mt-1">
          Range: 8-200px
        </p>
      </div>
    </div>
  );
}

