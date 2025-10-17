import { Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GridToggleProps {
  showGrid: boolean;
  onToggle: () => void;
}

/**
 * Grid toggle button component (top-left corner)
 * Allows users to show/hide the canvas grid
 */
export default function GridToggle({ showGrid, onToggle }: GridToggleProps) {
  return (
    <TooltipProvider>
      <div className="absolute top-6 left-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={`bg-white border shadow-md ${
                showGrid ? "bg-accent" : ""
              }`}
            >
              <Grid3x3 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{showGrid ? "Hide Grid" : "Show Grid"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
