/**
 * Lock system constants
 * Centralized configuration for object locking behavior
 */

/**
 * Lock timeout duration in milliseconds
 * Objects will be automatically unlocked after this period of inactivity
 */
export const LOCK_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Lock expiration check interval in milliseconds
 * How often to check for expired locks
 */
export const LOCK_CHECK_INTERVAL_MS = 1000; // 5 seconds

