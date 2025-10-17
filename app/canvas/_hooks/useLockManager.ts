import { useRef, useEffect } from "react";
import { LockManager } from "../_lib/locks";

interface UseLockManagerParams {
  canvasId: string;
  userId: string | null;
  selectedIds: string[];
  onLockExpired?: (expiredObjectIds: string[]) => void;
}

/**
 * Manages distributed lock lifecycle for canvas objects
 * - Auto-acquires locks when objects are selected
 * - Auto-releases locks when objects are deselected
 * - Handles lock expiration with cleanup callback
 */
export function useLockManager({
  canvasId,
  userId,
  selectedIds,
  onLockExpired,
}: UseLockManagerParams) {
  // Create lock manager with expiration callback
  const lockManagerRef = useRef<LockManager>(
    new LockManager(null, null, onLockExpired)
  );

  // Initialize lock manager on mount
  useEffect(() => {
    lockManagerRef.current.setUserId(userId);
    lockManagerRef.current.setCanvasId(canvasId);
    lockManagerRef.current.startExpirationChecker();

    return () => {
      // Cleanup on unmount (releases all locks and stops checker)
      lockManagerRef.current.cleanup();
    };
  }, [canvasId, userId]);

  // Handle lock acquisition/release on selection changes
  useEffect(() => {
    const lockManager = lockManagerRef.current;
    if (!lockManager) return;

    // Get previously selected IDs (from the Set of locked objects)
    const currentlyLocked = new Set(lockManager.getLockedObjects());
    const newlySelected = new Set(selectedIds);

    // Release locks on deselected objects
    currentlyLocked.forEach((id) => {
      if (!newlySelected.has(id)) {
        lockManager.releaseLock(id);
      }
    });

    // Acquire locks on newly selected objects
    selectedIds.forEach((id) => {
      if (!currentlyLocked.has(id)) {
        lockManager.tryAcquireLock(id);
      }
    });
  }, [selectedIds]);

  return lockManagerRef.current;
}
