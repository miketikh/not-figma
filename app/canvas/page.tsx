"use client";

import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import Button from "@/components/ui/Button";
import Canvas from "./_components/Canvas";

function CanvasPageContent() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              CollabCanvas
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
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

