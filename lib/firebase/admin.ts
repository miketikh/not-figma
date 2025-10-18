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
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    const missingVars = [];
    if (!projectId) missingVars.push("FIREBASE_ADMIN_PROJECT_ID");
    if (!clientEmail) missingVars.push("FIREBASE_ADMIN_CLIENT_EMAIL");
    if (!privateKey) missingVars.push("FIREBASE_ADMIN_PRIVATE_KEY");

    throw new Error(
      `Missing Firebase Admin credentials, check that all are specified in the .env.local file`
    );
  }

  // Handle different private key formats that might come from Vercel
  // The key might be:
  // 1. Already properly formatted (local .env.local)
  // 2. With literal \n that need to be converted (Vercel environment variables)
  // 3. With actual newlines (some platforms)
  // 4. Wrapped in quotes that need to be removed

  // Remove outer quotes if present (Vercel sometimes adds them)
  privateKey = privateKey.trim();
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }

  // Replace literal \n with actual newlines
  // This is the most common issue in Vercel deployments
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    // Provide more helpful error message
    console.error("Firebase Admin initialization failed:", error);
    throw new Error(
      `Failed to initialize Firebase Admin SDK: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      `Check that firebase admin private key properly pasted in the .env.local file`
    );
  }
}

// Initialize app
const adminApp = initAdmin();

// Export Firestore instance for server-side use
export const adminDb = getFirestore(adminApp);

// Export app for other services if needed
export { adminApp };
