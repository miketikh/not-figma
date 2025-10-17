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
import { AlertTriangle } from "lucide-react";

interface DeleteCanvasDialogProps {
  open: boolean;
  canvasName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteCanvasDialog({
  open,
  canvasName,
  onConfirm,
  onCancel,
}: DeleteCanvasDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear form state when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
      setLoading(false);
    }
  }, [open]);

  const isConfirmDisabled = confirmationText !== canvasName || loading;

  const handleConfirm = async () => {
    if (isConfirmDisabled) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      onCancel(); // Close the dialog after successful deletion
    } catch (error) {
      console.error("Failed to delete canvas:", error);
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Canvas</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{canvasName}&quot;</span>?
            This will permanently delete the canvas and all objects in it. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="confirmation-text">
              Type <span className="font-semibold">{canvasName}</span> to confirm
            </Label>
            <Input
              id="confirmation-text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canvasName}
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {loading ? "Deleting..." : "Delete Canvas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
