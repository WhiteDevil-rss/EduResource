'use client'

import { AlertOctagon, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error: _error, reset }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center antialiased">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-danger/10 text-danger shadow-2xl shadow-danger/10 mb-8 border border-danger/5">
          <AlertOctagon size={48} />
        </div>
        
        <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          Critical System Failure
        </h1>
        
        <p className="mb-12 max-w-md text-balance text-lg font-medium text-muted-foreground leading-relaxed">
          The application encountered a fatal error during the boot sequence. This usually indicates a 
          temporary network disruption between our edge nodes and the resource library.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            onClick={() => reset()}
            className="flex items-center gap-2 rounded-2xl bg-danger px-10 py-7 text-lg font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-danger/20"
          >
            <RefreshCcw size={22} />
            Reboot Application
          </Button>
        </div>

        <div className="mt-16 text-[10px] font-mono tracking-widest text-muted-foreground/30 uppercase">
          Edge Error Handler ID: {Math.random().toString(36).substring(2, 12).toUpperCase()}
        </div>
      </body>
    </html>
  )
}
