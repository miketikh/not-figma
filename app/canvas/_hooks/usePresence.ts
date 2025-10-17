/**
 * Hook for tracking online users presence
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToPresence, isUserActive } from "@/lib/firebase/realtime";
import { UserPresence } from "@/types/user";

export function usePresence(canvasId: string) {
  const { user } = useAuth();
  const [allPresence, setAllPresence] = useState<Record<string, UserPresence>>({});

  // Subscribe to presence data
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPresence(canvasId, (presence) => {
      setAllPresence(presence);
    });

    return () => {
      unsubscribe();
    };
  }, [canvasId, user]);

  // Get online users (excluding current user)
  const onlineUsers = Object.values(allPresence).filter(
    (presence) => 
      presence.userId !== user?.uid && // Exclude current user
      presence.isOnline && 
      isUserActive(presence.lastSeen) // Active within last 5 minutes
  );

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}

