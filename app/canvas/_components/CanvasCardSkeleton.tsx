import { Card, CardHeader, CardDescription } from "@/components/ui/card";

/**
 * CanvasCardSkeleton Component
 * Loading skeleton that matches the dimensions and layout of CanvasCard
 * Shows a pulse animation while canvas data is loading
 */
export function CanvasCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        {/* Title skeleton - matches CardTitle text-xl */}
        <div className="h-7 bg-muted rounded animate-pulse mb-1.5" />

        <CardDescription className="space-y-1">
          {/* Dimensions skeleton - matches text-sm */}
          <div className="h-5 bg-muted rounded animate-pulse w-24" />

          {/* Date skeleton - matches text-xs */}
          <div className="h-4 bg-muted rounded animate-pulse w-36" />
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
