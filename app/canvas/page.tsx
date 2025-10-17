"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCanvases } from "./_hooks/useCanvases";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import { CanvasCard } from "./_components/CanvasCard";
import { CreateCanvasModal } from "./_components/CreateCanvasModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CanvasDashboardContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { canvases, loading, error, createCanvas, deleteCanvas, renameCanvas } = useCanvases();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handle canvas creation
  const handleCreateCanvas = async (name: string, width: number, height: number) => {
    try {
      const canvasId = await createCanvas(name, width, height);
      // Navigate to the new canvas (route doesn't exist yet, will be created in Phase 3)
      router.push(`/canvas/${canvasId}`);
    } catch (error) {
      console.error("Failed to create canvas:", error);
      // Error is already handled by the hook
    }
  };

  // Handle canvas deletion with confirmation
  const handleDeleteCanvas = async (canvasId: string) => {
    const canvas = canvases.find((c) => c.id === canvasId);
    if (!canvas) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${canvas.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteCanvas(canvasId);
      } catch (error) {
        console.error("Failed to delete canvas:", error);
        // Error is already handled by the hook
      }
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
    } catch (error) {
      console.error("Failed to rename canvas:", error);
      // Error is already handled by the hook
      throw error; // Re-throw to let CanvasCard handle the UI
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <DashboardHeader user={user} signOut={signOut} onCreateClick={() => setIsCreateModalOpen(true)} />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-muted animate-pulse rounded-lg"
                />
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
        <DashboardHeader user={user} signOut={signOut} onCreateClick={() => setIsCreateModalOpen(true)} />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg text-destructive mb-4">
                Failed to load canvases: {error.message}
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
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
        <DashboardHeader user={user} signOut={signOut} onCreateClick={() => setIsCreateModalOpen(true)} />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Plus className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">No canvases yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating your first canvas. Design, collaborate, and bring your ideas to life.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Canvas
              </Button>
            </div>
          </div>
        </main>
        <CreateCanvasModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateCanvas}
        />
      </div>
    );
  }

  // Canvas grid
  return (
    <div className="flex flex-col h-screen bg-background">
      <DashboardHeader user={user} signOut={signOut} onCreateClick={() => setIsCreateModalOpen(true)} />
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
            <h1 className="text-xl font-semibold text-foreground">
              Not-Figma
            </h1>
          </div>
          <div className="h-6 w-px bg-border" />
          <h2 className="text-lg font-medium text-foreground">
            My Canvases
          </h2>
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
              <DropdownMenuItem onClick={signOut}>
                Sign out
              </DropdownMenuItem>
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
      <CanvasDashboardContent />
    </ProtectedRoute>
  );
}
