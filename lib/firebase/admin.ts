/**
 * Firebase Admin SDK Configuration
 * Used for server-side operations (API routes, server components)
 *
 * The Admin SDK bypasses Firestore security rules using service account credentials.
 * This is the proper way to handle Firebase operations in Next.js API routes.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Initialize Firebase Admin SDK
 * Uses singleton pattern to prevent multiple initializations
 */
function initAdmin() {
  // Check if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Use environment variables for credentials
  // Download service account JSON from Firebase Console → Project Settings → Service Accounts
  // Then extract the values and add to .env.local (or deployment environment variables)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials not configured. " +
      "Please provide FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY " +
      "in your environment variables (.env.local or deployment platform)"
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Replace escaped newlines in private key
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

// Initialize app
const adminApp = initAdmin();

// Export Firestore instance for server-side use
export const adminDb = getFirestore(adminApp);

// Export app for other services if needed
export { adminApp };
