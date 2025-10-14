"use client";

import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import Button from "@/components/ui/Button";
import Canvas from "./_components/Canvas";

function CanvasPageContent() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              CollabCanvas
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.displayName || user?.email}
              </span>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Canvas Area */}
      <main className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-7xl">
          <Canvas />
        </div>
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

