"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Eraser } from "lucide-react"

interface DrawingCanvasProps {
  color: string
}

export function DrawingCanvas({ color }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.shadowBlur = 3
      ctx.shadowColor = color
      setContext(ctx)
    }

    return () => window.removeEventListener("resize", resizeCanvas)
  }, []) // Removed color from dependency array to prevent canvas clearing on color change

  useEffect(() => {
    if (context) {
      context.strokeStyle = color
      context.shadowColor = color
    }
  }, [color, context])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context) return

    setIsDrawing(true)
    context.beginPath()
    context.moveTo(e.clientX, e.clientY)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return

    context.lineTo(e.clientX, e.clientY)
    context.stroke()
  }

  const stopDrawing = () => {
    if (!context) return
    setIsDrawing(false)
    context.closePath()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="fixed inset-0 pointer-events-auto"
        style={{
          zIndex: 1,
          cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08' stroke='white' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'/%3E%3Cpath d='M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z' stroke='white' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'/%3E%3Cpath d='m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08' stroke='${encodeURIComponent(color)}' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/%3E%3Cpath d='M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z' stroke='${encodeURIComponent(color)}' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E") 2 22, auto`,
        }}
      />
      <div className="fixed bottom-6 right-6 flex items-center gap-3" style={{ zIndex: 3 }}>
        <p className="text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
          Try drawing on the page!
        </p>
        <Button onClick={clearCanvas} size="icon" variant="outline" className="bg-background/80 backdrop-blur-sm">
          <Eraser className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}
