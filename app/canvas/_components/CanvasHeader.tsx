"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MoreVertical, PenSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { updateCanvas, deleteCanvas } from "@/lib/firebase/canvas";
import { RenameCanvasDialog } from "./RenameCanvasDialog";
import { DeleteCanvasDialog } from "./DeleteCanvasDialog";
import { useToast } from "@/components/ui/toast";

interface CanvasHeaderProps {
  canvasId: string;
  canvasName: string;
}

export default function CanvasHeader({
  canvasId,
  canvasName,
}: CanvasHeaderProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDashboardClick = () => {
    router.push("/canvas");
  };

  const handleRename = async (newName: string) => {
    try {
      await updateCanvas(canvasId, { name: newName });
      addToast({
        title: "Success",
        description: "Canvas renamed successfully",
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to rename canvas:", error);
      addToast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to rename canvas",
        variant: "destructive",
        duration: 5000,
      });
      throw error; // Re-throw to let dialog handle error state
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCanvas(canvasId);
      addToast({
        title: "Success",
        description: "Canvas deleted successfully",
        variant: "success",
        duration: 3000,
      });
      // Redirect to dashboard after successful deletion
      router.push("/canvas");
    } catch (error) {
      console.error("Failed to delete canvas:", error);
      addToast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete canvas",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <>
      <header className="flex-shrink-0 bg-card border-b h-12 shadow-sm">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDashboardClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
              {canvasName}
            </span>
          </div>

          {/* Canvas Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Canvas settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenameDialogOpen(true)}>
                <PenSquare className="h-4 w-4 mr-2" />
                Rename Canvas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Canvas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Rename Dialog */}
      <RenameCanvasDialog
        open={renameDialogOpen}
        currentName={canvasName}
        onConfirm={handleRename}
        onCancel={() => setRenameDialogOpen(false)}
      />

      {/* Delete Dialog */}
      <DeleteCanvasDialog
        open={deleteDialogOpen}
        canvasName={canvasName}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}
