/**
 * Realtime Database helper functions
 * High-frequency updates for cursors and presence tracking
 */

import {
  ref,
  set,
  get,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  Unsubscribe,
} from "firebase/database";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { realtimeDb } from "./config";
import { CursorPosition, CursorMap } from "@/types/canvas";
import { UserPresence } from "@/types/user";

// Session ID - in production, this could be a room/canvas ID
const SESSION_ID = "canvas-session-default";

// ============================================================================
// Cursor Functions (High-frequency updates ~30ms / 33 updates per second)
// ============================================================================

/**
 * Update cursor position for current user
 */
export async function updateCursorPosition(
  userId: string,
  x: number,
  y: number
): Promise<void> {
  const cursorRef = ref(realtimeDb, `sessions/${SESSION_ID}/cursors/${userId}`);
  await set(cursorRef, {
    userId,
    x,
    y,
    timestamp: Date.now(),
  });
}

/**
 * Remove cursor for current user
 */
export async function removeCursor(userId: string): Promise<void> {
  const cursorRef = ref(realtimeDb, `sessions/${SESSION_ID}/cursors/${userId}`);
  await remove(cursorRef);
}

/**
 * Subscribe to all cursor positions
 * Returns an unsubscribe function
 */
export function subscribeToCursors(
  callback: (cursors: CursorMap) => void
): Unsubscribe {
  const cursorsRef = ref(realtimeDb, `sessions/${SESSION_ID}/cursors`);
  
  return onValue(cursorsRef, (snapshot) => {
    const cursors: CursorMap = snapshot.val() || {};
    callback(cursors);
  });
}

/**
 * Get current cursor positions (one-time read)
 */
export async function getCursors(): Promise<CursorMap> {
  const cursorsRef = ref(realtimeDb, `sessions/${SESSION_ID}/cursors`);
  const snapshot = await get(cursorsRef);
  return snapshot.val() || {};
}

// ============================================================================
// Presence Functions (Lower-frequency updates ~30s)
// ============================================================================

/**
 * Set user presence (online)
 */
export async function setUserPresence(
  userId: string,
  displayName: string,
  email: string,
  color: string
): Promise<void> {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence/${userId}`);
  const cursorRef = ref(realtimeDb, `sessions/${SESSION_ID}/cursors/${userId}`);

  const presence: UserPresence = {
    userId,
    displayName,
    email,
    color,
    lastSeen: Date.now(),
    isOnline: true,
  };

  await set(presenceRef, presence);

  // Set up disconnect handler to mark user as offline
  const disconnectRef = onDisconnect(presenceRef);
  await disconnectRef.update({
    isOnline: false,
    lastSeen: serverTimestamp(),
  });

  // Set up disconnect handler to remove cursor
  const cursorDisconnectRef = onDisconnect(cursorRef);
  await cursorDisconnectRef.remove();
}

/**
 * Update user's last seen timestamp (heartbeat)
 */
export async function updatePresenceHeartbeat(userId: string): Promise<void> {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence/${userId}`);
  const snapshot = await get(presenceRef);
  
  if (snapshot.exists()) {
    const presence = snapshot.val() as UserPresence;
    await set(presenceRef, {
      ...presence,
      lastSeen: Date.now(),
      isOnline: true,
    });
  }
}

/**
 * Remove user presence (on sign out)
 */
export async function removeUserPresence(userId: string): Promise<void> {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence/${userId}`);
  const cursorRef = ref(realtimeDb, `sessions/${SESSION_ID}/cursors/${userId}`);
  
  // Update to offline instead of deleting (keeps history)
  const snapshot = await get(presenceRef);
  if (snapshot.exists()) {
    const presence = snapshot.val() as UserPresence;
    await set(presenceRef, {
      ...presence,
      isOnline: false,
      lastSeen: Date.now(),
    });
  }
  
  // Remove cursor
  await remove(cursorRef);
}

/**
 * Subscribe to all user presence
 * Returns an unsubscribe function
 */
export function subscribeToPresence(
  callback: (presence: Record<string, UserPresence>) => void
): Unsubscribe {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence`);
  
  return onValue(presenceRef, (snapshot) => {
    const presence: Record<string, UserPresence> = snapshot.val() || {};
    callback(presence);
  });
}

/**
 * Get current online users (one-time read)
 */
export async function getOnlineUsers(): Promise<UserPresence[]> {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence`);
  const snapshot = await get(presenceRef);
  const presenceMap: Record<string, UserPresence> = snapshot.val() || {};
  
  return Object.values(presenceMap).filter((user) => user.isOnline);
}

/**
 * Get all users (online and recently offline)
 */
export async function getAllUsers(): Promise<UserPresence[]> {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence`);
  const snapshot = await get(presenceRef);
  const presenceMap: Record<string, UserPresence> = snapshot.val() || {};
  
  return Object.values(presenceMap);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a random display name (e.g., "Happy Elephant", "Brave Tiger")
 */
export function generateDisplayName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: " ",
    style: "capital",
    length: 2,
  });
}

/**
 * Generate a deterministic color for user based on their userId
 * This ensures the same user always gets the same color and distributes colors evenly
 */
export function generateUserColor(userId: string): string {
  const cursorColors = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Sky Blue
    "#F8B739", // Orange
    "#52B788", // Green
  ];
  
  // Simple hash function to convert userId to a number
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get an index
  const index = Math.abs(hash) % cursorColors.length;
  
  return cursorColors[index];
}

/**
 * Check if a user is considered active (seen in last 5 minutes)
 */
export function isUserActive(lastSeen: number): boolean {
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - lastSeen < fiveMinutes;
}

/**
 * Clean up inactive users (admin function, can be called periodically)
 */
export async function cleanupInactiveUsers(): Promise<void> {
  const presenceRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence`);
  const snapshot = await get(presenceRef);
  const presenceMap: Record<string, UserPresence> = snapshot.val() || {};
  
  const thirtyMinutes = 30 * 60 * 1000;
  
  for (const [userId, presence] of Object.entries(presenceMap)) {
    const inactive = Date.now() - presence.lastSeen > thirtyMinutes;
    if (inactive && !presence.isOnline) {
      const userRef = ref(realtimeDb, `sessions/${SESSION_ID}/presence/${userId}`);
      await remove(userRef);
    }
  }
}

