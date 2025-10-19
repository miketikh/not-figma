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
import { ImagePlus, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { sanitizeImageURL } from "@/lib/firebase/storage-validation";
import { uploadImageFromURL } from "@/lib/firebase/storage";
import { generateObjectId } from "@/app/canvas/_lib/objects";
import { loadImageFromURL, scaleImageToFit } from "@/app/canvas/_lib/image-utils";

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId: string;
  viewportCenter: { x: number; y: number };
  onImageImported: (imageData: {
    id: string;
    imageUrl: string;
    originalWidth: number;
    originalHeight: number;
    width: number;
    height: number;
    x: number;
    y: number;
  }) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  canvasId,
  viewportCenter,
  onImageImported,
}: ImageUploadDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<
    "idle" | "valid" | "invalid"
  >("idle");

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setUrl("");
      setError(null);
      setValidationState("idle");
      setLoading(false);
    }
  }, [open]);

  // Real-time URL validation
  useEffect(() => {
    if (!url.trim()) {
      setValidationState("idle");
      setError(null);
      return;
    }

    const validation = sanitizeImageURL(url);
    if (validation.valid) {
      setValidationState("valid");
      setError(null);
    } else {
      setValidationState("invalid");
      setError(validation.error || "Invalid URL");
    }
  }, [url]);

  const handleImport = async () => {
    if (validationState !== "valid" || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate unique image ID
      const imageId = generateObjectId();

      // Upload image from URL to Firebase Storage
      const downloadURL = await uploadImageFromURL(url, canvasId, imageId);

      // Load image to get dimensions
      const htmlImage = await loadImageFromURL(downloadURL);
      const originalWidth = htmlImage.naturalWidth;
      const originalHeight = htmlImage.naturalHeight;

      // Scale to fit if dimensions exceed 4096x4096 or are too large for canvas
      const maxDimension = Math.min(4096, 1000); // Max 1000px for initial placement
      const scaled = scaleImageToFit(
        originalWidth,
        originalHeight,
        maxDimension,
        maxDimension
      );

      // Calculate position at viewport center
      const x = viewportCenter.x - scaled.width / 2;
      const y = viewportCenter.y - scaled.height / 2;

      // Call callback with image data
      onImageImported({
        id: imageId,
        imageUrl: downloadURL,
        originalWidth,
        originalHeight,
        width: scaled.width,
        height: scaled.height,
        x,
        y,
      });

      // Close dialog
      onOpenChange(false);
    } catch (err) {
      console.error("Error importing image from URL:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to import image. Please check the URL and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && validationState === "valid" && !loading) {
      handleImport();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            <DialogTitle>Import Image from URL</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Enter the URL of an image to import it to your canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="image-url">Image URL</Label>
            <div className="relative">
              <Input
                id="image-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com/image.jpg"
                disabled={loading}
                autoComplete="off"
                autoFocus
                className="pr-10"
              />
              {validationState === "valid" && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
              {validationState === "invalid" && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />
              )}
            </div>
            {error && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: PNG, JPEG, WebP, GIF, SVG. Max size: 5MB.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={validationState !== "valid" || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Image"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
