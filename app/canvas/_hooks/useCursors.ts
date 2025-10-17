/**
 * Hook for tracking remote user cursors
 * Konva version - works with Stage instead of Fabric Canvas
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Konva from "konva";
import {
  updateCursorPosition,
  removeCursor,
  subscribeToCursors,
  subscribeToPresence,
  setUserPresence,
  updatePresenceHeartbeat,
  generateDisplayName,
  isUserActive,
} from "@/lib/firebase/realtime";
import { CursorMap } from "@/types/canvas";
import { UserPresence } from "@/types/user";
import { screenToCanvasCoordinates } from "../_lib/coordinates";

interface UseCursorsProps {
  canvasId: string;
  stageRef: React.RefObject<Konva.Stage | null>;
  isReady: boolean;
}

interface CursorData {
  x: number;
  y: number;
  displayName: string;
  color: string;
}

export function useCursors({ canvasId, stageRef, isReady }: UseCursorsProps) {
  const { user } = useAuth();
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorData>>({});
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set user presence in Realtime Database and maintain heartbeat
  useEffect(() => {
    if (!user) return;

    // Use auth display name or generate a random one
    const displayName = user.displayName || generateDisplayName();

    // Set initial user presence
    setUserPresence(
      canvasId,
      user.uid,
      displayName,
      user.email || "",
      user.color // Use color from user profile
    );

    // Set up heartbeat to update lastSeen every 30 seconds
    const heartbeatInterval = setInterval(() => {
      updatePresenceHeartbeat(canvasId, user.uid);
    }, 30000); // 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [canvasId, user]);

  // Subscribe to presence data (for display names and colors)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPresence(canvasId, (presence) => {
      setPresenceData(presence);
    });

    return () => {
      unsubscribe();
    };
  }, [canvasId, user]);

  // Track local cursor position and broadcast to Realtime Database
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage || !user) return;

      // Throttle cursor updates (every 50ms)
      if (throttleTimerRef.current) return;

      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
      }, 50);

      // Get pointer position and convert to canvas coordinates
      const containerRect = stage.container().getBoundingClientRect();
      const pointerX = e.clientX - containerRect.left;
      const pointerY = e.clientY - containerRect.top;

      const canvasPoint = screenToCanvasCoordinates(stage, { x: pointerX, y: pointerY });
      if (!canvasPoint) return;

      // Update cursor position in Realtime Database
      updateCursorPosition(canvasId, user.uid, canvasPoint.x, canvasPoint.y);

      // Update presence heartbeat on activity (debounced via throttle)
      updatePresenceHeartbeat(canvasId, user.uid);
    },
    [canvasId, user, stageRef]
  );

  // Attach mouse move listener to stage
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !isReady || !user) return;

    const container = stage.container();
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [stageRef, isReady, user, handleMouseMove]);

  // Subscribe to cursor updates from other users
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCursors(canvasId, (cursors: CursorMap) => {
      // Filter out own cursor and merge with presence data
      const remoteCursorData: Record<string, CursorData> = {};

      Object.entries(cursors).forEach(([userId, cursor]) => {
        if (userId !== user.uid && cursor) {
          const presence = presenceData[userId];

          // Only show cursor if user is online and active (same logic as OnlineUsers)
          if (presence?.isOnline && isUserActive(presence.lastSeen)) {
            remoteCursorData[userId] = {
              x: cursor.x,
              y: cursor.y,
              displayName: presence.displayName || "Anonymous",
              color: presence.color || "#888888",
            };
          }
        }
      });

      setRemoteCursors(remoteCursorData);
    });

    return () => {
      unsubscribe();
    };
  }, [canvasId, user, presenceData]);

  // Cleanup on unmount
  useEffect(() => {
    if (!user) return;

    return () => {
      removeCursor(canvasId, user.uid);
    };
  }, [canvasId, user]);

  return {
    remoteCursors,
  };
}
