/**
 * Migration Banner Component
 * Displays a banner when data migration is needed
 */

import { useState } from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface MigrationBannerProps {
  onMigrate: () => void;
  migrating: boolean;
}

export function MigrationBanner({ onMigrate, migrating }: MigrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Data Migration Required
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <p className="mb-3">
          Your canvas objects are stored in the old format. To use the new multi-canvas
          feature, you need to migrate your data. This process will:
        </p>
        <ul className="list-disc list-inside mb-3 space-y-1">
          <li>Create a &quot;Default Canvas&quot; for your existing objects</li>
          <li>Move all your objects to the new structure</li>
          <li>Keep your old data as backup for 7 days</li>
        </ul>
        <div className="flex gap-3">
          <Button
            onClick={onMigrate}
            disabled={migrating}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {migrating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              "Migrate Now"
            )}
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            variant="outline"
            size="sm"
            disabled={migrating}
          >
            <X className="w-4 h-4 mr-2" />
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
