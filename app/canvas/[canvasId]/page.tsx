"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileQuestion, Home, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import Canvas from "../_components/Canvas";
import OnlineUsers from "../_components/OnlineUsers";
import CanvasHeader from "../_components/CanvasHeader";
import { useCanvas } from "../_hooks/useCanvas";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CanvasPageProps {
  params: Promise<{
    canvasId: string;
  }>;
}

function CanvasPageContent({ canvasId }: { canvasId: string }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { canvas, loading, error, retry } = useCanvas(canvasId);

  // Loading state - show page skeleton
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header Skeleton */}
        <header className="flex-shrink-0 bg-card border-b h-16 shadow-sm">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Left Side - Logo */}
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

            {/* Center - skeleton for online users */}
            <div className="flex-1 flex justify-center">
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </div>

            {/* Right Side - User Info skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </header>

        {/* Canvas Header Skeleton */}
        <div className="flex-shrink-0 bg-card border-b h-12 shadow-sm">
          <div className="h-full px-6 flex items-center gap-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Canvas Area - centered spinner */}
        <main className="flex-1 overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading canvas...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state - canvas not found or permission denied
  if (error || !canvas) {
    // Check if it's a permission denied error
    const isPermissionDenied = error?.message?.includes("permission-denied") ||
                               error?.message?.includes("Missing or insufficient permissions");

    // Check if it's a network error (can retry)
    const isNetworkError = error?.message?.includes("network") ||
                          error?.message?.includes("offline") ||
                          error?.message?.includes("Failed to fetch");

    const errorTitle = isPermissionDenied
      ? "Access Denied"
      : isNetworkError
      ? "Connection Error"
      : "Canvas Not Found";

    const errorMessage = isPermissionDenied
      ? "You don't have permission to view this canvas. It may be private or you may not be invited to collaborate."
      : isNetworkError
      ? "Unable to load the canvas. Please check your internet connection and try again."
      : "This canvas doesn't exist or has been deleted.";

    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="mb-6 flex justify-center">
            {isNetworkError ? (
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
            ) : (
              <FileQuestion className="h-24 w-24 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>

          <h1 className="text-3xl font-bold mb-3 text-foreground">
            {errorTitle}
          </h1>

          <p className="text-muted-foreground mb-8 text-base leading-relaxed">
            {errorMessage}
          </p>

          <div className="flex gap-3 justify-center">
            {isNetworkError && (
              <Button onClick={retry} size="lg" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
            <Button asChild size="lg" variant={isNetworkError ? "outline" : "default"} className="gap-2">
              <Link href="/canvas">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Main Header - Logo, Online Users, User Info */}
        <header className="flex-shrink-0 bg-card border-b h-16 shadow-sm">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left Side - Logo */}
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

          {/* Center - Online Users */}
          <div className="flex-1 flex justify-center">
            <OnlineUsers canvasId={canvasId} />
          </div>

          {/* Right Side - User Info */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                  {/* User Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                    style={{ backgroundColor: user?.color }}
                  >
                    {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
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

      {/* Canvas Header with Breadcrumb */}
      <CanvasHeader canvasId={canvasId} canvasName={canvas.name} />

      {/* Canvas Area */}
      <main className="flex-1 overflow-hidden">
        <Canvas canvasId={canvasId} canvas={canvas} />
      </main>
    </div>
    </ToastProvider>
  );
}

export default function CanvasPage(props: CanvasPageProps) {
  // Unwrap the params Promise using React.use()
  const params = use(props.params);
  const { canvasId } = params;

  return (
    <ProtectedRoute>
      <CanvasPageContent canvasId={canvasId} />
    </ProtectedRoute>
  );
}
