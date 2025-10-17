/**
 * Hook to check if data migration is needed
 * Checks if user has old data in the flat canvasObjects collection
 */

import { useState, useEffect } from "react";
import { shouldMigrate } from "@/lib/firebase/firestore";

interface MigrationStatus {
  needsMigration: boolean;
  checking: boolean;
  error: Error | null;
}

export function useMigrationStatus(userId: string | null): MigrationStatus {
  const [needsMigration, setNeedsMigration] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setChecking(false);
      setNeedsMigration(false);
      return;
    }

    let cancelled = false;

    async function checkMigration() {
      try {
        setChecking(true);
        setError(null);

        const result = await shouldMigrate(userId);

        if (!cancelled) {
          setNeedsMigration(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error checking migration status:", err);
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    checkMigration();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { needsMigration, checking, error };
}
