"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { 
  signUp as authSignUp, 
  signIn as authSignIn, 
  signOut as authSignOut, 
  updateUserDisplayName as authUpdateDisplayName,
  updateUserPassword as authUpdatePassword,
  signInWithGoogle as authSignInWithGoogle,
  mapFirebaseUser 
} from "@/lib/firebase/auth";
import { generateUserColor } from "@/lib/firebase/realtime";
import { AuthContextType, User } from "@/types/user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser = mapFirebaseUser(firebaseUser);
        
        // Migration: Ensure existing users have a color assigned
        // This handles users who logged in before the color field was added
        if (!mappedUser.color) {
          mappedUser.color = generateUserColor(firebaseUser.uid);
        }
        
        setUser(mappedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const newUser = await authSignUp(email, password, displayName);
    setUser(newUser);
  };

  const signIn = async (email: string, password: string) => {
    const existingUser = await authSignIn(email, password);
    setUser(existingUser);
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  const updateDisplayName = async (displayName: string) => {
    const updatedUser = await authUpdateDisplayName(displayName);
    setUser(updatedUser);
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    await authUpdatePassword(currentPassword, newPassword);
  };

  const signInWithGoogle = async () => {
    const googleUser = await authSignInWithGoogle();
    setUser(googleUser);
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
    updatePassword,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

