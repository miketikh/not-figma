"use client"

import { Button } from "@/components/ui/button"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const colors = [
  { name: "Purple", value: "rgba(139, 92, 246, 0.5)" },
  { name: "Blue", value: "rgba(59, 130, 246, 0.5)" },
  { name: "Green", value: "rgba(34, 197, 94, 0.5)" },
  { name: "Pink", value: "rgba(236, 72, 153, 0.5)" },
  { name: "Orange", value: "rgba(249, 115, 22, 0.5)" },
  { name: "Red", value: "rgba(239, 68, 68, 0.5)" },
]

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 backdrop-blur-sm px-4 py-3 rounded-full border-2 shadow-xl"
      style={{
        zIndex: 3,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      {colors.map((color) => (
        <Button
          key={color.value}
          onClick={() => onColorChange(color.value)}
          size="icon"
          variant="ghost"
          className={`w-8 h-8 rounded-full p-0 hover:scale-110 transition-transform ${
            selectedColor === color.value ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
          }`}
          style={{ backgroundColor: color.value.replace("0.5", "1") }}
          aria-label={`Select ${color.name}`}
        />
      ))}
    </div>
  )
}
