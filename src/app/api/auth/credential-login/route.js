import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertRequestNotBlocked, assertSameOrigin, withNoStore } from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { signInWithPassword } from '@/lib/firebase-rest-auth'
import { createSessionCookie } from '@/lib/session-cookie'
import { RequestTimer } from '@/lib/timing-instrumentation'
import {
  clearFailedLoginAttempts,
  createTwoFactorChallenge,
  detectNewDeviceAndAlert,
  emitSuspiciousActivityAlert,
  getSecurityControlsRecord,
  isLoginLocked,
  recordFailedLoginAttempt,
} from '@/lib/auth-security'
import { logSuspiciousActivity } from '@/lib/suspicious-activity'
import { isSuperAdminEmail } from '@/lib/admin-protection'
import {
  createAuditRecord,
  createSessionRecord,
  findUserRecordByEmail,
  findUserRecordByLoginId,
  getUserRecordById,
  touchUserLogin,
} from '@/lib/server-data'

function getFriendlyCredentialMessage(error) {
  const message = String(error?.message || '')
  if (
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.includes('INVALID_PASSWORD') ||
    message.includes('EMAIL_NOT_FOUND')
  ) {
    return 'Invalid email or password.'
  }

  if (message.includes('USER_DISABLED')) {
    return 'This account is currently disabled.'
  }

  return message || 'Credential sign-in failed.'
}

function inferRoleFromIdentifier(identifier = '', email = '') {
  const probe = `${identifier} ${email}`.toLowerCase()
  if (probe.includes('admin') || isSuperAdminEmail(email)) {
    return 'admin'
  }

  return 'faculty'
}

function shouldPromoteToAdmin(identifier = '', email = '') {
  const probe = `${identifier} ${email}`.toLowerCase()
  return probe.includes('admin') || isSuperAdminEmail(email)
}


function isCredentialAuthError(message = '') {
  return (
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.includes('INVALID_PASSWORD') ||
    message.includes('EMAIL_NOT_FOUND') ||
    message.includes('INVALID_EMAIL')
  )
}

function isConfigurationError(message = '') {
  return (
    message.includes('Missing NEXT_PUBLIC_FIREBASE_API_KEY') ||
    message.includes('Missing FIREBASE_API_KEY') ||
    message.includes('Missing FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY') ||
    message.includes('CONFIGURATION_NOT_FOUND') ||
    message.includes('API key not valid')
  )
}

export async function POST(request) {
  const timer = new RequestTimer('credential-login')
  try {
    assertSameOrigin(request)
    await assertRequestNotBlocked(request)
    timer.markPhase('request-validation')

    const body = await request.json()
    const loginIdentifier = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const isEmailIdentifier = loginIdentifier.includes('@')

    if (!loginIdentifier || !password) {
      await logAction({
        user: { email: loginIdentifier || null, role: 'admin' },
        action: 'LOGIN',
        description: 'Credential login failed: missing email/login ID or password.',
        module: 'Auth',
        status: 'FAILED',
        request,
      }).catch(() => {})
      return withNoStore(
        NextResponse.json(
          { error: 'Email/login ID and password are required.' },
          { status: 400 }
        )
      )
    }

    const securityControls = await getSecurityControlsRecord().catch(() => null)
    const maxLoginAttempts = Number(securityControls?.maxLoginAttempts || 5)
    const lockDurationMinutes = Number(securityControls?.lockDurationMinutes || 15)
    const alertsEnabled = Boolean(securityControls?.enableAlerts)
    const twoFactorEnabled = Boolean(securityControls?.enable2FA)
    const twoFactorMethod = String(securityControls?.twoFAMethod || 'email')
    timer.markPhase('security-controls')

    const lockCheck = await isLoginLocked(loginIdentifier)
    timer.markPhase('lock-check')
    if (lockCheck.locked) {
      await logSuspiciousActivity({
        user: { email: loginIdentifier },
        action: 'FAILED_LOGIN',
        description: 'Blocked login attempt against a temporarily locked account.',
        severity: 'HIGH',
        request,
        dedupeWindowSeconds: 90,
      }).catch(() => null)

      if (alertsEnabled) {
        await emitSuspiciousActivityAlert({
          user: { email: loginIdentifier },
          reason: 'Blocked login due to account lockout threshold',
          request,
        }).catch(() => null)
      }

      return withNoStore(
        NextResponse.json(
          {
            error: `Too many failed attempts. Account temporarily locked until ${new Date(lockCheck.lockedUntil).toLocaleString()}.`,
          },
          { status: 429 }
        )
      )
    }

    let recordByEmailInput = null
    let recordByLoginIdInput = null
    let lookupFailed = false
    try {
      recordByEmailInput = await findUserRecordByEmail(loginIdentifier)
      recordByLoginIdInput = recordByEmailInput
        ? null
        : await findUserRecordByLoginId(loginIdentifier)
    } catch {
      // Firestore lookup is required when using login IDs.
      lookupFailed = true
      recordByEmailInput = null
      recordByLoginIdInput = null
    }
    timer.markPhase('profile-lookup')

    const resolvedRecord = recordByEmailInput || recordByLoginIdInput

    if (!isEmailIdentifier) {
      if (lookupFailed) {
        await logAction({
          user: { email: loginIdentifier || null, role: 'admin' },
          action: 'LOGIN',
          description: 'Credential login failed: login directory lookup unavailable.',
          module: 'Auth',
          status: 'FAILED',
          request,
        }).catch(() => {})
        return withNoStore(
          NextResponse.json(
            { error: 'Login directory lookup failed. Please try again in a moment.' },
            { status: 503 }
          )
        )
      }

      if (!resolvedRecord?.user?.email) {
        const failedAttempt = await recordFailedLoginAttempt({
          identifier: loginIdentifier,
          maxLoginAttempts,
          lockDurationMinutes,
          request,
        })

        if (alertsEnabled && failedAttempt.locked) {
          await emitSuspiciousActivityAlert({
            user: { email: loginIdentifier },
            reason: 'Multiple failed login attempts detected',
            request,
          }).catch(() => null)
        }

        if (failedAttempt.attempts >= Math.max(3, maxLoginAttempts - 1)) {
          await logSuspiciousActivity({
            user: { email: loginIdentifier },
            action: 'FAILED_LOGIN',
            description: `Repeated failed login attempts detected (${failedAttempt.attempts}).`,
            severity: failedAttempt.locked ? 'HIGH' : 'MEDIUM',
            request,
            dedupeWindowSeconds: 60,
            metadata: { attempts: failedAttempt.attempts },
          }).catch(() => null)
        }

        await logAction({
          user: { email: loginIdentifier || null, role: 'admin' },
          action: 'LOGIN',
          description: 'Credential login failed: invalid login ID.',
          module: 'Auth',
          status: 'FAILED',
          request,
        }).catch(() => {})
        return withNoStore(
          NextResponse.json(
            { error: 'Invalid login ID or password.' },
            { status: 401 }
          )
        )
      }
    }

    const accountEmail = String(
      resolvedRecord?.user?.email || loginIdentifier
    ).toLowerCase()

    const canonicalLockCheck = await isLoginLocked(accountEmail)
    if (canonicalLockCheck.locked) {
      return withNoStore(
        NextResponse.json(
          {
            error: `Too many failed attempts. Account temporarily locked until ${new Date(canonicalLockCheck.lockedUntil).toLocaleString()}.`,
          },
          { status: 429 }
        )
      )
    }

    let result
    try {
      result = await signInWithPassword(accountEmail, password)
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('USER_DISABLED')) {
        await logAction({
          user: { email: accountEmail || null, role: 'admin' },
          action: 'LOGIN',
          description: 'Credential login blocked: disabled account.',
          module: 'Auth',
          status: 'FAILED',
          request,
        }).catch(() => {})
        return withNoStore(
          NextResponse.json({ error: 'This account is currently disabled.' }, { status: 403 })
        )
      }

      if (isConfigurationError(message)) {
        return withNoStore(
          NextResponse.json(
            {
              error:
                'Authentication provider is not configured correctly. Check FIREBASE_API_KEY (or NEXT_PUBLIC_FIREBASE_API_KEY) and Firebase project settings.',
            },
            { status: 500 }
          )
        )
      }

      if (isCredentialAuthError(message)) {
        const failedAttempt = await recordFailedLoginAttempt({
          identifier: accountEmail || loginIdentifier,
          maxLoginAttempts,
          lockDurationMinutes,
          request,
        })

        if (alertsEnabled && failedAttempt.locked) {
          await emitSuspiciousActivityAlert({
            user: { email: accountEmail || loginIdentifier },
            reason: 'Multiple failed login attempts detected',
            request,
          }).catch(() => null)
        }

        if (failedAttempt.attempts >= Math.max(3, maxLoginAttempts - 1)) {
          await logSuspiciousActivity({
            user: { email: accountEmail || loginIdentifier },
            action: 'FAILED_LOGIN',
            description: `Credential login failures nearing lock threshold (${failedAttempt.attempts}).`,
            severity: failedAttempt.locked ? 'HIGH' : 'MEDIUM',
            request,
            dedupeWindowSeconds: 60,
            metadata: { attempts: failedAttempt.attempts },
          }).catch(() => null)
        }

        await logAction({
          user: { email: accountEmail || null, role: 'admin' },
          action: 'LOGIN',
          description: 'Credential login failed: invalid credentials.',
          module: 'Auth',
          status: 'FAILED',
          request,
        }).catch(() => {})
        return withNoStore(
          NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
        )
      }

      return withNoStore(
        NextResponse.json({ error: 'Credential sign-in is temporarily unavailable.' }, { status: 503 })
      )
    }
    timer.markPhase('password-verification')

    const [recordByUid, recordByResolvedEmail] = await Promise.all([
      getUserRecordById(result.uid).catch(() => null),
      findUserRecordByEmail(accountEmail).catch(() => null),
    ])

    const resolvedUser =
      recordByUid ||
      recordByResolvedEmail?.user ||
      resolvedRecord?.user ||
      null
    timer.markPhase('user-record-resolution')

    if (resolvedUser?.isBlocked) {
      return withNoStore(
        NextResponse.json({ error: 'Your account is blocked.' }, { status: 403 })
      )
    }

    const accountRole = shouldPromoteToAdmin(loginIdentifier, result.email || accountEmail)
      ? 'admin'
      : resolvedUser?.role || inferRoleFromIdentifier(loginIdentifier, result.email || accountEmail)

    const effectiveUser =
      resolvedUser ||
      {
        uid: result.uid,
        email: result.email || accountEmail,
        displayName: (result.email || accountEmail).split('@')[0],
        role: accountRole,
        status: 'active',
        authProvider: 'credentials',
      }

    effectiveUser.role = accountRole
    if (accountRole === 'admin') {
      effectiveUser.status = 'active'
    }

    if (effectiveUser.role === 'student') {
      await logAction({
        user: { uid: effectiveUser.uid || null, name: effectiveUser.displayName, email: effectiveUser.email, role: effectiveUser.role },
        action: 'LOGIN',
        description: 'Credential login rejected: student must use Google portal.',
        module: 'Auth',
        status: 'FAILED',
        request,
      }).catch(() => {})
      return withNoStore(
        NextResponse.json(
          { error: 'Students must sign in using the Google Student Portal.' },
          { status: 403 }
        )
      )
    }

    const authProvider = String(effectiveUser.authProvider || '').toLowerCase()
    const isCredentialProvider =
      !authProvider ||
      authProvider === 'credentials' ||
      authProvider === 'credential' ||
      authProvider === 'password' ||
      authProvider === 'email' ||
      authProvider === 'unknown'

    if (!isCredentialProvider) {
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    if (effectiveUser.status !== 'active') {
      return withNoStore(
        NextResponse.json({ error: 'This account is currently disabled.' }, { status: 403 })
      )
    }

    if (!result?.uid) {
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    void clearFailedLoginAttempts(accountEmail || loginIdentifier).catch(() => null)

    if (twoFactorEnabled) {
      const challenge = await createTwoFactorChallenge({
        user: {
          uid: result.uid,
          email: effectiveUser.email,
          role: effectiveUser.role,
          displayName: effectiveUser.displayName || null,
          status: effectiveUser.status || 'active',
        },
        method: twoFactorMethod,
        request,
        ttlMinutes: 5,
      })

      await logAction({
        user: {
          uid: result.uid,
          name: effectiveUser.displayName || null,
          email: effectiveUser.email,
          role: effectiveUser.role,
        },
        action: 'LOGIN_2FA_REQUIRED',
        description: `2FA challenge issued via ${challenge.method}.`,
        module: 'Auth',
        status: 'SUCCESS',
        request,
        targetId: result.uid,
        targetRole: effectiveUser.role,
      }).catch(() => {})

      return withNoStore(
        NextResponse.json(
          {
            requiresTwoFactor: true,
            challengeId: challenge.challengeId,
            expiresAt: challenge.expiresAt,
            method: challenge.method,
            ...(challenge.otpPreview ? { otpPreview: challenge.otpPreview } : {}),
          },
          { status: 202 }
        )
      )
    }

    const sessionId = crypto.randomUUID()
    let sessionRegistryCreated = false

    try {
      await createSessionRecord({
        sessionId,
        uid: result.uid,
        role: effectiveUser.role,
        email: effectiveUser.email,
        name: effectiveUser.displayName || null,
        authProvider: 'credentials',
        userAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
      })
      sessionRegistryCreated = true
      await Promise.allSettled([
        touchUserLogin(result.uid),
        createAuditRecord({
          actorUid: result.uid,
          actorRole: effectiveUser.role,
          action: 'auth.credentials.login',
          targetId: result.uid,
          targetRole: effectiveUser.role,
          message: `${effectiveUser.role} login granted for ${effectiveUser.email}.`,
        }),
      ])
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('You can only be signed in on 2 devices at a time')) {
        return withNoStore(
          NextResponse.json(
            {
              error:
                'You can only be signed in on 2 devices at a time. Log out from another device and try again.',
            },
            { status: 403 }
          )
        )
      }

      // Do not block successful credential auth when profile/audit persistence is unavailable.
      console.warn(`Post-login persistence failed: ${message || error}`)
    }
    timer.markPhase('session-creation')

    const sessionCookie = await createSessionCookie({
      ...(sessionRegistryCreated ? { sid: sessionId } : {}),
      uid: result.uid,
      email: effectiveUser.email,
      role: effectiveUser.role,
      status: effectiveUser.status,
      authProvider: 'credentials',
      name: effectiveUser.displayName || null,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })
    timer.markPhase('cookie-creation')

    const response = withNoStore(
      NextResponse.json({
        user: {
          ...effectiveUser,
          uid: result.uid,
        },
        role: effectiveUser.role,
      })
    )
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
      path: '/',
    })

    void detectNewDeviceAndAlert({
      user: {
        uid: result.uid,
        email: effectiveUser.email,
      },
      request,
      alertsEnabled,
    }).catch(() => null)

    void logAction({
      user: {
        uid: result.uid,
        name: effectiveUser.displayName || null,
        email: effectiveUser.email,
        role: effectiveUser.role,
      },
      action: 'LOGIN',
      description: 'Credential login successful.',
      module: 'Auth',
      status: 'SUCCESS',
      request,
      targetId: result.uid,
      targetRole: effectiveUser.role,
    }).catch(() => {})

    timer.markPhase('response-complete')
    response.headers.set('X-Request-Timing-Ms', String(timer.getTotalDuration()))
    timer.logReport()
    return response
  } catch (error) {
    const message = String(error?.message || '')
    if (
      message.includes('FIREBASE_PRIVATE_KEY') ||
      message.includes('FIREBASE_CLIENT_EMAIL')
    ) {
      return withNoStore(
        NextResponse.json(
          {
            error:
              'Server authentication is not properly configured. Please check your environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).',
          },
          { status: 500 }
        )
      )
    }

    if (message.includes('NOT_FOUND')) {
      return withNoStore(
        NextResponse.json(
          {
            error:
              'Authentication backend is partially configured. Firestore database is missing or inaccessible for the configured project.',
          },
          { status: 500 }
        )
      )
    }

    if (message.includes('You can only be signed in on 2 devices at a time')) {
      return withNoStore(
        NextResponse.json(
          { error: 'You can only be signed in on 2 devices at a time. Log out from another device and try again.' },
          { status: 403 }
        )
      )
    }

    await logAction({
      user: null,
      action: 'LOGIN',
      description: 'Credential login failed.',
      module: 'Auth',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return withNoStore(
      NextResponse.json(
        { error: getFriendlyCredentialMessage(error) },
        { status: error?.status || 401 }
      )
    )
  }
}
