'use client'

import React from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/layout/StandardCards'

/**
 * GlobalErrorBoundary - Catches runtime errors to prevent full app crashes.
 */
export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Platform Runtime Error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <StandardCard className="max-w-md border-destructive/20 bg-destructive/5 p-8 shadow-2xl shadow-destructive/10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle size={32} />
            </div>
            
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
              Something went wrong
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">
              An unexpected system error occurred while rendering this interface. Our team has been notified.
            </p>
            
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button 
                onClick={this.handleRetry}
                className="flex-1 gap-2 rounded-xl bg-destructive font-bold text-white shadow-lg shadow-destructive/20 hover:bg-destructive/90"
              >
                <RefreshCcw size={16} />
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1 gap-2 rounded-xl border-border/40 font-bold"
              >
                <Home size={16} />
                Return Home
              </Button>
            </div>
          </StandardCard>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 max-w-2xl overflow-auto rounded-lg bg-black/40 p-4 text-left text-[10px] font-mono text-red-400">
              {this.state.error?.toString()}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
