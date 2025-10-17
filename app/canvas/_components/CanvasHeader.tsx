"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CanvasHeaderProps {
  canvasName: string;
}

export default function CanvasHeader({ canvasName }: CanvasHeaderProps) {
  const router = useRouter();

  const handleDashboardClick = () => {
    router.push("/canvas");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b h-14 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDashboardClick}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Dashboard
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
            {canvasName}
          </span>
        </div>

        {/* Canvas Settings Menu (Placeholder for future features) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Canvas settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              Canvas settings (coming soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
