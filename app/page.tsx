"use client"

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Users, Zap, MousePointer2, Layers, Wand2 } from "lucide-react";
import Link from "next/link";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { ColorPicker } from "@/components/color-picker";
import { useState } from "react";

export default function Home() {
  const [drawColor, setDrawColor] = useState("rgba(139, 92, 246, 0.5)");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '30px 30px',
      backgroundColor: 'oklch(0.145 0 0)'
    }}>
      <DrawingCanvas color={drawColor} />
      <ColorPicker selectedColor={drawColor} onColorChange={setDrawColor} />

      <div className="max-w-6xl w-full space-y-12 relative pointer-events-none" style={{ zIndex: 2 }}>
        <div className="text-center space-y-8 rounded-2xl p-8 md:p-12 border-2 max-w-4xl mx-auto pointer-events-auto shadow-2xl" style={{
          backgroundColor: 'oklch(0.145 0 0)',
          borderColor: 'oklch(0.75 0.15 280 / 0.3)'
        }}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              backgroundColor: 'oklch(0.75 0.15 280)'
            }}>
              <Layers className="w-7 h-7" style={{ color: 'oklch(0.98 0 0)' }} />
            </div>
            <span className="text-3xl font-bold" style={{ color: 'oklch(0.985 0 0)' }}>Not-Figma</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight" style={{ color: 'oklch(0.985 0 0)' }}>
              Design together.
              <br />
              <span style={{ color: 'oklch(0.75 0.15 280)' }}>Build with AI.</span>
            </h1>

            <p className="text-xl md:text-2xl max-w-3xl mx-auto text-balance leading-relaxed" style={{ color: 'oklch(0.708 0 0)' }}>
              Real-time collaboration meets AI-powered design. Because it&apos;s 2025 and your design tool should probably
              have AI in it. 🤯
            </p>
          </div>

          <Link href="/login" className="inline-block pointer-events-auto">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xl px-12 py-6 h-auto"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Now
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pointer-events-auto">
          <Card className="p-6 space-y-4 border-2 transition-all hover:shadow-lg text-center" style={{
            backgroundColor: 'oklch(0.145 0 0)',
            borderColor: '#f97316'
          }}>
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mx-auto">
              <MousePointer2 className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'oklch(0.985 0 0)' }}>Multiplayer Cursors</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.708 0 0)' }}>
              See everyone&apos;s cursor in real-time. It&apos;s like magic, but it&apos;s actually just WebSockets.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2 transition-all hover:shadow-lg text-center" style={{
            backgroundColor: 'oklch(0.145 0 0)',
            borderColor: '#3b82f6'
          }}>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'oklch(0.985 0 0)' }}>Real-Time Sync</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.708 0 0)' }}>
              Changes sync in under 100ms. Create, move, resize—everyone sees it instantly.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2 transition-all hover:shadow-lg text-center" style={{
            backgroundColor: 'oklch(0.145 0 0)',
            borderColor: '#a855f7'
          }}>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto">
              <Wand2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'oklch(0.985 0 0)' }}>AI Canvas Agent</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.708 0 0)' }}>
              &quot;Create a login form.&quot; Boom. Done. The AI builds it while you watch. Mind = blown.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-2 transition-all hover:shadow-lg text-center" style={{
            backgroundColor: 'oklch(0.145 0 0)',
            borderColor: '#22c55e'
          }}>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'oklch(0.985 0 0)' }}>Blazing Fast</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.708 0 0)' }}>
              60 FPS with 500+ objects. Pan, zoom, transform—everything stays buttery smooth.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
