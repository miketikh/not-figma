import { Plus, Minus, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface ViewControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

/**
 * View controls component (bottom-right corner)
 * Groups zoom controls and view options like grid toggle
 */
export default function ViewControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showGrid,
  onToggleGrid,
}: ViewControlsProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-6 right-6 flex items-end gap-2">
        {/* Grid Toggle */}
        <div className="flex flex-col bg-white rounded-md overflow-hidden border shadow-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleGrid}
                className={showGrid ? "bg-accent" : ""}
              >
                <Grid3x3 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{showGrid ? "Hide Grid" : "Show Grid"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col bg-white rounded-md overflow-hidden border shadow-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onZoomIn}>
                <Plus size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>
                Zoom In <span className="text-muted-foreground">(⌘+)</span>
              </p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="horizontal" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onResetZoom}
                className="text-xs"
              >
                {Math.round(zoom * 100)}%
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>
                Reset Zoom <span className="text-muted-foreground">(⌘0)</span>
              </p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="horizontal" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onZoomOut}>
                <Minus size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>
                Zoom Out <span className="text-muted-foreground">(⌘−)</span>
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

