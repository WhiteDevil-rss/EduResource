"use client";

import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/cn'

// Accent configuration removed (unused in this build)

export function ThemeSwitcher({ className = '' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/85 px-2 py-2 shadow-lg shadow-primary/10 backdrop-blur-xl',
        className
      )}
    >
      <ThemeToggle 
        className="h-10 w-10 rounded-full border border-border/50 bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/60" 
        showLabel={false} 
      />
    </div>
  )
}
