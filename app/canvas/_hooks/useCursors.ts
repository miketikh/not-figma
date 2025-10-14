/**
 * Hook for tracking remote user cursors
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  updateCursorPosition,
  removeCursor,
  subscribeToCursors,
  subscribeToPresence,
  setUserPresence,
  generateUserColor,
  generateDisplayName,
} from "@/lib/firebase/realtime";
import { CursorMap } from "@/types/canvas";
import { UserPresence } from "@/types/user";
import * as fabric from "fabric";

interface UseCursorsProps {
  canvas: fabric.Canvas | null;
  isReady: boolean;
}

interface CursorData {
  x: number;
  y: number;
  displayName: string;
  color: string;
}

export function useCursors({ canvas, isReady }: UseCursorsProps) {
  const { user } = useAuth();
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorData>>({});
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userColorRef = useRef<string | null>(null);
  const displayNameRef = useRef<string | null>(null);

  // Initialize user color and display name
  useEffect(() => {
    if (!user) return;

    // Generate or use existing color (deterministic based on userId)
    if (!userColorRef.current) {
      userColorRef.current = generateUserColor(user.uid);
    }

    // Use auth display name or generate a random one
    if (!displayNameRef.current) {
      displayNameRef.current = user.displayName || generateDisplayName();
    }

    // Set user presence in Realtime Database
    setUserPresence(
      user.uid,
      displayNameRef.current,
      user.email || "",
      userColorRef.current
    );
  }, [user]);

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

  // Track local cursor position and broadcast to Realtime Database
  const handleMouseMove = useCallback(
    (e: fabric.TPointerEventInfo) => {
      if (!canvas || !user) return;

      const pointer = canvas.getPointer(e.e);

      // Throttle cursor updates to ~30ms (33 updates/second)
      // This provides smooth movement while being cost-effective
      if (throttleTimerRef.current) return;

      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
      }, 30);

      // Send cursor position to Realtime Database
      updateCursorPosition(user.uid, pointer.x, pointer.y);
    },
    [canvas, user]
  );

  // Subscribe to remote cursor positions and combine with presence data
  useEffect(() => {
    if (!canvas || !isReady || !user) return;

    const unsubscribe = subscribeToCursors((cursors: CursorMap) => {
      // Filter out our own cursor and combine with presence data
      const cursorData: Record<string, CursorData> = {};

      Object.entries(cursors).forEach(([userId, cursor]) => {
        if (userId !== user.uid) {
          // Get presence data for this user
          const presence = presenceData[userId];
          
          cursorData[userId] = {
            x: cursor.x,
            y: cursor.y,
            displayName: presence?.displayName || "Anonymous",
            color: presence?.color || "#4ECDC4",
          };
        }
      });

      setRemoteCursors(cursorData);
    });

    return () => {
      unsubscribe();
    };
  }, [canvas, isReady, user, presenceData]);

  // Set up mouse move listener on canvas
  useEffect(() => {
    if (!canvas || !isReady) return;

    canvas.on("mouse:move", handleMouseMove);

    return () => {
      canvas.off("mouse:move", handleMouseMove);
    };
  }, [canvas, isReady, handleMouseMove]);

  // Clean up cursor on unmount
  useEffect(() => {
    if (!user) return;

    return () => {
      removeCursor(user.uid);
    };
  }, [user]);

  return {
    remoteCursors,
    userColor: userColorRef.current,
    displayName: displayNameRef.current,
  };
}

