import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

/**
 * Zoom control UI component (bottom-right corner)
 * Provides buttons for zooming in, out, and resetting zoom level
 */
export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-6 right-6 flex flex-col bg-white rounded-md overflow-hidden border shadow-md">
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
    </TooltipProvider>
  );
}
