"use client";

import { PersistedText } from "../../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from "lucide-react";

interface TextPropertiesProps {
  shape: PersistedText;
  onUpdate: (updates: Partial<PersistedText>) => void;
  disabled?: boolean;
}

// Common font families
const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Georgia",
  "Palatino",
  "Garamond",
  "Bookman",
  "Comic Sans MS",
  "Trebuchet MS",
  "Impact",
];

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          placeholder="Enter text..."
        />
      </div>

      {/* Font Family */}
      <div>
        <Label htmlFor="font-family" className="text-xs text-gray-500">
          Font Family
        </Label>
        <select
          id="font-family"
          value={shape.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          disabled={disabled}
          className="w-full h-8 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
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
        <p className="text-xs text-gray-400 mt-1">Range: 8-200px</p>
      </div>

      {/* Font Weight & Style */}
      <div>
        <Label className="text-xs text-gray-500 mb-2 block">Font Style</Label>
        <div className="flex gap-2">
          {/* Bold */}
          <Button
            type="button"
            size="sm"
            variant={shape.fontWeight === "bold" ? "default" : "outline"}
            onClick={() =>
              onUpdate({
                fontWeight: shape.fontWeight === "bold" ? "normal" : "bold",
              })
            }
            disabled={disabled}
            className="flex-1"
          >
            <Bold className="h-4 w-4" />
          </Button>

          {/* Italic */}
          <Button
            type="button"
            size="sm"
            variant={shape.fontStyle === "italic" ? "default" : "outline"}
            onClick={() =>
              onUpdate({
                fontStyle: shape.fontStyle === "italic" ? "normal" : "italic",
              })
            }
            disabled={disabled}
            className="flex-1"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <Label className="text-xs text-gray-500 mb-2 block">
          Text Alignment
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={shape.textAlign === "left" ? "default" : "outline"}
            onClick={() => onUpdate({ textAlign: "left" })}
            disabled={disabled}
            className="flex-1"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shape.textAlign === "center" ? "default" : "outline"}
            onClick={() => onUpdate({ textAlign: "center" })}
            disabled={disabled}
            className="flex-1"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={shape.textAlign === "right" ? "default" : "outline"}
            onClick={() => onUpdate({ textAlign: "right" })}
            disabled={disabled}
            className="flex-1"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Text Decoration */}
      <div>
        <Label className="text-xs text-gray-500 mb-2 block">
          Text Decoration
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={shape.textDecoration === "underline" ? "default" : "outline"}
            onClick={() =>
              onUpdate({
                textDecoration:
                  shape.textDecoration === "underline" ? "none" : "underline",
              })
            }
            disabled={disabled}
            className="flex-1"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={
              shape.textDecoration === "line-through" ? "default" : "outline"
            }
            onClick={() =>
              onUpdate({
                textDecoration:
                  shape.textDecoration === "line-through"
                    ? "none"
                    : "line-through",
              })
            }
            disabled={disabled}
            className="flex-1"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Line Height */}
      <div>
        <Label htmlFor="line-height" className="text-xs text-gray-500">
          Line Height
        </Label>
        <Input
          id="line-height"
          type="number"
          min="0.5"
          max="3"
          step="0.1"
          value={shape.lineHeight}
          onChange={(e) =>
            onUpdate({ lineHeight: parseFloat(e.target.value) || 1.2 })
          }
          disabled={disabled}
          className="h-8"
        />
        <p className="text-xs text-gray-400 mt-1">Range: 0.5-3.0</p>
      </div>
    </div>
  );
}

