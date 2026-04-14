'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('Unhandled System Error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={40} />
      </div>
      
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        System Temporarily Unavailable
      </h1>
      
      <p className="mb-10 max-w-md text-balance text-muted-foreground">
        We've encountered an unexpected issue connecting to our services. 
        This is usually due to a temporary network disruption or a configuration update.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-6 text-lg font-semibold text-white transition-all hover:scale-105 active:scale-95"
        >
          <RefreshCw size={20} />
          Try Again
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.location.href = '/'}
          className="rounded-xl px-8 py-6 text-lg font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <Home size={20} className="mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="mt-12 text-xs text-muted-foreground/40">
        Error ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
      </div>
    </div>
  )
}
