"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyCanvasStateProps {
  onCreateClick: () => void;
}

/**
 * Empty state component displayed when user has no canvases
 * Shows a friendly message and call-to-action to create first canvas
 */
export function EmptyCanvasState({ onCreateClick }: EmptyCanvasStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <Plus className="w-12 h-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">No canvases yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Get started by creating your first canvas. Design, collaborate, and
        bring your ideas to life.
      </p>
      <Button onClick={onCreateClick} size="lg">
        <Plus className="w-4 h-4 mr-2" />
        Create Canvas
      </Button>
    </div>
  );
}
