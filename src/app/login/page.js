'use client'

import {
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Loader2,
  LogIn,
  Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleVerified, setGoogleVerified] = useState(false)
  const [googleIdToken, setGoogleIdToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const {
    loginWithCredentials,
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

  const handleGoogleVerification = async () => {
    setFormError('')
    setFormSuccess('')

    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail) {
      setFormError('Enter your Gmail ID before verification.')
      return
    }

    if (!normalizedEmail.endsWith('@gmail.com')) {
      setFormError('Enter a valid Gmail ID.')
      return
    }

    setIsVerifying(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      const idToken = await result.user.getIdToken(true)
      const userEmail = result.user.email?.toLowerCase()

      if (!userEmail || !userEmail.endsWith('@gmail.com')) {
        await signOut(auth).catch(() => {})
        setFormError('Invalid or unverified Gmail ID')
        return
      }

      if (userEmail !== normalizedEmail) {
        await signOut(auth).catch(() => {})
        setFormError('Google account does not match the entered Gmail ID.')
        return
      }

      setEmail(userEmail)
      setGoogleIdToken(idToken)
      setGoogleVerified(true)
      setFormSuccess('Gmail ID verified successfully. Enter your password to continue.')
    } catch (error) {
      setFormError('Invalid or unverified Gmail ID')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!googleVerified) {
      setFormError('Please verify your Gmail ID with Google before signing in.')
      return
    }

    if (!password) {
      setFormError('Enter your password to sign in.')
      return
    }

    try {
      await loginWithCredentials(email, password, googleIdToken)
      setFormSuccess('Signed in successfully.')
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('Incorrect password')) {
        setFormError('Incorrect password')
      } else if (message.includes('Invalid Google verification token')) {
        setFormError('Invalid or unverified Gmail ID')
      } else {
        setFormError(message || 'Failed to sign in.')
      }
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
            <p>Sign in with your Gmail ID and password.</p>
          </div>

          {unauthorized ? (
            <div className="auth-alert" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} color="var(--tertiary)" />
              <span>Your account does not have permission to open that dashboard.</span>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-alert">
              <Chrome size={18} color="var(--secondary)" />
              <span>First, verify your Gmail ID with Google authentication.</span>
            </div>

            {formError ? (
              <div className="auth-alert auth-alert--error">
                <AlertCircle size={18} color="var(--tertiary)" />
                <span>{formError}</span>
              </div>
            ) : null}

            {formSuccess ? (
              <div className="auth-alert auth-alert--success">
                <Shield size={18} color="var(--primary)" />
                <span>{formSuccess}</span>
              </div>
            ) : null}

            <div className="auth-field">
              <label htmlFor="email">Gmail ID</label>
              <div className="auth-input">
                <span className="auth-input__icon">
                  <KeyRound size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your Gmail ID"
                  value={email}
                  onChange={(event) => {
                    if (!googleVerified) {
                      setEmail(event.target.value)
                    }
                  }}
                  readOnly={googleVerified}
                  style={googleVerified ? { backgroundColor: 'var(--background-secondary)' } : undefined}
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
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={!googleVerified}
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

            {googleVerified ? (
              <div className="auth-note">
                <Shield size={16} />
                <span>Verified Gmail ID: <strong>{email}</strong></span>
              </div>
            ) : null}

            <button
              type="button"
              className="button-secondary button-block"
              onClick={handleGoogleVerification}
              disabled={isAuthenticating || isVerifying}
            >
              {isVerifying ? <Loader2 size={18} className="icon-spin" /> : <Chrome size={18} />}
              {isVerifying ? 'Verifying...' : googleVerified ? 'Gmail Verified' : 'Verify Gmail ID'}
            </button>

            <button type="submit" className="button-primary button-block" disabled={isAuthenticating || isVerifying || !googleVerified}>
              <LogIn size={18} />
              {isAuthenticating ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
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
