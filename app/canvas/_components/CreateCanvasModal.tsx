"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CANVAS_DIMENSION_PRESETS,
  DEFAULT_CANVAS_NAME,
  MAX_CANVAS_NAME_LENGTH,
  MIN_CANVAS_DIMENSION,
  MAX_CANVAS_DIMENSION,
} from "@/lib/constants/canvas";

interface CreateCanvasModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    width: number,
    height: number,
    isPublic: boolean
  ) => void;
}

type PresetValue = "preset-0" | "preset-1" | "preset-2" | "custom";

export function CreateCanvasModal({
  open,
  onClose,
  onCreate,
}: CreateCanvasModalProps) {
  const [name, setName] = useState(DEFAULT_CANVAS_NAME);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue>("preset-0");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    width?: string;
    height?: string;
  }>({});

  // Clear form state when modal closes
  useEffect(() => {
    if (!open) {
      setName(DEFAULT_CANVAS_NAME);
      setSelectedPreset("preset-0");
      setCustomWidth("");
      setCustomHeight("");
      setIsPublic(false);
      setLoading(false);
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Canvas name is required";
    } else if (name.length > MAX_CANVAS_NAME_LENGTH) {
      newErrors.name = `Name must be ${MAX_CANVAS_NAME_LENGTH} characters or less`;
    }

    // Validate dimensions if custom is selected
    if (selectedPreset === "custom") {
      const width = parseInt(customWidth, 10);
      const height = parseInt(customHeight, 10);

      if (!customWidth || isNaN(width)) {
        newErrors.width = "Width is required";
      } else if (width < MIN_CANVAS_DIMENSION || width > MAX_CANVAS_DIMENSION) {
        newErrors.width = `Width must be between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION}`;
      }

      if (!customHeight || isNaN(height)) {
        newErrors.height = "Height is required";
      } else if (
        height < MIN_CANVAS_DIMENSION ||
        height > MAX_CANVAS_DIMENSION
      ) {
        newErrors.height = `Height must be between ${MIN_CANVAS_DIMENSION} and ${MAX_CANVAS_DIMENSION}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let width: number;
      let height: number;

      if (selectedPreset === "custom") {
        width = parseInt(customWidth, 10);
        height = parseInt(customHeight, 10);
      } else {
        // Extract preset index from "preset-0", "preset-1", etc.
        const presetIndex = parseInt(selectedPreset.replace("preset-", ""), 10);
        const preset = CANVAS_DIMENSION_PRESETS[presetIndex];
        width = preset.width;
        height = preset.height;
      }

      await onCreate(name.trim(), width, height, isPublic);
      onClose();
    } catch (error) {
      console.error("Failed to create canvas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Canvas</DialogTitle>
          <DialogDescription>
            Set up your new canvas with a name and dimensions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Canvas Name */}
            <div className="grid gap-2">
              <Label htmlFor="canvas-name">Canvas Name</Label>
              <Input
                id="canvas-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={DEFAULT_CANVAS_NAME}
                maxLength={MAX_CANVAS_NAME_LENGTH}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Dimension Presets */}
            <div className="grid gap-3">
              <Label>Dimensions</Label>
              <RadioGroup
                value={selectedPreset}
                onValueChange={(value) =>
                  setSelectedPreset(value as PresetValue)
                }
                disabled={loading}
              >
                {CANVAS_DIMENSION_PRESETS.map((preset, index) => (
                  <div
                    key={`preset-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <RadioGroupItem
                      value={`preset-${index}`}
                      id={`preset-${index}`}
                    />
                    <Label
                      htmlFor={`preset-${index}`}
                      className="font-normal cursor-pointer"
                    >
                      {preset.name}
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label
                    htmlFor="custom"
                    className="font-normal cursor-pointer"
                  >
                    Custom
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Custom Dimensions */}
            {selectedPreset === "custom" && (
              <div className="grid gap-4 pl-6">
                <div className="grid gap-2">
                  <Label htmlFor="custom-width">Width (px)</Label>
                  <Input
                    id="custom-width"
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder="1920"
                    min={MIN_CANVAS_DIMENSION}
                    max={MAX_CANVAS_DIMENSION}
                    disabled={loading}
                  />
                  {errors.width && (
                    <p className="text-sm text-destructive">{errors.width}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="custom-height">Height (px)</Label>
                  <Input
                    id="custom-height"
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    placeholder="1080"
                    min={MIN_CANVAS_DIMENSION}
                    max={MAX_CANVAS_DIMENSION}
                    disabled={loading}
                  />
                  {errors.height && (
                    <p className="text-sm text-destructive">{errors.height}</p>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            <div className="grid gap-3">
              <Label>Privacy</Label>
              <RadioGroup
                value={isPublic ? "public" : "private"}
                onValueChange={(value) => setIsPublic(value === "public")}
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label
                    htmlFor="private"
                    className="font-normal cursor-pointer"
                  >
                    Private
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label
                    htmlFor="public"
                    className="font-normal cursor-pointer"
                  >
                    Public
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {isPublic
                  ? "Public canvases can be viewed and edited by all users"
                  : "Only you can access this canvas"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Canvas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
