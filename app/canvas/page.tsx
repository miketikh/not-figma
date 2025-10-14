"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import Canvas from "./_components/Canvas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function CanvasPageContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b h-16 shadow-sm">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="3" width="8" height="8" rx="1" fill="#3b82f6" />
                <rect x="13" y="3" width="8" height="8" rx="1" fill="#60a5fa" />
                <rect x="3" y="13" width="8" height="8" rx="1" fill="#60a5fa" />
                <rect x="13" y="13" width="8" height="8" rx="1" fill="#93c5fd" />
              </svg>
              <h1 className="text-xl font-semibold text-foreground">
                CollabCanvas
              </h1>
            </div>
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

      {/* Canvas Area */}
      <main className="flex-1 overflow-hidden">
        <Canvas />
      </main>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <ProtectedRoute>
      <CanvasPageContent />
    </ProtectedRoute>
  );
}

