/**
 * Hook for tracking remote user active transforms
 * Subscribes to real-time transform updates and merges with presence data
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeToActiveTransforms,
  subscribeToGroupTransforms,
  cleanupStaleTransforms,
} from "@/lib/firebase/realtime-transforms";
import { subscribeToPresence } from "@/lib/firebase/realtime";
import type {
  ActiveTransformMap,
  ActiveTransformWithUserMap,
  GroupActiveTransform,
  ActiveTransform,
} from "@/app/canvas/_types/active-transform";
import type { UserPresence } from "@/types/user";

const STALE_TRANSFORM_THRESHOLD = 5000; // 5 seconds

export function useActiveTransforms(canvasId: string) {
  const { user } = useAuth();
  const [activeTransforms, setActiveTransforms] = useState<ActiveTransformMap>({});
  const [groupTransforms, setGroupTransforms] = useState<Record<string, GroupActiveTransform>>({});
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});

  // Subscribe to presence data (for display names and colors)
  useEffect(() => {
    if (!user || !canvasId) return;

    const unsubscribe = subscribeToPresence(canvasId, (presence) => {
      setPresenceData(presence);
    });

    return () => {
      unsubscribe();
    };
  }, [user, canvasId]);

  // Subscribe to active transforms from other users
  useEffect(() => {
    if (!user || !canvasId) return;

    const unsubscribe = subscribeToActiveTransforms(canvasId, (transforms) => {
      setActiveTransforms(transforms);
    });

    return () => {
      unsubscribe();
    };
  }, [user, canvasId]);

  // Subscribe to group transforms from other users
  useEffect(() => {
    if (!user || !canvasId) return;

    const unsubscribe = subscribeToGroupTransforms(canvasId, (transforms) => {
      setGroupTransforms(transforms);
    });

    return () => {
      unsubscribe();
    };
  }, [user, canvasId]);

  // Periodic cleanup of stale transforms
  useEffect(() => {
    if (!user || Object.keys(activeTransforms).length === 0) return;

    const cleanupInterval = setInterval(() => {
      cleanupStaleTransforms(activeTransforms, STALE_TRANSFORM_THRESHOLD);
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [user, activeTransforms]);

  // Merge transforms with presence data and filter out current user
  const activeTransformsWithUser: ActiveTransformWithUserMap = useCallback(() => {
    if (!user) return {};

    const result: ActiveTransformWithUserMap = {};

    // Process individual transforms (single-select)
    Object.entries(activeTransforms).forEach(([objectId, transform]) => {
      // Filter out own user's transforms
      if (transform.userId === user.uid) return;

      // Filter out stale transforms
      const age = Date.now() - transform.timestamp;
      if (age > STALE_TRANSFORM_THRESHOLD) return;

      // Get user presence data
      const presence = presenceData[transform.userId];

      // Merge transform with user info
      result[objectId] = {
        ...transform,
        displayName: presence?.displayName || "Anonymous",
        color: presence?.color || "#888888",
      };
    });

    // Process group transforms (multi-select)
    // Expand each group transform into individual object overlays
    Object.entries(groupTransforms).forEach(([userId, groupTransform]) => {
      // Filter out own user's group transforms
      if (userId === user.uid) return;

      // Filter out stale transforms
      const age = Date.now() - groupTransform.timestamp;
      if (age > STALE_TRANSFORM_THRESHOLD) return;

      // Get user presence data
      const presence = presenceData[userId];
      const displayName = presence?.displayName || "Anonymous";
      const color = presence?.color || "#888888";

      // Expand group transform to individual objects
      Object.entries(groupTransform.transforms).forEach(([objectId, transformData]) => {
        // Create an ActiveTransform for each object in the group
        const expandedTransform: ActiveTransform = {
          userId,
          objectId,
          timestamp: groupTransform.timestamp,
          ...transformData,
        } as ActiveTransform;

        // Add to result with user info
        result[objectId] = {
          ...expandedTransform,
          displayName,
          color,
        };
      });
    });

    return result;
  }, [user, activeTransforms, groupTransforms, presenceData])();

  return {
    activeTransformsWithUser,
  };
}
