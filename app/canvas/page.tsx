"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCanvases } from "./_hooks/useCanvases";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import { CanvasCard } from "./_components/CanvasCard";
import { CanvasCardSkeleton } from "./_components/CanvasCardSkeleton";
import { CreateCanvasModal } from "./_components/CreateCanvasModal";
import { DeleteCanvasDialog } from "./_components/DeleteCanvasDialog";
import { EmptyCanvasState } from "./_components/EmptyCanvasState";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CanvasDashboardContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    canvases,
    loading,
    error,
    createCanvas,
    deleteCanvas,
    renameCanvas,
    retry,
  } = useCanvases();
  const { addToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Handle canvas creation
  const handleCreateCanvas = async (
    name: string,
    width: number,
    height: number,
    isPublic: boolean
  ) => {
    try {
      const canvasId = await createCanvas(name, width, height, isPublic);
      addToast({
        title: "Canvas created",
        description: `"${name}" has been created successfully.`,
        variant: "success",
      });
      router.push(`/canvas/${canvasId}`);
    } catch (error) {
      console.error("Failed to create canvas:", error);
      addToast({
        title: "Failed to create canvas",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Handle canvas deletion with confirmation
  const handleDeleteCanvas = (canvasId: string) => {
    const canvas = canvases.find((c) => c.id === canvasId);
    if (!canvas) return;

    // Open the delete confirmation dialog
    setCanvasToDelete({ id: canvas.id, name: canvas.name });
  };

  // Confirm deletion after user types canvas name
  const confirmDeleteCanvas = async () => {
    if (!canvasToDelete) return;

    try {
      await deleteCanvas(canvasToDelete.id);
      addToast({
        title: "Canvas deleted",
        description: `"${canvasToDelete.name}" has been deleted successfully.`,
        variant: "success",
      });
      setCanvasToDelete(null);
    } catch (error) {
      console.error("Failed to delete canvas:", error);
      addToast({
        title: "Failed to delete canvas",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Handle canvas card click
  const handleCanvasClick = (canvasId: string) => {
    router.push(`/canvas/${canvasId}`);
  };

  // Handle canvas rename
  const handleRenameCanvas = async (canvasId: string, name: string) => {
    try {
      await renameCanvas(canvasId, name);
      addToast({
        title: "Canvas renamed",
        description: `Canvas renamed to "${name}".`,
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to rename canvas:", error);
      addToast({
        title: "Failed to rename canvas",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
      throw error; // Re-throw to let CanvasCard handle the UI
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <DashboardHeader
          user={user}
          signOut={signOut}
          onCreateClick={() => setIsCreateModalOpen(true)}
        />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <CanvasCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <DashboardHeader
          user={user}
          signOut={signOut}
          onCreateClick={() => setIsCreateModalOpen(true)}
        />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 p-4 rounded-full bg-destructive/10">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                Failed to load canvases
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {error.message ||
                  "An unexpected error occurred while loading your canvases."}
              </p>
              <div className="flex gap-3">
                <Button onClick={retry} size="lg">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="lg"
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Empty state
  if (canvases.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <DashboardHeader
          user={user}
          signOut={signOut}
          onCreateClick={() => setIsCreateModalOpen(true)}
        />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <EmptyCanvasState
              onCreateClick={() => setIsCreateModalOpen(true)}
            />
          </div>
        </main>
        <CreateCanvasModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateCanvas}
        />
        <DeleteCanvasDialog
          open={!!canvasToDelete}
          canvasName={canvasToDelete?.name || ""}
          onConfirm={confirmDeleteCanvas}
          onCancel={() => setCanvasToDelete(null)}
        />
      </div>
    );
  }

  // Canvas grid
  return (
    <div className="flex flex-col h-screen bg-background">
      <DashboardHeader
        user={user}
        signOut={signOut}
        onCreateClick={() => setIsCreateModalOpen(true)}
      />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {canvases.map((canvas) => (
              <CanvasCard
                key={canvas.id}
                canvas={canvas}
                onClick={() => handleCanvasClick(canvas.id)}
                onDelete={() => handleDeleteCanvas(canvas.id)}
                onRename={(name) => handleRenameCanvas(canvas.id, name)}
              />
            ))}
          </div>
        </div>
      </main>
      <CreateCanvasModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCanvas}
      />
      <DeleteCanvasDialog
        open={!!canvasToDelete}
        canvasName={canvasToDelete?.name || ""}
        onConfirm={confirmDeleteCanvas}
        onCancel={() => setCanvasToDelete(null)}
      />
    </div>
  );
}

// Dashboard header component
function DashboardHeader({
  user,
  signOut,
  onCreateClick,
}: {
  user: any;
  signOut: () => void;
  onCreateClick: () => void;
}) {
  const router = useRouter();

  return (
    <header className="flex-shrink-0 bg-card border-b h-16 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left Side - Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/favicon/apple-touch-icon.png"
              alt="Not-Figma Logo"
              width={32}
              height={32}
              className="rounded"
            />
            <h1 className="text-xl font-semibold text-foreground">Not-Figma</h1>
          </div>
          <div className="h-6 w-px bg-border" />
          <h2 className="text-lg font-medium text-foreground">My Canvases</h2>
        </div>

        {/* Right Side - New Canvas Button and User Info */}
        <div className="flex items-center gap-4">
          <Button onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            New Canvas
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                {/* User Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                  style={{ backgroundColor: user?.color }}
                >
                  {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {user?.displayName || user?.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Update profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default function CanvasPage() {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <CanvasDashboardContent />
      </ToastProvider>
    </ProtectedRoute>
  );
}
