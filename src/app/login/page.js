'use client'

import {
  AlertCircle,
  Chrome,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  LogIn,
  Shield,
  UserCircle,
  GraduationCap,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { getRedirectResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import PublicFooter from '@/components/PublicFooter'
import PublicHeader from '@/components/PublicHeader'
import { useAuth } from '@/hooks/useAuth'
import { getPublicHeaderContent } from '@/lib/public-nav'

const footerLinks = [
  { label: 'Privacy Policy', href: '/register' },
  { label: 'Terms of Service', href: '/register' },
  { label: 'Academic Integrity', href: '/#scholarships' },
  { label: 'Support', href: '/#archive' },
]

export default function Login() {
  const pathname = usePathname()
  const [loginMode, setLoginMode] = useState('staff') // 'staff' or 'student'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpTimeLeft, setOtpTimeLeft] = useState(0)
  
  const {
    loginWithCredentials,
    verifyTwoFactorCode,
    resendTwoFactorCode,
    loginWithGoogle,
    signInWithGoogleStudent,
    user,
    role,
    loading,
    isAuthenticating,
  } = useAuth()
  
  const router = useRouter()
  const redirectCheckStartedRef = useRef(false)
  const { links: navLinks, actions: navActions } = getPublicHeaderContent(pathname)

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      router.replace(`/dashboard/${role}`)
    }
  }, [loading, role, router, user])

  // Handle unauthorized reason from URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('reason') === 'unauthorized') {
      setUnauthorized(true)
      setSessionExpired(false)
    } else if (params.get('reason') === 'session-expired') {
      setUnauthorized(false)
      setSessionExpired(true)
    }
  }, [])

  // Handle Google Redirect Result
  useEffect(() => {
    if (redirectCheckStartedRef.current) return
    redirectCheckStartedRef.current = true

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result) {
          const idToken = await result.user.getIdToken()
          await loginWithGoogle(idToken)
        }
      } catch (error) {
        setFormError(error.message || 'Google sign-in failed.')
      }
    }
    checkRedirect()
  }, [loginWithGoogle])

  const handleStaffSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!email || !password) {
      setFormError('Please enter both Email/ID and Password.')
      return
    }

    try {
      const response = await loginWithCredentials(email, password)
      if (response?.requiresTwoFactor) {
        setTwoFactorChallenge(response)
        setOtpCode('')
        setFormSuccess('Verification code sent. Enter the OTP to continue.')
        return
      }
      setFormSuccess('Signed in successfully.')
    } catch (error) {
      setFormError(error.message || 'Failed to sign in.')
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!twoFactorChallenge?.challengeId) {
      setFormError('Verification session expired. Please sign in again.')
      return
    }

    if (!otpCode || otpCode.length < 6) {
      setFormError('Enter the 6-digit verification code.')
      return
    }

    try {
      await verifyTwoFactorCode(twoFactorChallenge.challengeId, otpCode)
      setFormSuccess('Verification successful.')
    } catch (error) {
      setFormError(error.message || 'Verification failed.')
    }
  }

  const handleResendOtp = async () => {
    if (!twoFactorChallenge?.challengeId) {
      return
    }

    setFormError('')
    try {
      const payload = await resendTwoFactorCode(twoFactorChallenge.challengeId)
      setTwoFactorChallenge((current) =>
        current
          ? {
              ...current,
              expiresAt: payload?.expiresAt || current.expiresAt,
              ...(payload?.otpPreview ? { otpPreview: payload.otpPreview } : {}),
            }
          : current
      )
      setFormSuccess('A new verification code was sent.')
    } catch (error) {
      setFormError(error.message || 'Could not resend verification code.')
    }
  }

  useEffect(() => {
    if (!twoFactorChallenge?.expiresAt) {
      setOtpTimeLeft(0)
      return undefined
    }

    const tick = () => {
      const expiresAtMs = Date.parse(twoFactorChallenge.expiresAt)
      if (!Number.isFinite(expiresAtMs)) {
        setOtpTimeLeft(0)
        return
      }

      const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
      setOtpTimeLeft(remainingSeconds)
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)
    return () => window.clearInterval(intervalId)
  }, [twoFactorChallenge?.expiresAt])

  const handleStudentLogin = async () => {
    setFormError('')
    setFormSuccess('')
    try {
      await signInWithGoogleStudent()
    } catch (error) {
      setFormError(error.message || 'Student login failed.')
    }
  }

  return (
    <div className="auth-page">
      <PublicHeader
        links={navLinks}
        actions={navActions}
      />

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mode-selector">
            <button
              className={`auth-mode-btn ${loginMode === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setLoginMode('staff')
                setTwoFactorChallenge(null)
                setOtpCode('')
                setFormError('')
                setFormSuccess('')
              }}
            >
              <UserCircle size={20} />
              <span>Academic Staff</span>
            </button>
            <button
              className={`auth-mode-btn ${loginMode === 'student' ? 'active' : ''}`}
              onClick={() => {
                setLoginMode('student')
                setTwoFactorChallenge(null)
                setOtpCode('')
                setFormError('')
                setFormSuccess('')
              }}
            >
              <GraduationCap size={20} />
              <span>Student Portal</span>
            </button>
          </div>

          <div className="auth-header" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <h1>{loginMode === 'staff' ? 'Staff Login' : 'Student Access'}</h1>
            <p>
              {loginMode === 'staff'
                ? 'Sign in with your institutional credentials.'
                : 'Secure access via your verified Google account.'}
            </p>
          </div>

          {unauthorized && (
            <div className="auth-alert" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} color="var(--tertiary)" />
              <span>Your account does not have permission to access that area.</span>
            </div>
          )}

          {sessionExpired && (
            <div className="auth-alert" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} color="var(--tertiary)" />
              <span>Session expired. Please login again.</span>
            </div>
          )}

          {formError && (
            <div className="auth-alert auth-alert--error">
              <AlertCircle size={18} color="var(--tertiary)" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="auth-alert auth-alert--success">
              <Shield size={18} color="var(--primary)" />
              <span>{formSuccess}</span>
            </div>
          )}

          {loginMode === 'staff' ? twoFactorChallenge ? (
            <form className="auth-form" onSubmit={handleVerifyOtp}>
              <div className="auth-alert" style={{ background: 'var(--background-secondary)', border: 'none' }}>
                <Shield size={18} color="var(--secondary)" />
                <span>
                  Two-factor verification required ({twoFactorChallenge.method}).
                </span>
              </div>

              <div className="auth-field">
                <label htmlFor="otp">Verification Code</label>
                <div className="auth-input">
                  <span className="auth-input__icon">
                    <Lock size={18} />
                  </span>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>
              </div>

              <div className="auth-alert" style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>
                <Clock size={18} color="var(--secondary)" />
                <span>Code expires in {Math.floor(otpTimeLeft / 60)}:{String(otpTimeLeft % 60).padStart(2, '0')}</span>
              </div>

              {twoFactorChallenge?.otpPreview ? (
                <div className="auth-alert" style={{ marginTop: '0.5rem' }}>
                  <AlertCircle size={18} color="var(--tertiary)" />
                  <span>Dev OTP preview: {twoFactorChallenge.otpPreview}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className="button-primary button-block"
                disabled={isAuthenticating || otpTimeLeft <= 0}
                style={{ marginTop: '1rem' }}
              >
                {isAuthenticating ? (
                  <Loader2 size={18} className="icon-spin" />
                ) : (
                  <Shield size={18} />
                )}
                {isAuthenticating ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                className="button-secondary button-block"
                onClick={handleResendOtp}
                disabled={isAuthenticating}
                style={{ marginTop: '0.75rem' }}
              >
                Resend OTP
              </button>

              <button
                type="button"
                className="button-secondary button-block"
                onClick={() => {
                  setTwoFactorChallenge(null)
                  setOtpCode('')
                  setFormError('')
                  setFormSuccess('')
                }}
                disabled={isAuthenticating}
                style={{ marginTop: '0.75rem' }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleStaffSubmit}>
              <div className="auth-field">
                <label htmlFor="email">Email or Login ID</label>
                <div className="auth-input">
                  <span className="auth-input__icon">
                    <UserCircle size={18} />
                  </span>
                  <input
                    id="email"
                    type="text"
                    placeholder="Enter your email or ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <div className="auth-input">
                  <span className="auth-input__icon">
                    <Lock size={18} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-input__toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="button-primary button-block"
                disabled={isAuthenticating}
                style={{ marginTop: '1rem' }}
              >
                {isAuthenticating ? (
                  <Loader2 size={18} className="icon-spin" />
                ) : (
                  <LogIn size={18} />
                )}
                {isAuthenticating ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="auth-student-flow">
              <div className="auth-alert" style={{ background: 'var(--background-secondary)', border: 'none' }}>
                <Chrome size={18} color="var(--secondary)" />
                <span>Single Sign-On is required for all students.</span>
              </div>
              
              <button
                type="button"
                className="button-primary button-block"
                onClick={handleStudentLogin}
                disabled={isAuthenticating}
                style={{ marginTop: '2rem', height: '3.5rem', fontSize: '1rem' }}
              >
                {isAuthenticating ? (
                  <Loader2 size={18} className="icon-spin" />
                ) : (
                  <Chrome size={20} />
                )}
                {isAuthenticating ? 'Authenticating...' : 'Sign in with Google'}
              </button>
              
              <p className="auth-footer-note" style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>
                New students will be automatically registered on their first login.
              </p>
            </div>
          )}
        </div>

        <div className="auth-footer__trust">Authenticated Ecosystem</div>
      </main>

      <PublicFooter
        links={footerLinks}
        tagline={`© ${new Date().getFullYear()} SPS EDUCATIONAM. Zembaa Solution.`}
      />
    </div>
  )
}
