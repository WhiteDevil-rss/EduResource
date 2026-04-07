import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { auth } from '@/lib/firebase-edge'
import { createSessionCookie } from '@/lib/session-cookie'
import { createAuditRecord, createSessionRecord, resolveStudentGoogleUser } from '@/lib/server-data'

export async function POST(request) {
  try {
    assertSameOrigin(request)

    const body = await request.json()
    const idToken = String(body?.idToken || '').trim()
    if (!idToken) {
      return withNoStore(
        NextResponse.json({ error: 'Google identity token is required.' }, { status: 400 })
      )
    }

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error('Token verification failed:', error.message)
      await logAction({
        user: null,
        action: 'LOGIN',
        description: 'Student Google login failed: invalid or expired token.',
        module: 'Auth',
        status: 'FAILED',
        request,
      }).catch(() => {})
      return withNoStore(
        NextResponse.json({ error: 'Invalid or expired Google token.' }, { status: 401 })
      )
    }
    if (decoded?.firebase?.sign_in_provider !== 'google.com') {
      await logAction({
        user: { uid: decoded?.uid || null, email: decoded?.email || null, role: 'student' },
        action: 'LOGIN',
        description: 'Student login rejected: non-Google sign-in provider.',
        module: 'Auth',
        status: 'FAILED',
        request,
      }).catch(() => {})
      return withNoStore(
        NextResponse.json(
          { error: 'Student access is available only through Google sign-in.' },
          { status: 403 }
        )
      )
    }

    const student = await resolveStudentGoogleUser(decoded)
    if (student.role !== 'student') {
      return withNoStore(
        NextResponse.json(
          { error: 'This Google account is not authorized for the student portal.' },
          { status: 403 }
        )
      )
    }

    if (student.status !== 'active') {
      await logAction({
        user: { uid: student.uid, name: student.displayName, email: student.email, role: 'student' },
        action: 'LOGIN',
        description: 'Student login blocked: disabled account.',
        module: 'Auth',
        status: 'FAILED',
        request,
      }).catch(() => {})
      return withNoStore(
        NextResponse.json(
          { error: 'This student account is currently disabled.' },
          { status: 403 }
        )
      )
    }

    const sessionId = crypto.randomUUID()
    let sessionRegistryCreated = false

    try {
      await createSessionRecord({
        sessionId,
        uid: student.uid,
        role: 'student',
        email: student.email,
        name: student.displayName || null,
        authProvider: 'google',
        userAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
      })
      sessionRegistryCreated = true

      await createAuditRecord({
        actorUid: student.uid,
        actorRole: 'student',
        action: 'auth.student.login',
        targetId: student.uid,
        targetRole: 'student',
        message: `Student login granted for ${student.email}.`,
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

      console.warn(`Session registry update failed: ${message || error}`)
    }

    const sessionCookie = await createSessionCookie({
      ...(sessionRegistryCreated ? { sid: sessionId } : {}),
      uid: student.uid,
      email: student.email,
      role: 'student',
      status: student.status,
      authProvider: 'google',
      name: student.displayName || null,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })

    const response = withNoStore(
      NextResponse.json({
        user: student,
        role: 'student',
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
      user: { uid: student.uid, name: student.displayName, email: student.email, role: 'student' },
      action: 'LOGIN',
      description: 'Student Google login successful.',
      module: 'Auth',
      status: 'SUCCESS',
      request,
      targetId: student.uid,
      targetRole: 'student',
    }).catch(() => {})

    return response
  } catch (error) {
    const message = String(error?.message || '')
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
      description: 'Student Google login failed.',
      module: 'Auth',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return jsonError(error, 'Google student sign-in failed.')
  }
}
