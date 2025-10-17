/**
 * Firebase Authentication helper functions
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./config";
import { User } from "@/types/user";
import { generateUserColor } from "./realtime";

/**
 * Convert Firebase User to our User type
 */
export function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    lastLoginAt:
      firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
    color: generateUserColor(firebaseUser.uid), // Deterministic color based on user ID
  };
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Update display name if provided
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
    // Reload to get updated user data
    await userCredential.user.reload();
  }

  return mapFirebaseUser(userCredential.user);
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return mapFirebaseUser(userCredential.user);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Update the current user's display name
 */
export async function updateUserDisplayName(
  displayName: string
): Promise<User> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No user is currently signed in");
  }

  await updateProfile(currentUser, { displayName });
  await currentUser.reload();

  return mapFirebaseUser(currentUser);
}

/**
 * Update the current user's password
 * Requires reauthentication for security
 */
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error("No user is currently signed in");
  }

  // Reauthenticate user before password change (Firebase best practice)
  const credential = EmailAuthProvider.credential(
    currentUser.email,
    currentPassword
  );
  await reauthenticateWithCredential(currentUser, credential);

  // Update password after successful reauthentication
  await updatePassword(currentUser, newPassword);
}

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  // Optional: Add scopes if you need additional permissions
  // provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

  const userCredential = await signInWithPopup(auth, provider);
  return mapFirebaseUser(userCredential.user);
}
