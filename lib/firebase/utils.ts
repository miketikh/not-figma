/**
 * Shared Firebase utilities
 * Used by both client-side and server-side Firebase operations
 */

/**
 * Recursively remove undefined values from an object.
 * Firebase Firestore doesn't accept undefined values in documents.
 *
 * @param obj - Object to clean
 * @returns Cleaned object with undefined values removed
 */
export function removeUndefinedValues<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned as T;
}
