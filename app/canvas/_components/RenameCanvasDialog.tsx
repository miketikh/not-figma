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
import { PenSquare } from "lucide-react";

interface RenameCanvasDialogProps {
  open: boolean;
  currentName: string;
  onConfirm: (newName: string) => Promise<void>;
  onCancel: () => void;
}

export function RenameCanvasDialog({
  open,
  currentName,
  onConfirm,
  onCancel,
}: RenameCanvasDialogProps) {
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setNewName(currentName);
      setError(null);
      setLoading(false);
    }
  }, [open, currentName]);

  const isConfirmDisabled =
    !newName.trim() || newName.trim() === currentName || loading;

  const handleConfirm = async () => {
    if (isConfirmDisabled) {
      return;
    }

    const trimmedName = newName.trim();

    // Validate name length (max 100 chars as per constants)
    if (trimmedName.length > 100) {
      setError("Canvas name must be 100 characters or less");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(trimmedName);
      onCancel(); // Close the dialog after successful rename
    } catch (err) {
      console.error("Failed to rename canvas:", err);
      setError(err instanceof Error ? err.message : "Failed to rename canvas");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isConfirmDisabled) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-primary" />
            <DialogTitle>Rename Canvas</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Choose a new name for your canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="canvas-name">Canvas Name</Label>
            <Input
              id="canvas-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null); // Clear error on change
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter canvas name"
              disabled={loading}
              autoComplete="off"
              autoFocus
              maxLength={100}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              {newName.length}/100 characters
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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {loading ? "Renaming..." : "Rename Canvas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
