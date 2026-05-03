'use client'

import { Shield, Hammer, LogIn, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-700">
        {/* Animated Brand Header */}
        <div className="space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Hammer className="w-12 h-12 text-primary animate-bounce" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
            SPS Educationam <span className="text-primary font-medium text-lg align-top ml-2">PRO</span>
          </h1>
          <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        </div>

        {/* Status Messaging */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} />
            System Optimization In Progress
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-foreground/90 leading-tight">
            We're fine-tuning the engine for better performance.
          </h2>
          
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Our team is currently performing scheduled maintenance to ensure the platform remains lightning-fast and secure. We'll be back online shortly.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Button 
            asChild
            size="lg"
            className="h-14 px-10 rounded-2xl bg-primary text-white font-bold text-sm shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
          >
            <Link href="/login">
              <LogIn size={20} />
              Login as Administrator
            </Link>
          </Button>

          <Button 
            variant="outline"
            size="lg"
            className="h-14 px-10 rounded-2xl border-border/60 font-semibold text-sm hover:bg-muted/10 transition-all flex items-center gap-3"
            onClick={() => window.location.href = 'mailto:support@zembaa.com'}
          >
            <Mail size={20} />
            Contact Support
          </Button>
        </div>

        {/* Footer info */}
        <div className="pt-20 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Infrastructure is stable
          </div>
          <div>© 2026 SPS Educationam • GLOBAL SECURITY LAYER</div>
          <div className="flex gap-4">
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </div>
    </div>
  )
}
