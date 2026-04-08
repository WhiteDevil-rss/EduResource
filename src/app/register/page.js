'use client'

import {
  ArrowRight,
  Chrome,
  Shield,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import PublicFooter from '@/components/PublicFooter'
import PublicHeader from '@/components/PublicHeader'
import { useAuth } from '@/hooks/useAuth'
import { getPublicHeaderContent } from '@/lib/public-nav'

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
    <div className="auth-page">
      <PublicHeader
        links={navLinks}
        actions={navActions}
      />

      <main className="auth-main">
        <div className="auth-card auth-card--register">
          <div className="auth-card__stack">
          <div className="auth-header auth-header--centered">
            <div className="auth-icon-badge">
              <GraduationCap size={32} />
            </div>
            <p className="auth-kicker">Student Onboarding</p>
            <h1>Start your learning workspace in one step</h1>
            <p>
              Join the academic community with verified Google sign-in and get instant access to curated study resources.
            </p>
          </div>

          <div className="auth-highlight-grid">
              <div className="auth-highlight">
                <div className="auth-highlight__icon"><Sparkles size={18} /></div>
                <div>
                  <h4>Instant access</h4>
                  <p>No password setup required. Use your Gmail account and reach the student dashboard right away.</p>
                </div>
              </div>
              <div className="auth-highlight">
                <div className="auth-highlight__icon"><Shield size={18} /></div>
                <div>
                  <h4>Verified resources</h4>
                  <p>Browse faculty-approved notes, files, and course materials inside a secure role-based environment.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="auth-alert auth-alert--error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              className="button-primary button-block auth-submit auth-submit--tall"
              onClick={handleJoin}
              disabled={isAuthenticating}
            >
              <Chrome size={22} />
              {isAuthenticating ? 'Authenticating...' : 'Register as a Student'}
            </button>

            <div className="auth-terms-notice">
              By clicking "Register as a Student", you agree to our{' '}
              <Link href="/#features">Terms of Service</Link> and{' '}
              <Link href="/#features">Privacy Policy</Link>.
            </div>

          <div className="auth-footer">
            <p>
              Already registered?{' '}
              <Link href="/login" style={{ color: 'var(--foreground)', fontWeight: 700 }}>
                Sign In <ArrowRight size={14} style={{ display: 'inline', marginLeft: '4px' }} />
              </Link>
            </p>
          </div>
          </div>
        </div>

        <div className="auth-footer__trust">Single Sign-On Secure Network</div>
      </main>

      <PublicFooter
        links={footerLinks}
        tagline={`© ${new Date().getFullYear()} SPS EDUCATIONAM. Zembaa Solution.`}
      />
    </div>
  )
}
