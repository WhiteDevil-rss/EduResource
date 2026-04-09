'use client'

import {
  ArrowRight,
  Chrome,
  Shield,
  GraduationCap,
  Sparkles,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import PublicFooter from '@/components/PublicFooter'
import PublicHeader from '@/components/PublicHeader'
import { useAuth } from '@/hooks/useAuth'
import { getPublicHeaderContent } from '@/lib/public-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const footerLinks = [
  { label: 'Privacy Policy', href: '/#features' },
  { label: 'Terms of Service', href: '/#features' },
  { label: 'Support', href: '/#team' },
]

export default function Register() {
  const pathname = usePathname()
  const { user, role, loading, isAuthenticating, signInWithGoogleStudent } = useAuth()
  const router = useRouter()
  const [error, setError] = useState('')
  const { links: navLinks, actions: navActions } = getPublicHeaderContent(pathname)

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground flex flex-col">
      <PublicHeader
        links={navLinks}
        actions={navActions}
      />

      <main className="flex-1 w-full max-w-full overflow-x-hidden flex flex-col items-center justify-center p-4 md:p-8 py-16">
        <div className="w-full max-w-xl">
          <Card className="border-border/40 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="pt-12 pb-6 text-center px-8 space-y-4">
              <div className="w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center text-primary-foreground mx-auto shadow-xl shadow-primary/20 transform -rotate-3">
                <GraduationCap size={32} />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  Join the Community
                </Badge>
                <CardTitle className="text-3xl font-extrabold tracking-tight">
                  One Step Registration
                </CardTitle>
                <CardDescription className="text-base">
                  Instant workspace access for verified students.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-12 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/20 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Instant Access</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">No complex forms. Your Gmail account is your workspace key.</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/20 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Safe Environment</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Encrypted data protection for your academic journey.</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <Button
                  type="button"
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={handleJoin}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? <Loader2 size={24} className="animate-spin mr-3" /> : <Chrome size={24} className="mr-3" />}
                  Register with Google
                </Button>

                <p className="text-center text-xs text-muted-foreground px-4 leading-relaxed">
                  By joining, you agree to our{' '}
                  <Link href="/#features" className="text-foreground font-semibold hover:underline">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/#features" className="text-foreground font-semibold hover:underline">Privacy Policy</Link>.
                </p>
              </div>

              <div className="pt-4 border-t border-border/40 text-center">
                <p className="text-sm text-muted-foreground">
                  Already registered?{' '}
                  <Link href="/login" className="text-primary font-bold inline-flex items-center hover:underline">
                    Sign In <ArrowRight size={16} className="ml-1" />
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-center items-center gap-6">
            <span className="w-8 h-px bg-border/40" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Secure Student Network</span>
            <span className="w-8 h-px bg-border/40" />
          </div>
        </div>
      </main>

      <PublicFooter
        links={footerLinks}
        tagline={`© ${new Date().getFullYear()} SPS EDUCATIONAM. Zembaa Solution.`}
      />
    </div>
  )
}
