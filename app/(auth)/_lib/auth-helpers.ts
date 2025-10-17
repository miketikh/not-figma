/**
 * Auth-specific helper functions
 * Includes Firebase error code mapping
 */

import { FirebaseError } from "firebase/app";

/**
 * Map Firebase auth error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorCode = error.code;

  switch (errorCode) {
    // Sign in errors
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password. Please try again.";

    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";

    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again later.";

    // Sign up errors
    case "auth/email-already-in-use":
      return "An account with this email already exists.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled. Please contact support.";

    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";

    // Network errors
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";

    case "auth/timeout":
      return "Request timed out. Please try again.";

    // General errors
    case "auth/invalid-api-key":
    case "auth/app-deleted":
    case "auth/app-not-authorized":
      return "Configuration error. Please contact support.";

    case "auth/requires-recent-login":
      return "For security, please sign out and sign in again to complete this action.";

    case "auth/wrong-password":
      return "Incorrect password. Please try again.";

    default:
      // Log unknown errors for debugging
      console.error("Unhandled auth error:", errorCode, error);
      return "An error occurred. Please try again.";
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return "Email is required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  // Optional: Add more strength requirements
  // if (!/[A-Z]/.test(password)) {
  //   return "Password must contain at least one uppercase letter";
  // }

  return null;
}

/**
 * Validate display name
 */
export function validateDisplayName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Display name is required";
  }

  if (name.trim().length < 2) {
    return "Display name must be at least 2 characters";
  }

  return null;
}
