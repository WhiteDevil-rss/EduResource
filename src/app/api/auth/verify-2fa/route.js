import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertRequestNotBlocked, assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { createSessionCookie } from '@/lib/session-cookie'
import {
  createAuditRecord,
  createSessionRecord,
  touchUserLogin,
} from '@/lib/server-data'
import {
  verifyTwoFactorChallenge,
  detectNewDeviceAndAlert,
  getSecurityControlsRecord,
} from '@/lib/auth-security'
import { validateChallengeId, validateOtpCode } from '@/lib/request-validation'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    await assertRequestNotBlocked(request)
    const body = await request.json().catch(() => ({}))
    const challengeId = validateChallengeId(body?.challengeId)
    const otp = validateOtpCode(body?.otp)

    const verifiedUser = await verifyTwoFactorChallenge({ challengeId, otp })

    if (!verifiedUser?.uid || !verifiedUser?.role) {
      return withNoStore(NextResponse.json({ error: 'Could not complete verification.' }, { status: 401 }))
    }

    const securityControls = await getSecurityControlsRecord().catch(() => null)

    const sessionId = crypto.randomUUID()
    let sessionRegistryCreated = false

    try {
      await createSessionRecord({
        sessionId,
        uid: verifiedUser.uid,
        role: verifiedUser.role,
        email: verifiedUser.email,
        name: verifiedUser.name,
        authProvider: 'credentials',
        userAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
      })
      sessionRegistryCreated = true
      await touchUserLogin(verifiedUser.uid)
      await createAuditRecord({
        actorUid: verifiedUser.uid,
        actorRole: verifiedUser.role,
        action: 'auth.credentials.login.2fa',
        targetId: verifiedUser.uid,
        targetRole: verifiedUser.role,
        message: `2FA login granted for ${verifiedUser.email}.`,
      })
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

      console.warn(`Post-2FA persistence failed: ${message || error}`)
    }

    await detectNewDeviceAndAlert({
      user: verifiedUser,
      request,
      alertsEnabled: Boolean(securityControls?.enableAlerts),
    }).catch(() => null)

    const sessionCookie = await createSessionCookie({
      ...(sessionRegistryCreated ? { sid: sessionId } : {}),
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: verifiedUser.role,
      status: verifiedUser.status || 'active',
      authProvider: 'credentials',
      name: verifiedUser.name || null,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })

    const response = withNoStore(
      NextResponse.json({
        user: {
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          displayName: verifiedUser.name,
          role: verifiedUser.role,
          status: verifiedUser.status || 'active',
          authProvider: 'credentials',
        },
        role: verifiedUser.role,
      })
    )

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
      path: '/',
    })

    await logAction({
      user: {
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        name: verifiedUser.name,
        role: verifiedUser.role,
      },
      action: 'LOGIN',
      description: 'Credential login successful after 2FA verification.',
      module: 'Auth',
      status: 'SUCCESS',
      request,
      targetId: verifiedUser.uid,
      targetRole: verifiedUser.role,
    }).catch(() => {})

    return response
  } catch (error) {
    return jsonError(error, '2FA verification failed.')
  }
}
