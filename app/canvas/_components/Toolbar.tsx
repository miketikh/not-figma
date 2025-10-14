"use client";

import { CanvasTool } from "@/types/canvas";
import { useCanvasStore } from "../_store/canvas-store";

export default function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore();

  const tools: { id: CanvasTool; label: string; icon: string }[] = [
    { id: "select", label: "Select", icon: "⌃" },
    { id: "rectangle", label: "Rectangle", icon: "▭" },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`
            w-10 h-10 flex items-center justify-center rounded transition-colors
            ${
              activeTool === tool.id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }
          `}
          title={tool.label}
        >
          <span className="text-xl">{tool.icon}</span>
        </button>
      ))}
    </div>
  );
}



