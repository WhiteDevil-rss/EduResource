'use client'

import {
  AlertCircle,
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Loader2,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
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
  { label: 'Privacy Policy', href: '/login' },
  { label: 'Terms of Service', href: '/login' },
  { label: 'Support', href: '/#archive' },
]

function validatePassword(password) {
  if (!password) {
    return 'Password is required.'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.'
  }
  return ''
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleVerified, setGoogleVerified] = useState(false)
  const [googleIdToken, setGoogleIdToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { user, role, loading, isAuthenticating } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && role) {
      router.replace(`/dashboard/${role}`)
    }
  }, [loading, role, router, user])

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
      setFormSuccess('Gmail ID verified successfully. Now set your password.')
    } catch (error) {
      setFormError('Invalid or unverified Gmail ID')
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePasswordChange = (value) => {
    setPassword(value)
    if (value) {
      const error = validatePassword(value)
      setPasswordError(error)
    } else {
      setPasswordError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!googleVerified) {
      setFormError('Please verify your Gmail ID with Google before registering.')
      return
    }

    if (!password) {
      setFormError('Enter a password to create your account.')
      return
    }

    const passwordErr = validatePassword(password)
    if (passwordErr) {
      setFormError(passwordErr)
      return
    }

    if (!acceptedTerms) {
      setFormError('Please accept the Academic Integrity Guidelines and Terms of Service to continue.')
      return
    }

    try {
      const response = await fetch('/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          googleIdToken,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Registration failed.')
      }

      setFormSuccess('Student account created successfully. Redirecting to login...')
      setTimeout(() => {
        router.replace('/login')
      }, 1500)
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('already exists')) {
        setFormError('An account with this email already exists. Please sign in instead.')
      } else {
        setFormError(message || 'Registration failed.')
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
        actions={[{ label: 'Login', href: '/login', variant: 'ghost' }]}
        showUtilityIcons
      />

      <main className="auth-main auth-main--register">
        <div className="auth-card auth-card--register">
          <div className="auth-header" style={{ textAlign: 'center' }}>
            <h1>Student Registration</h1>
            <p>Create your student account with Gmail verification and password.</p>
          </div>

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
                  autoComplete="new-password"
                  placeholder="Create your password"
                  value={password}
                  onChange={(event) => handlePasswordChange(event.target.value)}
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
              {passwordError ? (
                <div className="auth-field__hint" style={{ color: 'var(--tertiary)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                  {passwordError}
                </div>
              ) : null}
            </div>

            {googleVerified ? (
              <div className="auth-note">
                <Shield size={16} />
                <span>Verified Gmail ID: <strong>{email}</strong></span>
              </div>
            ) : null}

            <div className="auth-field">
              <label className="auth-checkbox" htmlFor="register-terms">
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link href="/login" style={{ color: 'var(--foreground)', fontWeight: 800 }}>
                    Academic Integrity Guidelines
                  </Link>{' '}
                  and{' '}
                  <Link href="/login" style={{ color: 'var(--foreground)', fontWeight: 800 }}>
                    Terms of Service
                  </Link>
                </span>
              </label>
            </div>

            <button
              type="button"
              className="button-secondary button-block"
              onClick={handleGoogleVerification}
              disabled={isAuthenticating || isVerifying}
            >
              {isVerifying ? <Loader2 size={18} className="icon-spin" /> : <Chrome size={18} />}
              {isVerifying ? 'Verifying...' : googleVerified ? 'Gmail Verified' : 'Verify Gmail ID'}
            </button>

            <button type="submit" className="button-primary button-block" disabled={isAuthenticating || isVerifying || !googleVerified || passwordError}>
              <ArrowRight size={18} />
              {isAuthenticating ? 'Creating Account...' : 'Create Student Account'}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '0.5rem', paddingTop: '1.5rem' }}>
            <p>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--foreground)', fontWeight: 800 }}>
                Sign In
              </Link>
            </p>
          </div>
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
