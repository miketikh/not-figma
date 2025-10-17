/**
 * Safe wrapper utilities for Firebase Realtime Database operations
 *
 * Firebase Realtime Database doesn't accept undefined values in writes.
 * These wrappers automatically filter out undefined values before writing.
 *
 * IMPORTANT: Always use these wrappers instead of direct Firebase SDK calls
 * to prevent undefined value errors.
 */

import { set, update, push, type DatabaseReference } from "firebase/database";

/**
 * Recursively removes undefined values from an object.
 * Firebase Realtime Database doesn't accept undefined values.
 *
 * @param data - The data to clean
 * @returns Cleaned data with undefined values removed
 */
function cleanRealtimeData<T>(data: T): T {
  // Primitive values (including null) pass through
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays recursively
  if (Array.isArray(data)) {
    return data.map(cleanRealtimeData) as T;
  }

  // Handle objects recursively
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanRealtimeData(value)])
    ) as T;
  }

  // Return primitive values as-is
  return data;
}

/**
 * Safe wrapper for Realtime Database set() that filters undefined values.
 * Use this instead of calling set() directly.
 *
 * @param reference - Database reference to write to
 * @param data - Data to write (undefined values will be filtered out)
 * @returns Promise that resolves when write is complete
 *
 * @example
 * ```typescript
 * import { safeSet } from '@/lib/firebase/realtime-utils';
 * import { ref } from 'firebase/database';
 *
 * const userRef = ref(realtimeDb, 'users/123');
 * await safeSet(userRef, {
 *   name: 'John',
 *   age: undefined, // This will be filtered out
 *   email: 'john@example.com'
 * });
 * ```
 */
export async function safeSet(
  reference: DatabaseReference,
  data: unknown
): Promise<void> {
  const cleanedData = cleanRealtimeData(data);
  return set(reference, cleanedData);
}

/**
 * Safe wrapper for Realtime Database update() that filters undefined values.
 * Use this instead of calling update() directly.
 *
 * @param reference - Database reference to update
 * @param data - Update data (undefined values will be filtered out)
 * @returns Promise that resolves when update is complete
 *
 * @example
 * ```typescript
 * import { safeUpdate } from '@/lib/firebase/realtime-utils';
 * import { ref } from 'firebase/database';
 *
 * const userRef = ref(realtimeDb, 'users/123');
 * await safeUpdate(userRef, {
 *   lastSeen: Date.now(),
 *   status: undefined // This will be filtered out
 * });
 * ```
 */
export async function safeUpdate(
  reference: DatabaseReference,
  data: Record<string, unknown>
): Promise<void> {
  const cleanedData = cleanRealtimeData(data);
  return update(reference, cleanedData);
}

/**
 * Safe wrapper for Realtime Database push() that filters undefined values.
 * Use this instead of calling push() directly.
 *
 * @param reference - Database reference to push to
 * @param data - Data to push (undefined values will be filtered out)
 * @returns Promise that resolves with the new child reference
 *
 * @example
 * ```typescript
 * import { safePush } from '@/lib/firebase/realtime-utils';
 * import { ref } from 'firebase/database';
 *
 * const messagesRef = ref(realtimeDb, 'messages');
 * const newMessageRef = await safePush(messagesRef, {
 *   text: 'Hello',
 *   author: 'John',
 *   timestamp: Date.now()
 * });
 * ```
 */
export async function safePush(
  reference: DatabaseReference,
  data?: unknown
): Promise<DatabaseReference> {
  const cleanedData = data !== undefined ? cleanRealtimeData(data) : undefined;
  const newRef = push(reference);

  if (cleanedData !== undefined) {
    await set(newRef, cleanedData);
  }

  return newRef;
}
