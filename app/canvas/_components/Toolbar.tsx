"use client";

import { CanvasTool } from "@/types/canvas";
import { useCanvasStore } from "../_store/canvas-store";
import { MousePointer2, Hand, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export default function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore();

  const tools: { 
    id: CanvasTool; 
    label: string; 
    icon: React.ReactNode;
    shortcut?: string;
  }[] = [
    { id: "select", label: "Select", icon: <MousePointer2 />, shortcut: "V" },
    { id: "pan", label: "Hand", icon: <Hand />, shortcut: "H" },
    { id: "rectangle", label: "Rectangle", icon: <Square />, shortcut: "R" },
  ];

  return (
    <div 
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white rounded-lg overflow-hidden border shadow-lg"
    >
      <TooltipProvider>
        {tools.map((tool, index) => (
          <div key={tool.id} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool.id ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setActiveTool(tool.id)}
                >
                  {tool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.label} {tool.shortcut && <span className="text-muted-foreground">({tool.shortcut})</span>}</p>
              </TooltipContent>
            </Tooltip>
            
            {index < tools.length - 1 && <Separator orientation="vertical" className="h-6" />}
          </div>
        ))}
      </TooltipProvider>
    </div>
  );
}



