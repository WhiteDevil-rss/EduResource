'use client'

import {
  AlertCircle,
  Chrome,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
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
  { label: 'Privacy Policy', href: '/register' },
  { label: 'Terms of Service', href: '/register' },
  { label: 'Academic Integrity', href: '/#scholarships' },
  { label: 'Support', href: '/#archive' },
]

export default function Login() {
  const [mode, setMode] = useState('student')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const {
    loginWithCredentials,
    signInWithGoogleStudent,
    user,
    role,
    loading,
    isAuthenticating,
  } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && role) {
      router.replace(`/dashboard/${role}`)
    }
  }, [loading, role, router, user])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    setUnauthorized(params.get('reason') === 'unauthorized')
  }, [])

  const handleCredentialSubmit = async (event) => {
    event.preventDefault()
    try {
      await loginWithCredentials(loginId, password)
      toast.success('Signed in successfully.')
    } catch (error) {
      toast.error(error.message || 'Failed to sign in.')
    }
  }

  const handleStudentGoogleLogin = async () => {
    try {
      await signInWithGoogleStudent()
      toast.success('Signed in with Google.')
    } catch (error) {
      toast.error(error.message || 'Google sign-in failed.')
    }
  }

  return (
    <div className="auth-page">
      <PublicHeader
        links={[
          { label: 'Explore', href: '/#curriculum' },
          { label: 'Resources', href: '/#research' },
          { label: 'Institutions', href: '/#scholarships' },
          { label: 'About', href: '/#archive' },
        ]}
        actions={[{ label: 'Student Register', href: '/register', variant: 'primary' }]}
        showUtilityIcons
      />

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-header" style={{ textAlign: 'center' }}>
            <h1>Welcome Back</h1>
            <p>Choose the correct access path for your role.</p>
          </div>

          {unauthorized ? (
            <div className="auth-alert" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} color="var(--tertiary)" />
              <span>Your account does not have permission to open that dashboard.</span>
            </div>
          ) : null}

          <div className="auth-select">
            <span className="auth-select__label">Access Type</span>
            <div className="auth-select__grid">
              <button
                type="button"
                className={`auth-select__button ${mode === 'student' ? 'auth-select__button--active' : ''}`}
                onClick={() => setMode('student')}
              >
                <GraduationCap size={18} />
                Student
              </button>
              <button
                type="button"
                className={`auth-select__button ${mode === 'staff' ? 'auth-select__button--active' : ''}`}
                onClick={() => setMode('staff')}
              >
                <Shield size={18} />
                Faculty / Admin
              </button>
            </div>
          </div>

          {mode === 'student' ? (
            <div className="auth-form">
              <div className="auth-alert">
                <Chrome size={18} color="var(--secondary)" />
                <span>Students must sign in with Google. Email and password access is disabled for student accounts.</span>
              </div>

              <button
                type="button"
                className="button-primary button-block"
                onClick={handleStudentGoogleLogin}
                disabled={isAuthenticating}
              >
                <Chrome size={18} />
                {isAuthenticating ? 'Connecting...' : 'Continue With Google'}
              </button>

              <div className="auth-footer" style={{ marginTop: '0.5rem', paddingTop: '1.5rem' }}>
                <p>
                  New student?{' '}
                  <Link href="/register" style={{ color: 'var(--foreground)', fontWeight: 800 }}>
                    Register with Google
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleCredentialSubmit}>
              <div className="auth-alert">
                <KeyRound size={18} color="var(--secondary)" />
                <span>Faculty and admin credentials are issued only by the system administrator.</span>
              </div>

              <div className="auth-field">
                <label htmlFor="login-id">Login ID</label>
                <div className="auth-input">
                  <span className="auth-input__icon">
                    <KeyRound size={18} />
                  </span>
                  <input
                    id="login-id"
                    type="text"
                    autoComplete="username"
                    placeholder="faculty.id"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-form__row">
                  <label htmlFor="login-password">Password</label>
                  <span style={{ color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 700 }}>
                    Contact Admin for resets
                  </span>
                </div>
                <div className="auth-input">
                  <span className="auth-input__icon">
                    <Lock size={18} />
                  </span>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="********"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="button-primary button-block" disabled={isAuthenticating}>
                <LogIn size={18} />
                {isAuthenticating ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        <div className="auth-footer__trust">Authenticated Ecosystem</div>
      </main>

      <PublicFooter
        links={footerLinks}
        tagline="(c) 2024 EduResource Hub. Digital Curator Excellence."
      />
    </div>
  )
}
