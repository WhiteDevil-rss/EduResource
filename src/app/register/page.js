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
  { label: 'Privacy Policy', href: '/login' },
  { label: 'Terms of Service', href: '/login' },
  { label: 'Support', href: '/#archive' },
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
        <div className="auth-card auth-card--register" style={{ maxWidth: '480px' }}>
          <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="auth-icon-badge" style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '20px', 
              background: 'rgba(var(--secondary-rgb), 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: 'var(--secondary)'
            }}>
              <GraduationCap size={32} />
            </div>
            <h1>Student Registration</h1>
            <p style={{ fontSize: '1.1rem', opacity: 0.8 }}>
              Join the academic community and access verified research resources instantly.
            </p>
          </div>

          <div className="auth-content">
            <div className="auth-benefit-list" style={{ marginBottom: '2.5rem' }}>
              <div className="auth-benefit-item" style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ color: 'var(--primary)', marginTop: '2px' }}><Sparkles size={18} /></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>Instant Access</h4>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.7 }}>No password required. Secure sign-on via your Gmail ID.</p>
                </div>
              </div>
              <div className="auth-benefit-item" style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ color: 'var(--primary)', marginTop: '2px' }}><Shield size={18} /></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>Verified Resources</h4>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.7 }}>Gain exclusive access to peer-reviewed archives.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="auth-alert auth-alert--error" style={{ marginBottom: '1.5rem' }}>
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              className="button-primary button-block"
              onClick={handleJoin}
              disabled={isAuthenticating}
              style={{ height: '3.75rem', fontSize: '1.1rem', fontWeight: 600 }}
            >
              <Chrome size={22} />
              {isAuthenticating ? 'Authenticating...' : 'Register as a Student'}
            </button>

            <div className="auth-terms-notice" style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.6 }}>
              By clicking "Register as a Student", you agree to our{' '}
              <Link href="/login" style={{ textDecoration: 'underline' }}>Terms of Service</Link> and{' '}
              <Link href="/login" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.
            </div>
          </div>

          <div className="auth-footer" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ textAlign: 'center' }}>
              Already registered?{' '}
              <Link href="/login" style={{ color: 'var(--foreground)', fontWeight: 700 }}>
                Sign In <ArrowRight size={14} style={{ display: 'inline', marginLeft: '4px' }} />
              </Link>
            </p>
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
