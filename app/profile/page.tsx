"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/providers/ProtectedRoute";
import { Button } from "@/components/ui/button";
import ProfileForm from "./_components/ProfileForm";

function ProfilePageContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/canvas">
            <Button variant="ghost" size="sm" className="mb-4">
              ← Back to Canvas
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
          {user?.email && (
            <p className="mt-1 text-sm text-gray-500">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>

        {/* Profile Form */}
        <ProfileForm />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
