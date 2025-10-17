/**
 * Migration Script: Migrate Flat Canvas Objects to Multi-Canvas Structure
 *
 * This script migrates existing canvas objects from the old flat `canvasObjects`
 * collection to the new nested structure: `canvases/{canvasId}/objects/{objectId}`
 *
 * For each user, it creates a "Default Canvas" and moves all their objects into it.
 *
 * IMPORTANT:
 * - Run with --dry-run flag first to preview changes
 * - Does NOT delete old data (kept for 7-day rollback period)
 * - Uses batch writes for data integrity
 * - Adds canvasId field to all migrated objects
 *
 * Usage:
 *   npm run migrate        # Run migration (requires confirmation)
 *   npm run migrate --dry-run    # Preview changes without writing
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";

// ============================================================================
// Configuration
// ============================================================================

const OLD_COLLECTION = "canvasObjects";
const NEW_COLLECTION_ROOT = "canvases";
const DEFAULT_CANVAS_ID = "default-canvas-shared"; // Single shared canvas for all users
const DEFAULT_CANVAS_NAME = "Default Canvas";
const DEFAULT_CANVAS_WIDTH = 1920;
const DEFAULT_CANVAS_HEIGHT = 1080;

// Firebase configuration (from environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// ============================================================================
// Types
// ============================================================================

interface MigrationStats {
  totalObjects: number;
  uniqueUsers: number;
  canvasCreated: boolean;
  objectsMigrated: number;
  errors: Array<{ objectId?: string; error: string }>;
}

interface CanvasObject {
  id: string;
  createdBy: string;
  [key: string]: any;
}

interface Canvas {
  id: string;
  name: string;
  width: number;
  height: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Initialize Firebase (if not already initialized)
 */
function initializeFirebase() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

/**
 * Get unique users from objects
 */
function getUniqueUsers(objects: CanvasObject[]): Set<string> {
  const users = new Set<string>();
  for (const obj of objects) {
    if (obj.createdBy) {
      users.add(obj.createdBy);
    }
  }
  return users;
}

/**
 * Log with timestamp
 */
function log(message: string, level: "info" | "warn" | "error" | "success" = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ",
    warn: "⚠",
    error: "✗",
    success: "✓",
  }[level];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Confirm action with user
 */
async function confirm(message: string): Promise<boolean> {
  if (process.argv.includes("--dry-run")) {
    return true; // Skip confirmation in dry-run mode
  }

  // Dynamic import for readline
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Fetch all objects from the old flat collection
 */
async function fetchOldObjects(db: any): Promise<CanvasObject[]> {
  log(`Fetching objects from "${OLD_COLLECTION}" collection...`);

  try {
    const objectsRef = collection(db, OLD_COLLECTION);
    const q = query(objectsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const objects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CanvasObject[];

    log(`Found ${objects.length} objects`, "success");
    return objects;
  } catch (error: any) {
    log(`Error fetching old objects: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Count objects by user for informational purposes
 */
function countObjectsByUser(objects: CanvasObject[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const obj of objects) {
    const userId = obj.createdBy || "unknown";
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return counts;
}

/**
 * Create a single shared default canvas for all users
 */
async function createSharedDefaultCanvas(
  db: any,
  firstUserId: string,
  userCount: number,
  dryRun: boolean
): Promise<Canvas> {
  const now = Date.now();

  const canvas: Canvas = {
    id: DEFAULT_CANVAS_ID,
    name: DEFAULT_CANVAS_NAME,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    createdBy: firstUserId, // Use first user as nominal owner
    createdAt: now,
    updatedAt: now,
    isPublic: true, // Make it public so all users can access it
  };

  if (dryRun) {
    log(`[DRY RUN] Would create shared canvas: ${DEFAULT_CANVAS_ID}`);
    log(`[DRY RUN]   Name: "${DEFAULT_CANVAS_NAME}"`);
    log(`[DRY RUN]   Dimensions: ${DEFAULT_CANVAS_WIDTH}×${DEFAULT_CANVAS_HEIGHT}`);
    log(`[DRY RUN]   Public: true (accessible to all ${userCount} users)`);
    return canvas;
  }

  // Check if canvas already exists
  const canvasRef = doc(db, NEW_COLLECTION_ROOT, DEFAULT_CANVAS_ID);
  const canvasSnap = await getDoc(canvasRef);

  if (canvasSnap.exists()) {
    log(`Canvas ${DEFAULT_CANVAS_ID} already exists, skipping creation`, "warn");
    return canvasSnap.data() as Canvas;
  }

  // Create the canvas
  await setDoc(canvasRef, canvas);
  log(`Created shared canvas: ${DEFAULT_CANVAS_ID}`, "success");
  log(`  All ${userCount} users will have access to this canvas`);

  return canvas;
}

/**
 * Migrate all objects to the shared default canvas
 */
async function migrateAllObjects(
  db: any,
  objects: CanvasObject[],
  dryRun: boolean
): Promise<{ migrated: number; errors: number }> {
  log(`\nMigrating ${objects.length} objects to shared canvas...`);

  let migratedCount = 0;
  let errorCount = 0;

  // Process in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500;
  const batches = Math.ceil(objects.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min((i + 1) * BATCH_SIZE, objects.length);
    const batchObjects = objects.slice(start, end);

    log(`  Processing batch ${i + 1}/${batches} (${batchObjects.length} objects)...`);

    if (dryRun) {
      log(`  [DRY RUN] Would migrate objects ${start} to ${end - 1} to ${DEFAULT_CANVAS_ID}`);
      migratedCount += batchObjects.length;
      continue;
    }

    const batch = writeBatch(db);

    for (const obj of batchObjects) {
      try {
        // Add canvasId to the object
        const migratedObject = {
          ...obj,
          canvasId: DEFAULT_CANVAS_ID,
        };

        // Create reference in new nested collection
        const newObjectRef = doc(db, NEW_COLLECTION_ROOT, DEFAULT_CANVAS_ID, "objects", obj.id);
        batch.set(newObjectRef, migratedObject);

        migratedCount++;
      } catch (error: any) {
        log(`  Error preparing object ${obj.id}: ${error.message}`, "error");
        errorCount++;
      }
    }

    try {
      await batch.commit();
      log(`  Batch ${i + 1}/${batches} committed successfully`, "success");
    } catch (error: any) {
      log(`  Error committing batch ${i + 1}: ${error.message}`, "error");
      errorCount += batchObjects.length;
      migratedCount -= batchObjects.length;
    }
  }

  return { migrated: migratedCount, errors: errorCount };
}

/**
 * Run the migration
 */
async function runMigration(dryRun: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalObjects: 0,
    uniqueUsers: 0,
    canvasCreated: false,
    objectsMigrated: 0,
    errors: [],
  };

  log("\n" + "=".repeat(80));
  log(`Starting migration ${dryRun ? "(DRY RUN)" : ""}`);
  log("=".repeat(80) + "\n");

  // Initialize Firebase
  const app = initializeFirebase();
  const db = getFirestore(app);

  // Step 1: Fetch all objects from old collection
  const oldObjects = await fetchOldObjects(db);
  stats.totalObjects = oldObjects.length;

  if (oldObjects.length === 0) {
    log("No objects found to migrate", "warn");
    return stats;
  }

  // Step 2: Get unique users (for informational purposes)
  const uniqueUsers = getUniqueUsers(oldObjects);
  stats.uniqueUsers = uniqueUsers.size;

  log(`Found ${uniqueUsers.size} unique users who created objects`, "success");

  // Show object breakdown by user
  const objectCounts = countObjectsByUser(oldObjects);
  log("\nObject breakdown by user:");
  for (const [userId, count] of objectCounts.entries()) {
    log(`  ${userId}: ${count} objects`);
  }
  log("");

  // Step 3: Create ONE shared default canvas
  try {
    const firstUserId = Array.from(uniqueUsers)[0] || "unknown";
    await createSharedDefaultCanvas(db, firstUserId, uniqueUsers.size, dryRun);
    stats.canvasCreated = true;
  } catch (error: any) {
    log(`Error creating shared canvas: ${error.message}`, "error");
    stats.errors.push({
      error: `Failed to create shared canvas: ${error.message}`,
    });
    return stats;
  }

  // Step 4: Migrate ALL objects to the shared canvas
  try {
    const { migrated, errors } = await migrateAllObjects(db, oldObjects, dryRun);
    stats.objectsMigrated = migrated;

    if (errors > 0) {
      stats.errors.push({
        error: `${errors} objects failed to migrate`,
      });
    }
  } catch (error: any) {
    log(`Error migrating objects: ${error.message}`, "error");
    stats.errors.push({
      error: error.message,
    });
  }

  return stats;
}

/**
 * Print migration summary
 */
function printSummary(stats: MigrationStats, dryRun: boolean) {
  log("\n" + "=".repeat(80));
  log(`Migration ${dryRun ? "Preview" : "Complete"}`);
  log("=".repeat(80));
  log(`Total objects in old collection: ${stats.totalObjects}`);
  log(`Unique users found: ${stats.uniqueUsers}`);
  log(`Shared canvas ${dryRun ? "to be created" : "created"}: ${stats.canvasCreated ? 1 : 0}`);
  log(`  Canvas ID: ${DEFAULT_CANVAS_ID}`);
  log(`  Name: "${DEFAULT_CANVAS_NAME}"`);
  log(`  Public: true (all users have access)`);
  log(`Objects ${dryRun ? "to be migrated" : "migrated"}: ${stats.objectsMigrated}`);
  log(`Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    log("\nErrors encountered:", "error");
    stats.errors.forEach((err) => {
      log(`  - ${err.error}`, "error");
    });
  }

  if (dryRun) {
    log("\nThis was a DRY RUN. No data was written to Firestore.", "warn");
    log("Run without --dry-run flag to execute the migration.");
  } else {
    log("\n✓ Migration complete!", "success");
    log(`All ${stats.objectsMigrated} objects have been copied to the shared canvas.`, "success");
    log("\nOld data remains in the canvasObjects collection.", "info");
    log("Keep it for 7 days as backup before manually deleting.", "info");
    log(`\nYou can now access the canvas at: /canvas/${DEFAULT_CANVAS_ID}`, "info");
  }

  log("=".repeat(80) + "\n");
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    log("Error: Firebase environment variables not found", "error");
    log("Make sure .env.local is properly configured", "error");
    process.exit(1);
  }

  log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

  if (!isDryRun) {
    log("\n⚠️  WARNING: This will migrate data to the new structure ⚠️", "warn");
    log("Old data will remain in the canvasObjects collection for safety.", "warn");
    log("Run with --dry-run flag first to preview changes.\n", "warn");

    const confirmed = await confirm("Do you want to proceed with the migration?");
    if (!confirmed) {
      log("Migration cancelled by user", "warn");
      process.exit(0);
    }
  }

  try {
    const stats = await runMigration(isDryRun);
    printSummary(stats, isDryRun);

    // Exit with error code if there were errors
    if (stats.errors.length > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    log(`Fatal error: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

// Export functions for testing
export { runMigration, MigrationStats };

// Run if executed directly (check if this is the main module)
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
