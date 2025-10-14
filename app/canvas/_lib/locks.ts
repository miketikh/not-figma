/**
 * Canvas object locking utilities
 * Manages lock acquisition, renewal, release, and activity tracking
 */

import * as fabric from "fabric";
import { acquireLock, releaseLock, renewLock } from "@/lib/firebase/firestore";

/**
 * Lock manager for canvas objects
 * Tracks which objects we have locked and their last activity time
 */
export class LockManager {
  private lockedObjects: Set<string> = new Set();
  private lastActivityTime: Map<string, number> = new Map();
  private expirationCheckInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private canvas: fabric.Canvas | null = null;

  constructor(userId: string | null = null, canvas: fabric.Canvas | null = null) {
    this.userId = userId;
    this.canvas = canvas;
  }

  /**
   * Set the user ID for lock operations
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Set the canvas instance (needed for auto-deselection)
   */
  setCanvas(canvas: fabric.Canvas | null) {
    this.canvas = canvas;
  }

  /**
   * Try to acquire a lock on an object
   * @returns true if lock was acquired, false otherwise
   */
  async tryAcquireLock(objectId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      const lockResult = await acquireLock(objectId, this.userId);

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
    if (!this.userId) return;

    try {
      await releaseLock(objectId, this.userId);
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
    if (!this.userId || !this.lockedObjects.has(objectId)) return;

    try {
      const renewed = await renewLock(objectId, this.userId);
      
      if (renewed) {
        // Update last activity time
        this.lastActivityTime.set(objectId, Date.now());
      } else {
        // Lost the lock - remove from tracking
        this.lockedObjects.delete(objectId);
        this.lastActivityTime.delete(objectId);

        // Deselect this object
        this.deselectObject(objectId);
      }
    } catch (error) {
      console.error("Error renewing lock:", error);
    }
  }

  /**
   * Check for expired locks and auto-deselect
   * Called periodically by the expiration checker
   */
  checkLockExpiration(): void {
    if (!this.userId || !this.canvas) return;

    const now = Date.now();
    const expiredObjects: string[] = [];

    // Check each locked object
    this.lastActivityTime.forEach((lastActivity, objectId) => {
      // If last activity was more than 30 seconds ago
      if (now - lastActivity > 30000) {
        expiredObjects.push(objectId);
      }
    });

    // Deselect and release locks for expired objects
    if (expiredObjects.length > 0) {
      this.handleExpiredObjects(expiredObjects);
    }
  }

  /**
   * Handle expired objects by releasing locks and deselecting
   */
  private async handleExpiredObjects(expiredObjectIds: string[]): Promise<void> {
    if (!this.canvas || !this.userId) return;

    const activeObjects = this.canvas.getActiveObjects();
    const objectsToKeep = activeObjects.filter((obj) => {
      const objId = (obj as any).data?.id;
      return !expiredObjectIds.includes(objId);
    });

    // Release locks
    for (const objectId of expiredObjectIds) {
      await releaseLock(objectId, this.userId);
      this.lockedObjects.delete(objectId);
      this.lastActivityTime.delete(objectId);
    }

    // Update selection
    if (objectsToKeep.length === 0) {
      this.canvas.discardActiveObject();
    } else if (objectsToKeep.length < activeObjects.length) {
      // Re-select only the non-expired objects
      this.canvas.discardActiveObject();
      if (objectsToKeep.length === 1) {
        this.canvas.setActiveObject(objectsToKeep[0]);
      } else {
        const selection = new fabric.ActiveSelection(objectsToKeep, {
          canvas: this.canvas,
        });
        this.canvas.setActiveObject(selection);
      }
    }

    this.canvas.requestRenderAll();
  }

  /**
   * Deselect a specific object from the canvas
   */
  private deselectObject(objectId: string): void {
    if (!this.canvas) return;

    const obj = this.canvas.getObjects().find((o) => (o as any).data?.id === objectId);
    
    if (obj && this.canvas.getActiveObjects().includes(obj)) {
      const activeObjects = this.canvas.getActiveObjects();
      const remainingObjects = activeObjects.filter((o) => o !== obj);

      this.canvas.discardActiveObject();
      
      if (remainingObjects.length === 1) {
        this.canvas.setActiveObject(remainingObjects[0]);
      } else if (remainingObjects.length > 1) {
        const selection = new fabric.ActiveSelection(remainingObjects, {
          canvas: this.canvas,
        });
        this.canvas.setActiveObject(selection);
      }
      
      this.canvas.requestRenderAll();
    }
  }

  /**
   * Start checking for expired locks periodically
   * Checks every 5 seconds
   */
  startExpirationChecker(): void {
    if (this.expirationCheckInterval) {
      this.stopExpirationChecker();
    }

    this.expirationCheckInterval = setInterval(() => {
      this.checkLockExpiration();
    }, 5000);
  }

  /**
   * Stop checking for expired locks
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
   * Check if we have a specific object locked
   */
  hasLock(objectId: string): boolean {
    return this.lockedObjects.has(objectId);
  }

  /**
   * Cleanup - release all locks and stop checker
   */
  async cleanup(): Promise<void> {
    this.stopExpirationChecker();
    await this.releaseAllLocks();
  }
}

/**
 * Setup lock renewal event listeners on the canvas
 * Renews locks when user actively manipulates objects
 */
export function setupLockRenewalListeners(
  canvas: fabric.Canvas,
  lockManager: LockManager
): void {
  // Renew lock when user moves object
  canvas.on("object:moving", (e) => {
    const objectId = (e.target as any).data?.id;
    if (objectId) {
      lockManager.renewLockForObject(objectId);
    }
  });

  // Renew lock when user scales object
  canvas.on("object:scaling", (e) => {
    const objectId = (e.target as any).data?.id;
    if (objectId) {
      lockManager.renewLockForObject(objectId);
    }
  });

  // Renew lock when user rotates object
  canvas.on("object:rotating", (e) => {
    const objectId = (e.target as any).data?.id;
    if (objectId) {
      lockManager.renewLockForObject(objectId);
    }
  });
}

