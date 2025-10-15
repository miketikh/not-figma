"use client";

import type { CanvasTool } from "@/types/canvas";
import { useCanvasStore } from "../_store/canvas-store";
import { MousePointer2, Hand, Square, Circle, Minus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { activeTool, setActiveTool, updateDefaultShapeProperty } = useCanvasStore();

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
                  <Button
                    variant={activeTool === tool.id ? "default" : "ghost"}
                    size="icon"
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {tool.label}{" "}
                    <span className="text-muted-foreground">({tool.shortcut})</span>
                  </p>
                </TooltipContent>
              </Tooltip>
              
              {index < TOOLS.length - 1 && <Separator orientation="vertical" className="h-6" />}
            </div>
          );
        })}
      </TooltipProvider>
    </div>
  );
}



