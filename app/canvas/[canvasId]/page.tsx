"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import Canvas from "../_components/Canvas";
import OnlineUsers from "../_components/OnlineUsers";
import CanvasHeader from "../_components/CanvasHeader";
import { useCanvas } from "../_hooks/useCanvas";
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
  const { canvas, loading, error } = useCanvas(canvasId);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    );
  }

  // Error state - canvas not found
  if (error || !canvas) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 mx-auto text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Canvas not found</h1>
          <p className="text-muted-foreground mb-6">
            This canvas doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link
            href="/canvas"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
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
            <OnlineUsers />
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
      <CanvasHeader canvasName={canvas.name} />

      {/* Canvas Area */}
      <main className="flex-1 overflow-hidden">
        <Canvas canvasId={canvasId} canvas={canvas} />
      </main>
    </div>
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
