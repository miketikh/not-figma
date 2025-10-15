/**
 * Hook for tracking remote user active transforms
 * Subscribes to real-time transform updates and merges with presence data
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeToActiveTransforms,
  cleanupStaleTransforms,
} from "@/lib/firebase/realtime-transforms";
import { subscribeToPresence } from "@/lib/firebase/realtime";
import type {
  ActiveTransformMap,
  ActiveTransformWithUserMap,
} from "@/app/canvas/_types/active-transform";
import type { UserPresence } from "@/types/user";

const STALE_TRANSFORM_THRESHOLD = 5000; // 5 seconds

export function useActiveTransforms() {
  const { user } = useAuth();
  const [activeTransforms, setActiveTransforms] = useState<ActiveTransformMap>({});
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});

  // Subscribe to presence data (for display names and colors)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPresence((presence) => {
      setPresenceData(presence);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Subscribe to active transforms from other users
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToActiveTransforms((transforms) => {
      setActiveTransforms(transforms);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

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

    return result;
  }, [user, activeTransforms, presenceData])();

  return {
    activeTransformsWithUser,
  };
}
