'use client'

import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'



export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
        <FileQuestion size={48} />
      </div>

      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        404 - Page Not Found
      </h1>

      <p className="mb-10 max-w-lg text-balance text-lg text-muted-foreground">
        Oops! It seems you've wandered into uncharted territory. 
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/">
          <Button
            size="lg"
            className="flex w-full items-center gap-2 rounded-xl bg-primary px-8 py-7 text-lg font-semibold text-white transition-all hover:scale-105 active:scale-95 sm:w-auto"
          >
            <Home size={20} />
            Return Home
          </Button>
        </Link>
        <Button
          variant="outline"
          size="lg"
          onClick={() => typeof window !== 'undefined' && window.history.back()}
          className="flex w-full items-center gap-2 rounded-xl px-8 py-7 text-lg font-semibold transition-all hover:scale-105 active:scale-95 sm:w-auto"
        >
          <ArrowLeft size={20} />
          Go Back
        </Button>
      </div>

      <div className="mt-16 border-t border-border pt-8 w-full max-w-md">
        <p className="text-sm text-muted-foreground">
          Think this is a mistake? Please <Link href="/contact" className="text-primary hover:underline">contact support</Link>.
        </p>
      </div>
    </div>
  )
}
