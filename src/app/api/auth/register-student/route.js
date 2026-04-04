import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertSameOrigin, withNoStore } from '@/lib/api-security'
import { createSessionCookie } from '@/lib/session-cookie'
import { getAdminAuth } from '@/lib/firebase-admin'
import {
  createAuditRecord,
  createStudentAccount,
} from '@/lib/server-data'

export async function POST(request) {
  try {
    assertSameOrigin(request)

    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const googleIdToken = String(body?.googleIdToken || '').trim()

    if (!email || !password || !googleIdToken) {
      return withNoStore(
        NextResponse.json(
          { error: 'Email, password, and Google verification token are required.' },
          { status: 400 }
        )
      )
    }

    // Verify Gmail ID via Google authentication
    if (!email.endsWith('@gmail.com')) {
      return withNoStore(
        NextResponse.json(
          { error: 'Only Gmail addresses are allowed for student registration.' },
          { status: 400 }
        )
      )
    }

    const adminAuth = await getAdminAuth()
    if (!adminAuth) {
      return withNoStore(
        NextResponse.json(
          { error: 'Firebase Admin not configured. Check environment variables.' },
          { status: 500 }
        )
      )
    }

    // Verify the Google ID token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(googleIdToken)
    } catch (error) {
      return withNoStore(
        NextResponse.json(
          { error: 'Invalid or unverified Gmail ID' },
          { status: 401 }
        )
      )
    }

    // Ensure the token's email matches the provided email
    if (decodedToken.email.toLowerCase() !== email) {
      return withNoStore(
        NextResponse.json(
          { error: 'Invalid or unverified Gmail ID' },
          { status: 401 }
        )
      )
    }

    // Create the student account with password
    const result = await createStudentAccount({
      email,
      password,
      displayName: decodedToken.name || email.split('@')[0],
      googleIdToken,
    })

    await createAuditRecord({
      actorUid: result.user.uid,
      actorRole: 'student',
      action: 'user.student.self-registered',
      targetId: result.user.uid,
      targetRole: 'student',
      message: `Student account created for ${email}.`,
    })

    const sessionCookie = createSessionCookie({
      uid: result.user.uid,
      email: result.user.email,
      role: 'student',
      status: result.user.status,
      authProvider: 'credentials',
      name: result.user.displayName || null,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })

    const response = withNoStore(
      NextResponse.json({
        user: result.user,
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
    return withNoStore(
      NextResponse.json(
        { error: error?.message || 'Student registration failed.' },
        { status: error?.status || 500 }
      )
    )
  }
}