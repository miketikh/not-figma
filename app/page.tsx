import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Users, Zap, MousePointer2, Wand2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-12">
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center gap-3">
            <Image 
              src="/favicon/apple-touch-icon.png" 
              alt="Not-Figma Logo" 
              width={48} 
              height={48}
              className="rounded-xl"
            />
            <span className="text-3xl font-bold text-foreground">Not-Figma</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight">
              Design together.
              <br />
              <span className="text-foreground/80">Build with AI.</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed">
              Real-time collaboration meets AI-powered design. Because it&apos;s 2025 and your design tool should
              have AI in it. 🤯
            </p>
          </div>

          <Link href="/login">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xl px-12 py-6 h-auto"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Now
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-4 bg-card border-border hover:border-orange-300 transition-all shadow-md hover:shadow-xl text-center">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mx-auto">
              <MousePointer2 className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Multiplayer Cursors</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              See everyone&apos;s cursor in real-time. It&apos;s like magic, but it&apos;s actually just WebSockets.
            </p>
          </Card>

          <Card className="p-6 space-y-4 bg-card border-border hover:border-blue-300 transition-all shadow-md hover:shadow-xl text-center">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Real-Time Sync</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Changes sync in under 100ms. Create, move, resize—everyone sees it instantly. Or fast enough, anyway. 
            </p>
          </Card>

          <Card className="p-6 space-y-4 bg-card border-border hover:border-purple-300 transition-all shadow-md hover:shadow-xl text-center">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto">
              <Wand2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">AI Canvas Agent</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              &quot;Create a login form.&quot; Boom. Done. The AI builds it while you watch. Though it may just be 3 rectangles.
            </p>
          </Card>

          <Card className="p-6 space-y-4 bg-card border-border hover:border-green-300 transition-all shadow-md hover:shadow-xl text-center">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Blazing Fast</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              60 FPS with 500+ objects. Pan, zoom, transform—everything stays buttery smooth. *Note: Butter is not always smooth.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
