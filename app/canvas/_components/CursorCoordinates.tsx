"use client";

import { useState, useEffect, useRef } from "react";

interface CursorCoordinatesProps {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Displays canvas coordinates next to the user's cursor
 * Shows x,y position in canvas space (not screen space)
 */
export default function CursorCoordinates({
  x,
  y,
  visible,
}: CursorCoordinatesProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const divRef = useRef<HTMLDivElement>(null);

  // Track mouse position for positioning the coordinate display
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!visible) return null;

  // Offset from cursor (to the right and below to avoid obscuring cursor)
  const offsetX = 20;
  const offsetY = 20;

  return (
    <div
      ref={divRef}
      className="pointer-events-none fixed z-50"
      style={{
        left: mousePos.x + offsetX,
        top: mousePos.y + offsetY,
      }}
    >
      <div className="rounded px-2 py-1 text-xs font-mono shadow-md bg-gray-800/90 text-white">
        ({Math.round(x)}, {Math.round(y)})
      </div>
    </div>
  );
}
