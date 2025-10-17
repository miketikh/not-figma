import { useRef, useCallback, useEffect } from "react";
import type { PersistedShape } from "../_types/shapes";
import type { LockManager } from "../_lib/locks";

interface UseDebouncedPropertyUpdateParams {
  objects: PersistedShape[];
  setObjects: (fn: (prev: PersistedShape[]) => PersistedShape[]) => void;
  updateObjectInFirestore: (obj: PersistedShape) => void;
  lockManager: LockManager;
  debounceMs?: number;
}

/**
 * Provides debounced property updates for the properties panel
 * - Optimistic local updates (immediate)
 * - Debounced Firestore writes (configurable delay, default 300ms)
 * - Auto-renews locks on update
 */
export function useDebouncedPropertyUpdate({
  objects,
  setObjects,
  updateObjectInFirestore,
  lockManager,
  debounceMs = 300,
}: UseDebouncedPropertyUpdateParams) {
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const updateProperty = useCallback(
    (objectId: string, updates: Partial<PersistedShape>) => {
      const obj = objects.find((o) => o.id === objectId);
      if (!obj) return;

      const updatedObj = { ...obj, ...updates } as PersistedShape;

      // Optimistic update to local state (immediate)
      setObjects((prev) =>
        prev.map((o) => (o.id === objectId ? updatedObj : o))
      );

      // Clear existing timer for this object
      const existingTimer = debounceTimers.current.get(objectId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Debounce Firestore writes
      const timer = setTimeout(() => {
        updateObjectInFirestore(updatedObj);
        // Renew lock
        lockManager.renewLockForObject(objectId);
        debounceTimers.current.delete(objectId);
      }, debounceMs);

      debounceTimers.current.set(objectId, timer);
    },
    [objects, setObjects, updateObjectInFirestore, lockManager, debounceMs]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  return { updateProperty };
}
