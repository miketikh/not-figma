"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Pencil, Lock, Globe } from "lucide-react";
import { Canvas } from "@/types/canvas";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_CANVAS_NAME_LENGTH } from "@/lib/constants/canvas";

/**
 * Props for the CanvasCard component
 */
interface CanvasCardProps {
  canvas: Canvas;
  onClick: () => void;
  onDelete: () => void;
  onRename: (name: string) => Promise<void>;
}

/**
 * CanvasCard Component
 * Displays a canvas card with metadata (name, dimensions, creation date)
 * Shows delete and edit buttons on hover
 * Supports inline editing of canvas name
 */
export function CanvasCard({
  canvas,
  onClick,
  onDelete,
  onRename,
}: CanvasCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvas.name);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format creation date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `Created ${month} ${day}, ${year}`;
  };

  // Format dimensions
  const formatDimensions = (width: number, height: number): string => {
    return `${width} × ${height}`;
  };

  // Focus input when editing mode is enabled
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle delete button click (stop propagation to prevent card click)
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  // Handle edit button click (stop propagation to prevent card click)
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(canvas.name);
    setError(null);
    setIsEditing(true);
  };

  // Validate canvas name
  const validateName = (name: string): string | null => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return "Canvas name is required";
    }
    if (trimmedName.length > MAX_CANVAS_NAME_LENGTH) {
      return `Canvas name must be ${MAX_CANVAS_NAME_LENGTH} characters or less`;
    }
    return null;
  };

  // Handle save (on Enter or blur)
  const handleSave = async () => {
    if (!isEditing) return;

    const trimmedValue = editValue.trim();

    // If name hasn't changed, just exit editing mode
    if (trimmedValue === canvas.name) {
      setIsEditing(false);
      setError(null);
      return;
    }

    // Validate name
    const validationError = validateName(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Save to Firestore
    setIsLoading(true);
    setError(null);
    try {
      await onRename(trimmedValue);
      setIsEditing(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to rename canvas";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel (on Escape)
  const handleCancel = () => {
    setEditValue(canvas.name);
    setError(null);
    setIsEditing(false);
  };

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
        "overflow-hidden",
        isEditing && "cursor-default"
      )}
      onClick={isEditing ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader>
        {isEditing ? (
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={cn(
                "text-xl font-semibold",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              maxLength={MAX_CANVAS_NAME_LENGTH}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {isLoading && (
              <p className="text-xs text-muted-foreground">Saving...</p>
            )}
          </div>
        ) : (
          <CardTitle className="truncate text-xl">{canvas.name}</CardTitle>
        )}
        <CardDescription className="space-y-1">
          <div className="text-sm">
            {formatDimensions(canvas.width, canvas.height)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(canvas.createdAt)}
          </div>
        </CardDescription>
      </CardHeader>

      {/* Edit and Delete buttons - revealed on hover */}
      {isHovered && !isEditing && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-12 hover:bg-accent"
            onClick={handleEditClick}
            aria-label="Edit canvas name"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteClick}
            aria-label="Delete canvas"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Public/Private badge - positioned at bottom right */}
      <div
        className={cn(
          "absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap",
          canvas.isPublic
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        )}
      >
        {canvas.isPublic ? (
          <>
            <Globe className="h-3 w-3" />
            Public
          </>
        ) : (
          <>
            <Lock className="h-3 w-3" />
            Private
          </>
        )}
      </div>
    </Card>
  );
}
