'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error('Dashboard Component Crash:', error)
  }, [error])

  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/5 p-8 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger shadow-inner">
        <AlertCircle size={32} />
      </div>
      
      <h2 className="mb-2 text-xl font-semibold text-foreground">
        Workspace Sync Interrupted
      </h2>
      
      <p className="mb-8 max-w-xs text-sm text-muted-foreground leading-relaxed">
        We couldn't load your dashboard data. This might be a temporary hiccup in the connection to the resource library.
      </p>

      <Button
        onClick={() => reset()}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
      >
        <RefreshCcw size={16} />
        Refresh Workspace
      </Button>
    </div>
  )
}
