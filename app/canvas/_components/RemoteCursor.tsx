/**
 * Remote cursor component for displaying other users' cursors
 */

interface RemoteCursorProps {
  x: number;
  y: number;
  displayName: string;
  color: string;
}

export default function RemoteCursor({
  x,
  y,
  displayName,
  color,
}: RemoteCursorProps) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${x - 2}px, ${y - 2}px)`,
        transition: "transform 0.1s linear",
        willChange: "transform",
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" }}
      >
        <path
          d="M5.5 3.5L19.5 12.5L12.5 14.5L9.5 20.5L5.5 3.5Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* User name label */}
      <div
        className="absolute top-5 left-5 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
        style={{
          backgroundColor: color,
          boxShadow: "0px 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {displayName}
      </div>
    </div>
  );
}
