"use client";

import { usePresence } from "../_hooks/usePresence";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAX_VISIBLE_AVATARS = 3;

export default function OnlineUsers() {
  const { onlineUsers, onlineCount } = usePresence();

  if (onlineCount === 0) {
    return null;
  }

  const visibleUsers = onlineUsers.slice(0, MAX_VISIBLE_AVATARS);
  const additionalCount = Math.max(0, onlineCount - MAX_VISIBLE_AVATARS);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
      {/* Avatar Circles */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-background"
                  style={{ backgroundColor: user.color }}
                >
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.displayName || user.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Text Label */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {additionalCount > 0 && (
          <span className="font-medium">
            ...and {additionalCount} other{additionalCount !== 1 ? "s" : ""}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Online
        </span>
      </div>
    </div>
  );
}

