import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'
import { getAdminAuth, assertPrivilegedFirebaseAccess } from '@/lib/firebase-admin'
import { createSessionCookie } from '@/lib/session-cookie'
import { createAuditRecord, resolveStudentGoogleUser } from '@/lib/server-data'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    assertPrivilegedFirebaseAccess()

    const body = await request.json()
    const idToken = String(body?.idToken || '').trim()
    if (!idToken) {
      return withNoStore(
        NextResponse.json({ error: 'Google identity token is required.' }, { status: 400 })
      )
    }

    const adminAuth = await getAdminAuth()
    if (!adminAuth) {
      return withNoStore(
        NextResponse.json({ error: 'Firebase Admin not configured. Check environment variables.' }, { status: 500 })
      )
    }

    let decoded
    try {
      decoded = await adminAuth.verifyIdToken(idToken)
    } catch (error) {
      console.error('Token verification failed:', error.message)
      return withNoStore(
        NextResponse.json({ error: 'Invalid or expired Google token.' }, { status: 401 })
      )
    }
    if (decoded?.firebase?.sign_in_provider !== 'google.com') {
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
      return withNoStore(
        NextResponse.json(
          { error: 'This student account is currently disabled.' },
          { status: 403 }
        )
      )
    }

    await createAuditRecord({
      actorUid: student.uid,
      actorRole: 'student',
      action: 'auth.student.login',
      targetId: student.uid,
      targetRole: 'student',
      message: `Student login granted for ${student.email}.`,
    })

    const sessionCookie = createSessionCookie({
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

    return response
  } catch (error) {
    return jsonError(error, 'Google student sign-in failed.')
  }
}
