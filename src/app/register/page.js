'use client'

import {
  AlertCircle,
  ArrowRight,
  Chrome,
  GraduationCap,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import PublicFooter from '@/components/PublicFooter'
import PublicHeader from '@/components/PublicHeader'
import { useAuth } from '@/hooks/useAuth'

const footerLinks = [
  { label: 'Privacy Policy', href: '/login' },
  { label: 'Terms of Service', href: '/login' },
  { label: 'Support', href: '/#archive' },
]

export default function Register() {
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const { signInWithGoogleStudent, user, role, loading, isAuthenticating } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && role) {
      router.replace(`/dashboard/${role}`)
    }
  }, [loading, role, router, user])

  const handleStudentRegistration = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept the academic integrity guidelines to continue.')
      return
    }

    try {
      await signInWithGoogleStudent()
      toast.success('Student account verified with Google.')
    } catch (error) {
      toast.error(error.message || 'Google registration failed.')
    }
  }

  return (
    <div className="auth-page">
      <PublicHeader
        links={[
          { label: 'Resources', href: '/#curriculum' },
          { label: 'Support', href: '/#archive' },
        ]}
      />

      <main className="auth-main auth-main--register">
        <div className="auth-card auth-card--register">
          <div className="auth-header">
            <span className="auth-kicker">Student Access</span>
            <h1>Register With Google</h1>
            <p>Student accounts are created only through Google OAuth and immediately protected by role-based access rules.</p>
          </div>

          <div className="auth-form">
            <div className="auth-select">
              <span className="auth-select__label">Authentication Policy</span>
              <div className="auth-select__grid">
                <button type="button" className="auth-select__button auth-select__button--active">
                  <GraduationCap size={18} />
                  Student Google OAuth
                </button>
                <button type="button" className="auth-select__button" disabled aria-disabled="true">
                  <Shield size={18} />
                  Faculty/Admin by Invite
                </button>
              </div>
            </div>

            <div className="auth-alert">
              <AlertCircle size={18} color="var(--secondary)" />
              <span>Faculty and admin accounts cannot self-register. Those credentials are created and managed only by the super admin.</span>
            </div>

            <label className="auth-checkbox" htmlFor="register-terms">
              <input
                id="register-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                I acknowledge the{' '}
                <Link href="/#scholarships" style={{ color: 'var(--primary)' }}>
                  Academic Integrity
                </Link>{' '}
                guidelines and consent to role-based access controls.
              </span>
            </label>

            <button
              type="button"
              className="button-primary button-block"
              onClick={handleStudentRegistration}
              disabled={isAuthenticating}
            >
              <Chrome size={18} />
              {isAuthenticating ? 'Connecting...' : 'Continue With Google'}
              {!isAuthenticating ? <ArrowRight size={16} /> : null}
            </button>
          </div>

          <div className="auth-footer">
            <p>
              Already have access?{' '}
              <Link href="/login" style={{ color: 'var(--secondary)', fontWeight: 800 }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-proof">
          <span className="auth-proof__item">
            <span className="auth-proof__dot" style={{ background: 'var(--secondary)' }} />
            Google OAuth Only
          </span>
          <span className="auth-proof__item">
            <span className="auth-proof__dot" style={{ background: 'var(--tertiary)' }} />
            Admin Controlled Staff Access
          </span>
        </div>
      </main>

      <PublicFooter
        compact
        links={footerLinks}
        tagline="(c) 2024 EDUHUB. The Digital Curator."
      />
    </div>
  )
}
