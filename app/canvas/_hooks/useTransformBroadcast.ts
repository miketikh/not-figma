import { useRef, useCallback, useEffect } from "react";
import type { User } from "@/types/user";
import type { PersistedShape } from "../_types/shapes";
import type { ObjectTransformData } from "../_types/active-transform";
import {
  broadcastTransform,
  clearTransform,
  broadcastGroupTransform,
  clearGroupTransform,
} from "@/lib/firebase/realtime-transforms";

interface UseTransformBroadcastParams {
  canvasId: string;
  user: User | null;
  objects: PersistedShape[];
  selectedIds: string[];
}

/**
 * Manages real-time transform broadcasting with throttling
 * - Single selection: Per-object throttling (50ms)
 * - Multi selection: Group throttling (50ms shared)
 */
export function useTransformBroadcast({
  canvasId,
  user,
  objects,
  selectedIds,
}: UseTransformBroadcastParams) {
  // Throttled transform broadcasting (50ms per object)
  const broadcastThrottleTimers = useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );

  // Group transform broadcasting (shared throttle for multi-select)
  const groupTransformThrottleTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingGroupTransforms = useRef<Record<string, ObjectTransformData>>(
    {}
  );

  const broadcastTransformMove = useCallback(
    (objectId: string, updates: Partial<PersistedShape>) => {
      // Only broadcast if user has this object locked
      const obj = objects.find((o) => o.id === objectId);
      if (!obj || !user) return;
      if (obj.lockedBy !== user.uid) return;

      // Prepare transform data for this object
      const transformData: ObjectTransformData = {
        type: obj.type,
        x: updates.x ?? obj.x,
        y: updates.y ?? obj.y,
      };

      // Add shape-specific properties using type narrowing
      if (obj.type === "rectangle" && "width" in obj) {
        transformData.width = (updates as any).width ?? obj.width;
        transformData.height = (updates as any).height ?? obj.height;
        transformData.rotation = (updates as any).rotation ?? obj.rotation;
      } else if (obj.type === "circle" && "radiusX" in obj) {
        transformData.radiusX = (updates as any).radiusX ?? obj.radiusX;
        transformData.radiusY = (updates as any).radiusY ?? obj.radiusY;
      } else if (obj.type === "line" && "x2" in obj) {
        transformData.x2 = (updates as any).x2 ?? obj.x2;
        transformData.y2 = (updates as any).y2 ?? obj.y2;
      } else if (obj.type === "text" && "width" in obj) {
        transformData.width = (updates as any).width ?? obj.width;
        transformData.height = (updates as any).height ?? obj.height;
        transformData.rotation = (updates as any).rotation ?? obj.rotation;
      }

      // Multi-select: Use group transform broadcasting (shared 50ms throttle)
      if (selectedIds.length > 1) {
        // Accumulate transforms for all selected objects
        pendingGroupTransforms.current[objectId] = transformData;

        // If throttle already active, just accumulate and return
        if (groupTransformThrottleTimer.current) return;

        // Set up shared throttle timer for the entire group
        groupTransformThrottleTimer.current = setTimeout(() => {
          // Broadcast all accumulated transforms as a single group
          const transforms = { ...pendingGroupTransforms.current };
          broadcastGroupTransform(canvasId, selectedIds, user.uid, transforms);

          // Clear accumulated transforms and timer
          pendingGroupTransforms.current = {};
          groupTransformThrottleTimer.current = null;
        }, 50);
      } else {
        // Single selection: Use per-object broadcasting (existing behavior)
        // Throttle broadcasts (50ms per object)
        if (broadcastThrottleTimers.current.has(objectId)) return;

        const timer = setTimeout(() => {
          broadcastThrottleTimers.current.delete(objectId);
        }, 50);

        broadcastThrottleTimers.current.set(objectId, timer);

        // Broadcast to Realtime Database
        broadcastTransform(canvasId, objectId, user.uid, transformData);
      }
    },
    [objects, user, selectedIds, canvasId]
  );

  const clearTransformBroadcast = useCallback(
    (objectId: string) => {
      if (!user) return;

      // Multi-select: Clear group transform
      if (selectedIds.length > 1) {
        clearGroupTransform(canvasId, user.uid);
        // Clear any pending group transforms
        pendingGroupTransforms.current = {};
        if (groupTransformThrottleTimer.current) {
          clearTimeout(groupTransformThrottleTimer.current);
          groupTransformThrottleTimer.current = null;
        }
      } else {
        // Single selection: Clear individual transform
        clearTransform(canvasId, objectId);
      }
    },
    [user, selectedIds, canvasId]
  );

  // Cleanup throttle timers on unmount
  useEffect(() => {
    return () => {
      broadcastThrottleTimers.current.forEach((timer) => clearTimeout(timer));
      broadcastThrottleTimers.current.clear();

      // Cleanup group transform timer
      if (groupTransformThrottleTimer.current) {
        clearTimeout(groupTransformThrottleTimer.current);
        groupTransformThrottleTimer.current = null;
      }
    };
  }, []);

  return {
    broadcastTransformMove,
    clearTransformBroadcast,
  };
}
