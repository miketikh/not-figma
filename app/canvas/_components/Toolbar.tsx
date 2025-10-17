"use client";

import type { CanvasTool } from "@/types/canvas";
import { useCanvasStore } from "../_store/canvas-store";
import { MousePointer2, Hand, Square, Circle, Minus, Type, Grid3x3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface ToolButton {
  id: CanvasTool;
  label: string;
  icon: React.ComponentType<any>;
  shortcut: string;
}

const TOOLS: ToolButton[] = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "pan", label: "Hand", icon: Hand, shortcut: "H" },
  { id: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  { id: "circle", label: "Circle", icon: Circle, shortcut: "C" },
  { id: "line", label: "Line", icon: Minus, shortcut: "L" },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
];

export default function Toolbar() {
  const { activeTool, setActiveTool, updateDefaultShapeProperty, showGrid, toggleGrid } = useCanvasStore();

  const handleToolClick = (toolId: CanvasTool) => {
    setActiveTool(toolId);
    // Reset text content to default when clicking text tool
    if (toolId === "text") {
      updateDefaultShapeProperty("text", { content: "Text" });
    }
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white rounded-lg overflow-hidden border shadow-lg"
    >
      <TooltipProvider>
        {TOOLS.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <div key={tool.id} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleToolClick(tool.id)}
                    className={`flex flex-col items-center justify-center px-3 py-2 hover:bg-accent transition-colors ${
                      activeTool === tool.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {tool.shortcut}
                      </span>
                    </div>
                    <div className="flex items-center justify-center w-6 h-6">
                      <Icon className="w-5 h-5" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tool.label}</p>
                </TooltipContent>
              </Tooltip>

              {index < TOOLS.length - 1 && <Separator orientation="vertical" className="h-full" />}
            </div>
          );
        })}

        {/* Grid toggle button */}
        <Separator orientation="vertical" className="h-full" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleGrid}
              className={`flex flex-col items-center justify-center px-3 py-2 hover:bg-accent transition-colors ${
                showGrid ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center justify-center w-6 h-6 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {/* Empty for grid button */}
                </span>
              </div>
              <div className="flex items-center justify-center w-6 h-6">
                <Grid3x3 className="w-5 h-5" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showGrid ? "Hide Grid" : "Show Grid"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}



