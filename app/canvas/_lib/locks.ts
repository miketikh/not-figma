/**
 * Canvas object locking utilities
 * Manages lock acquisition, renewal, release, and activity tracking
 */

import { acquireLock, releaseLock, renewLock } from "@/lib/firebase/firestore";
import { LOCK_TIMEOUT_MS, LOCK_CHECK_INTERVAL_MS } from "@/lib/constants/locks";

/**
 * Check if an object is locked by another user
 * @param lockedBy - User ID who owns the lock
 * @param lockedAt - Timestamp when lock was acquired
 * @param lockTimeout - Lock timeout duration in ms
 * @param currentUserId - Current user's ID
 * @returns true if locked by another user with active lock
 */
export function isLockedByOtherUser(
  lockedBy: string | null,
  lockedAt: number | null,
  lockTimeout: number,
  currentUserId: string | null
): boolean {
  if (!lockedBy || !lockedAt || !currentUserId) return false;
  if (lockedBy === currentUserId) return false;

  const isExpired = Date.now() - lockedAt > lockTimeout;
  return !isExpired;
}

/**
 * Lock manager for canvas objects
 * Tracks which objects we have locked and their last activity time
 */
export class LockManager {
  private lockedObjects: Set<string> = new Set();
  private lastActivityTime: Map<string, number> = new Map();
  private expirationCheckInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private canvasId: string | null = null;
  private onLockExpired?: (objectIds: string[]) => void;

  constructor(
    userId: string | null = null,
    canvasId: string | null = null,
    onLockExpired?: (objectIds: string[]) => void
  ) {
    this.userId = userId;
    this.canvasId = canvasId;
    this.onLockExpired = onLockExpired;
  }

  /**
   * Set the user ID for lock operations
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Set the canvas ID for lock operations
   */
  setCanvasId(canvasId: string | null) {
    this.canvasId = canvasId;
  }

  /**
   * Try to acquire a lock on an object
   * @returns true if lock was acquired, false otherwise
   */
  async tryAcquireLock(objectId: string): Promise<boolean> {
    if (!this.userId || !this.canvasId) return false;

    try {
      const lockResult = await acquireLock(
        this.canvasId,
        objectId,
        this.userId
      );

      if (lockResult.success) {
        this.lockedObjects.add(objectId);
        this.lastActivityTime.set(objectId, Date.now());
        return true;
      } else {
        console.log(`Object locked by another user: ${lockResult.lockedBy}`);
        return false;
      }
    } catch (error) {
      console.error("Error acquiring lock:", error);
      return false;
    }
  }

  /**
   * Release a specific lock
   */
  async releaseLock(objectId: string): Promise<void> {
    if (!this.userId || !this.canvasId) return;

    try {
      await releaseLock(this.canvasId, objectId, this.userId);
      this.lockedObjects.delete(objectId);
      this.lastActivityTime.delete(objectId);
    } catch (error) {
      console.error("Error releasing lock:", error);
    }
  }

  /**
   * Release all locks
   */
  async releaseAllLocks(): Promise<void> {
    if (!this.userId) return;

    const lockedObjectsList = Array.from(this.lockedObjects);
    for (const objectId of lockedObjectsList) {
      await this.releaseLock(objectId);
    }
  }

  /**
   * Renew lock for an object (called on user interaction)
   */
  async renewLockForObject(objectId: string): Promise<void> {
    if (!this.userId || !this.canvasId || !this.lockedObjects.has(objectId))
      return;

    try {
      const renewed = await renewLock(this.canvasId, objectId, this.userId);

      if (renewed) {
        // Update last activity time
        this.lastActivityTime.set(objectId, Date.now());
      } else {
        // Lock was lost (expired or taken by another user)
        this.lockedObjects.delete(objectId);
        this.lastActivityTime.delete(objectId);
      }
    } catch (error) {
      console.error("Error renewing lock:", error);
    }
  }

  /**
   * Start checking for expired locks periodically
   * Checks every 5 seconds
   */
  startExpirationChecker(): void {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
    }

    this.expirationCheckInterval = setInterval(() => {
      this.checkLockExpiration();
    }, LOCK_CHECK_INTERVAL_MS);
  }

  /**
   * Check for expired locks and release them
   * Called periodically by the expiration checker
   */
  private checkLockExpiration(): void {
    if (!this.userId) return;

    const now = Date.now();
    const expiredObjects: string[] = [];

    // Check each locked object
    this.lastActivityTime.forEach((lastActivity, objectId) => {
      // If last activity was more than the lock timeout
      if (now - lastActivity > LOCK_TIMEOUT_MS) {
        expiredObjects.push(objectId);
      }
    });

    // Notify callback before releasing locks (for deselection)
    if (expiredObjects.length > 0 && this.onLockExpired) {
      this.onLockExpired(expiredObjects);
    }

    // Release locks for expired objects
    expiredObjects.forEach((objectId) => {
      this.releaseLock(objectId);
    });
  }

  /**
   * Stop the expiration checker
   */
  stopExpirationChecker(): void {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
      this.expirationCheckInterval = null;
    }
  }

  /**
   * Get all currently locked object IDs
   */
  getLockedObjects(): Set<string> {
    return new Set(this.lockedObjects);
  }

  /**
   * Cleanup - release all locks and stop checker
   */
  async cleanup(): Promise<void> {
    this.stopExpirationChecker();
    await this.releaseAllLocks();
  }
}
