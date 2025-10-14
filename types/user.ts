/**
 * User type definitions
 */

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  color: string; // User's assigned color for avatar and cursor
}

export interface UserSession {
  user: User;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  email: string;
  color: string; // Assigned color for cursor/presence
  lastSeen: number; // Timestamp
  isOnline: boolean;
}

