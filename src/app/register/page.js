'use client'

import {
  ArrowRight,
  Globe,
  Shield,
  GraduationCap,
  Sparkles,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Register() {
  const pathname = usePathname()
  const { user, role, loading, isAuthenticating, signInWithGoogleStudent } = useAuth()
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user && role) {
      router.replace(`/dashboard/${role}`)
    }
  }, [loading, role, router, user])

  const handleJoin = async () => {
    setError('')
    try {
      await signInWithGoogleStudent()
    } catch (err) {
      setError(err?.message || 'Failed to join. Please try again.')
    }
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground flex flex-col relative">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute left-[10%] top-[10%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute right-[10%] bottom-[10%] h-[300px] w-[300px] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <main className="flex-1 w-full max-w-full flex flex-col items-center justify-center p-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full max-w-md space-y-8">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
              <Sparkles size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Join our verified student community</p>
          </div>

          <Card className="border-border/40 bg-card/50 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {/* Feature Highlights */}
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Shield size={16} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold">Secure Access</h4>
                    <p className="text-xs text-muted-foreground">Your academic data is protected by enterprise-grade security.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <GraduationCap size={16} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold">Verified Learning</h4>
                    <p className="text-xs text-muted-foreground">Connect with resources tailored specifically for your curriculum.</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive flex gap-3 text-xs animate-in fade-in zoom-in-95 duration-300">
                  <Shield size={16} className="shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <Button
                  type="button"
                  className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
                  onClick={handleJoin}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
                  {isAuthenticating ? 'Connecting...' : 'Continue with Google'}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground px-4 leading-relaxed font-medium uppercase tracking-wider">
                  Verified Academic Network Only
                </p>
              </div>

              <div className="pt-6 border-t border-border/40 text-center">
                <p className="text-xs text-muted-foreground">
                  By joining, you agree to our{' '}
                  <Link href="/terms-of-service" className="text-foreground font-semibold hover:underline">Terms</Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy" className="text-foreground font-semibold hover:underline">Privacy</Link>.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
