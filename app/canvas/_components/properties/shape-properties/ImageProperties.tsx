"use client";

import { PersistedImage } from "../../../_types/shapes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, Unlink, Trash2 } from "lucide-react";

interface ImagePropertiesProps {
  shape: PersistedImage;
  onUpdate: (updates: Partial<PersistedImage>) => void;
  onDelete?: (imageId: string) => void;
  disabled?: boolean;
}

export default function ImageProperties({
  shape,
  onUpdate,
  onDelete,
  disabled = false,
}: ImagePropertiesProps) {
  // Get aspect ratio lock state from shape (default to true if not set)
  const aspectRatioLocked = shape.aspectRatioLocked ?? true;

  // Calculate aspect ratio from original dimensions
  const aspectRatio = shape.originalWidth / shape.originalHeight;

  // Handle width change with aspect ratio lock
  const handleWidthChange = (newWidth: number) => {
    if (aspectRatioLocked) {
      const newHeight = newWidth / aspectRatio;
      onUpdate({ width: newWidth, height: newHeight });
    } else {
      onUpdate({ width: newWidth });
    }
  };

  // Handle height change with aspect ratio lock
  const handleHeightChange = (newHeight: number) => {
    if (aspectRatioLocked) {
      const newWidth = newHeight * aspectRatio;
      onUpdate({ width: newWidth, height: newHeight });
    } else {
      onUpdate({ height: newHeight });
    }
  };

  // Format file size in MB
  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
      if (onDelete) {
        onDelete(shape.id);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* File Information Section */}
      <div>
        <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          File Info
        </h5>
        <div className="space-y-2 text-xs">
          {shape.fileName && (
            <div>
              <span className="text-gray-500">File name: </span>
              <span className="text-gray-700 break-all">{shape.fileName}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Original dimensions: </span>
            <span className="text-gray-700">
              {shape.originalWidth} x {shape.originalHeight}
            </span>
          </div>
          {shape.fileSize && (
            <div>
              <span className="text-gray-500">File size: </span>
              <span className="text-gray-700">{formatFileSize(shape.fileSize)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dimensions Section */}
      <div>
        <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Dimensions
        </h5>
        <div className="space-y-2">
          {/* Width */}
          <div>
            <Label htmlFor="image-width" className="text-xs text-gray-500">
              Width
            </Label>
            <Input
              id="image-width"
              type="number"
              min="5"
              value={Math.round(shape.width)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 5;
                handleWidthChange(Math.max(5, value));
              }}
              disabled={disabled}
              className="h-8"
            />
          </div>

          {/* Aspect Ratio Lock Toggle */}
          <div className="flex items-center justify-center">
            <Button
              type="button"
              size="sm"
              variant={aspectRatioLocked ? "default" : "outline"}
              onClick={() => onUpdate({ aspectRatioLocked: !aspectRatioLocked })}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2"
              title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
            >
              {aspectRatioLocked ? (
                <>
                  <Link className="h-4 w-4" />
                  <span className="text-xs">Locked</span>
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4" />
                  <span className="text-xs">Unlocked</span>
                </>
              )}
            </Button>
          </div>

          {/* Height */}
          <div>
            <Label htmlFor="image-height" className="text-xs text-gray-500">
              Height
            </Label>
            <Input
              id="image-height"
              type="number"
              min="5"
              value={Math.round(shape.height)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 5;
                handleHeightChange(Math.max(5, value));
              }}
              disabled={disabled}
              className="h-8"
            />
          </div>

          <p className="text-xs text-gray-400">
            {aspectRatioLocked
              ? "Aspect ratio locked - dimensions scale proportionally"
              : "Aspect ratio unlocked - dimensions can be changed independently"}
          </p>
        </div>
      </div>

      {/* Actions Section */}
      <div>
        <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Actions
        </h5>
        <div className="space-y-2">
          {/* Delete Button */}
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Image</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
