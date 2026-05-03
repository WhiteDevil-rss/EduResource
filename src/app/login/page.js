'use client'

import {
  AlertCircle,
  Globe,
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
import { useCallback, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { getPostLoginRedirectPath } from '@/lib/admin-protection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

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
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  
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
    isNavigating,
    isSessionConfirmed,
  } = useAuth()
  
  const router = useRouter()
  const redirectCheckStartedRef = useRef(false)
  const redirectingToRef = useRef(null)
  const staffSubmitInFlightRef = useRef(false)
  const otpVerifyInFlightRef = useRef(false)
  const otpResendInFlightRef = useRef(false)
  const studentLoginInFlightRef = useRef(false)

  // Redirect if already logged in and session is confirmed by server
  useEffect(() => {
    if (!loading && user && role && isSessionConfirmed && !isNavigating) {
      const target = getPostLoginRedirectPath(user, role)
      
      // Prevent multiple redirection attempts to the same target
      if (redirectingToRef.current === target) {
        return
      }
      
      console.log(`[AUTH] Login page auto-redirect: session confirmed, navigating to ${target}`);
      redirectingToRef.current = target
      
      // Immediate browser-level redirection for maximum performance
      if (typeof window !== 'undefined') {
        window.location.replace(target)
      } else {
        router.replace(target)
      }
    }
  }, [loading, role, router, user, isNavigating, isSessionConfirmed])


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
        const authInstance = await getFirebaseAuth()
        if (!authInstance) return

        const { getRedirectResult } = await import('firebase/auth')
        const result = await getRedirectResult(authInstance)
        if (result) {
          const idToken = await result.user.getIdToken()
          await loginWithGoogle(idToken)
        }
      } catch (error) {
        console.error('[AUTH] Redirect result check failed:', error)
        setFormError(error.message || 'Google sign-in failed.')
      }
    }
    checkRedirect()
  }, [loginWithGoogle])

  const handleStaffSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (staffSubmitInFlightRef.current || isAuthenticating) {
      return
    }

    staffSubmitInFlightRef.current = true
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
    } finally {
      staffSubmitInFlightRef.current = false
    }
  }, [email, isAuthenticating, loginWithCredentials, password])

  const handleVerifyOtp = useCallback(async (event) => {
    event.preventDefault()
    if (otpVerifyInFlightRef.current || isAuthenticating) {
      return
    }

    otpVerifyInFlightRef.current = true
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
    } finally {
      otpVerifyInFlightRef.current = false
    }
  }, [isAuthenticating, otpCode, twoFactorChallenge, verifyTwoFactorCode])

  const handleResendOtp = useCallback(async () => {
    if (!twoFactorChallenge?.challengeId || otpResendInFlightRef.current || isAuthenticating) {
      return
    }

    otpResendInFlightRef.current = true
    setIsResendingOtp(true)
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
    } finally {
      setIsResendingOtp(false)
      otpResendInFlightRef.current = false
    }
  }, [isAuthenticating, resendTwoFactorCode, twoFactorChallenge])

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

  const handleStudentLogin = useCallback(async () => {
    if (studentLoginInFlightRef.current || isAuthenticating) {
      return
    }

    studentLoginInFlightRef.current = true
    setFormError('')
    setFormSuccess('')
    try {
      await signInWithGoogleStudent()
    } catch (error) {
      setFormError(error.message || 'Student login failed.')
    } finally {
      studentLoginInFlightRef.current = false
    }
  }, [isAuthenticating, signInWithGoogleStudent])

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
              <GraduationCap size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Choose your portal to continue</p>
          </div>

          <Card className="border-border/40 bg-card/50 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden">
            <div className="p-1.5 bg-muted/30 m-6 mb-2 rounded-2xl flex">
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all",
                  loginMode === 'staff' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setLoginMode('staff')
                  setTwoFactorChallenge(null)
                  setOtpCode('')
                  setFormError('')
                  setFormSuccess('')
                }}
              >
                <UserCircle size={16} />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all",
                  loginMode === 'student' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setLoginMode('student')
                  setTwoFactorChallenge(null)
                  setOtpCode('')
                  setFormError('')
                  setFormSuccess('')
                }}
              >
                <GraduationCap size={16} />
                <span>Student</span>
              </button>
            </div>

            <CardContent className="p-6 pt-4 space-y-6">
              {/* Notifications */}
              {(unauthorized || sessionExpired || formError) && (
                <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive flex gap-3 text-xs animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">
                    {unauthorized ? 'Access denied. Account lacks required permissions.' : 
                     sessionExpired ? 'Session expired. Please sign in again.' : formError}
                  </p>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-primary flex gap-3 text-xs animate-in fade-in zoom-in-95 duration-300">
                  <Shield size={16} className="shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">{formSuccess}</p>
                </div>
              )}

              {loginMode === 'staff' ? (
                twoFactorChallenge ? (
                  /* 2FA Form */
                  <form className="space-y-5" onSubmit={handleVerifyOtp}>
                    <div className="space-y-1.5 text-center pb-2">
                      <p className="text-xs text-muted-foreground">Verification code sent via {twoFactorChallenge.method}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                        <input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          placeholder="Verification Code"
                          className="w-full h-11 pl-11 pr-4 bg-muted/20 border-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center tracking-[0.3em] font-mono"
                          value={otpCode}
                          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold px-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock size={12} />
                        <span>{Math.floor(otpTimeLeft / 60)}:{String(otpTimeLeft % 60).padStart(2, '0')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className={cn('text-primary hover:underline', (isAuthenticating || isResendingOtp) && 'pointer-events-none opacity-70')}
                        disabled={isAuthenticating || isResendingOtp}
                      >
                        {isResendingOtp ? 'Sending...' : 'Resend Code'}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl text-sm font-bold shadow-sm"
                      disabled={isAuthenticating || otpTimeLeft <= 0 || otpVerifyInFlightRef.current}
                    >
                      {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                      Verify & Access
                    </Button>

                    <button
                      type="button"
                      className="w-full text-xs text-muted-foreground font-medium hover:text-foreground transition-colors pt-2"
                      onClick={() => setTwoFactorChallenge(null)}
                      disabled={isAuthenticating}
                    >
                      Use different account
                    </button>
                  </form>
                ) : (
                  /* Primary Login Form */
                  <form className="space-y-5" onSubmit={handleStaffSubmit}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="relative group">
                          <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                          <input
                            id="email"
                            type="text"
                            placeholder="Email or User ID"
                            className="w-full h-11 pl-11 pr-4 bg-muted/20 border-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Password"
                            className="w-full h-11 pl-11 pr-11 bg-muted/20 border-input border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl text-sm font-bold shadow-lg shadow-primary/10"
                      disabled={isAuthenticating || staffSubmitInFlightRef.current}
                    >
                      {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                      {isAuthenticating ? 'Authenticating...' : 'Sign In'}
                    </Button>
                  </form>
                )
              ) : (
                /* Student Social Login */
                <div className="space-y-6 text-center">
                  <div className="py-4 space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/40">
                      <Globe size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold">Student SSO</h3>
                      <p className="text-xs text-muted-foreground px-4">Login using your verified Google account to access resources.</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl text-sm font-bold border-2 flex gap-3 hover:bg-muted/50 transition-all shadow-sm"
                    onClick={handleStudentLogin}
                    disabled={isAuthenticating || studentLoginInFlightRef.current}
                  >
                    {isAuthenticating ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
                    {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
                  </Button>

                  <p className="text-[10px] text-muted-foreground px-6 leading-relaxed uppercase tracking-wider font-semibold">
                    Verified Academic Network Only
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Join here
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
