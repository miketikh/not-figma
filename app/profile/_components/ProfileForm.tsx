"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-helpers";
import { validateDisplayName, validatePassword } from "@/app/(auth)/_lib/auth-helpers";

export default function ProfileForm() {
  const { user, updateDisplayName, updatePassword } = useAuth();

  // Display Name Form State
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [displayNameError, setDisplayNameError] = useState("");
  const [displayNameSuccess, setDisplayNameSuccess] = useState("");
  const [displayNameLoading, setDisplayNameLoading] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleDisplayNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDisplayNameError("");
    setDisplayNameSuccess("");

    // Validation
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      setDisplayNameError(nameError);
      return;
    }

    setDisplayNameLoading(true);

    try {
      await updateDisplayName(displayName);
      setDisplayNameSuccess("Display name updated successfully!");
    } catch (err) {
      setDisplayNameError(getAuthErrorMessage(err));
    } finally {
      setDisplayNameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
      setPasswordError(newPasswordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);

    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully!");
      // Clear form after successful update
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(getAuthErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Update Display Name Form */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Display Name
        </h2>
        <form onSubmit={handleDisplayNameSubmit} className="space-y-4">
          {displayNameError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{displayNameError}</p>
            </div>
          )}

          {displayNameSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{displayNameSuccess}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              required
            />
            <p className="text-xs text-gray-500">
              This is the name that will be displayed to other users.
            </p>
          </div>

          <Button
            type="submit"
            disabled={displayNameLoading}
            className="w-full"
          >
            {displayNameLoading ? "Updating..." : "Update Display Name"}
          </Button>
        </form>
      </div>

      <Separator />

      {/* Update Password Form */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{passwordSuccess}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500">
              Password must be at least 6 characters.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={passwordLoading}
            className="w-full"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

