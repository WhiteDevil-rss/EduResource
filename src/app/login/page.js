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
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
// getRedirectResult will be imported dynamically
import { getFirebaseAuth } from '@/lib/firebase'
import PublicFooter from '@/components/PublicFooter'
import PublicHeader from '@/components/PublicHeader'
import { useAuth } from '@/hooks/useAuth'
import { getPublicHeaderContent } from '@/lib/public-nav'
import { getPostLoginRedirectPath } from '@/lib/admin-protection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

const footerLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Academic Integrity', href: '/#team' },
  { label: 'Support', href: '/#team' },
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
  const { links: navLinks, actions: navActions } = getPublicHeaderContent(pathname)

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
      {/* Premium background mesh */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.15),transparent_35%),radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.1),transparent_35%)] dark:bg-[radial-gradient(ellipse_at_20%_20%,rgba(129,140,248,0.2),transparent_30%),radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.15),transparent_30%)]" />
      </div>

      <PublicHeader
        links={navLinks}
        actions={navActions}
      />

      <main className="flex-1 w-full max-w-full overflow-x-hidden flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full max-w-xl">
          <Card className="border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <div className="p-1">
              <div className="bg-muted/50 rounded-[2.25rem] p-1 flex">
                <button
                  type="button"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[2rem] text-sm font-semibold transition-all",
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
                  <UserCircle size={18} />
                  <span>Faculty & Admin</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[2rem] text-sm font-semibold transition-all",
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
                  <GraduationCap size={18} />
                  <span>Student Portal</span>
                </button>
              </div>
            </div>

            <CardHeader className="pt-8 pb-4 text-center px-8">
              <Badge variant="outline" className="w-fit mx-auto mb-4 bg-primary/5 text-primary border-primary/20">
                Secure Authentication
              </Badge>
              <CardTitle className="text-3xl font-extrabold tracking-tight">
                {loginMode === 'staff' ? 'Workspace Access' : 'Student Entry'}
              </CardTitle>
              <CardDescription className="text-base pt-2">
                {loginMode === 'staff'
                  ? 'Access faculty and admin tools with enterprise protection.'
                  : 'Direct access to the verified student learning ecosystem.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 space-y-6">
              {/* Notifications / Alerts */}
              {(unauthorized || sessionExpired || formError) && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex gap-3 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="font-medium">
                    {unauthorized ? 'Access denied. Account lacks required permissions.' : 
                     sessionExpired ? 'Session expired. Please sign in again.' : formError}
                  </p>
                </div>
              )}

              {formSuccess && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex gap-3 text-sm">
                  <Shield size={18} className="shrink-0" />
                  <p className="font-medium">{formSuccess}</p>
                </div>
              )}

              {loginMode === 'staff' ? twoFactorChallenge ? (
                /* 2FA Form */
                <form className="space-y-6" onSubmit={handleVerifyOtp}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/20">
                    <Shield size={16} className="text-primary" />
                    <span>2FA required via {twoFactorChallenge.method}</span>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="otp" className="text-sm font-bold ml-1">Verification Code</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="000 000"
                        className="w-full h-12 pl-12 pr-4 bg-muted/50 border-input border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg tracking-[0.2em] font-mono"
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock size={14} />
                      <span>Expires in {Math.floor(otpTimeLeft / 60)}:{String(otpTimeLeft % 60).padStart(2, '0')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className={cn('text-primary font-bold hover:underline', (isAuthenticating || isResendingOtp) && 'pointer-events-none opacity-70')}
                      disabled={isAuthenticating || isResendingOtp}
                    >
                      {isResendingOtp ? 'Processing...' : 'Resend Code'}
                    </button>
                  </div>

                  {twoFactorChallenge?.otpPreview && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-3 rounded-xl text-xs flex items-center justify-between">
                      <span className="font-medium">Dev Preview:</span>
                      <code className="bg-white px-2 py-0.5 rounded font-black tracking-widest">{twoFactorChallenge.otpPreview}</code>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={cn('w-full h-12 rounded-2xl text-base font-bold', isAuthenticating && 'pointer-events-none')}
                    disabled={isAuthenticating || otpTimeLeft <= 0 || otpVerifyInFlightRef.current}
                  >
                    {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Shield className="w-5 h-5 mr-2" />}
                    {isAuthenticating ? 'Processing...' : 'Verify & Sign In'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-12 rounded-2xl text-muted-foreground font-semibold"
                    onClick={() => {
                      setTwoFactorChallenge(null)
                      setOtpCode('')
                      setFormError('')
                      setFormSuccess('')
                    }}
                    disabled={isAuthenticating}
                  >
                    Use different account
                  </Button>
                </form>
              ) : (
                /* Primary Login Form */
                <form className="space-y-6" onSubmit={handleStaffSubmit}>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-bold ml-1">Email or ID</label>
                    <div className="relative group">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                      <input
                        id="email"
                        type="text"
                        placeholder="john@educationam.com"
                        className="w-full h-12 pl-12 pr-4 bg-muted/50 border-input border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label htmlFor="password" title="Password" className="text-sm font-bold">Password</label>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="w-full h-12 pl-12 pr-12 bg-muted/50 border-input border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className={cn('w-full h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/20', isAuthenticating && 'pointer-events-none')}
                    disabled={isAuthenticating || staffSubmitInFlightRef.current}
                  >
                    {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                    {isAuthenticating ? 'Processing...' : 'Sign in to Dashboard'}
                  </Button>
                </form>
              ) : (
                /* Student Social Login */
                <div className="space-y-8 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-4 rounded-2xl border border-border/20 space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <GraduationCap size={20} />
                      </div>
                      <h4 className="font-bold text-sm">Direct Entry</h4>
                      <p className="text-xs text-muted-foreground leading-tight">Verified students are routed directly to resources.</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-2xl border border-border/20 space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Shield size={20} />
                      </div>
                      <h4 className="font-bold text-sm">Secure SSO</h4>
                      <p className="text-xs text-muted-foreground leading-tight">Google authentication keeps your session protected.</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className={cn('w-full h-14 rounded-2xl text-lg font-bold border-input border-2 hover:bg-muted transition-all flex gap-3', isAuthenticating && 'pointer-events-none')}
                    onClick={handleStudentLogin}
                    disabled={isAuthenticating || studentLoginInFlightRef.current}
                  >
                    {isAuthenticating ? <Loader2 size={24} className="animate-spin" /> : <Globe size={24} />}
                    {isAuthenticating ? 'Processing...' : 'Continue with Google'}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground leading-relaxed">
                    By continuing, you agree to the SPS EDUCATIONAM verified academic workspace guidelines.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="mt-8 flex justify-center items-center gap-6">
            <span className="w-8 h-px bg-border/40" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authenticated Education Platform</span>
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
