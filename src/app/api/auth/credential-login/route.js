import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertSameOrigin, withNoStore } from '@/lib/api-security'
import { signInWithPassword } from '@/lib/firebase-rest-auth'
import { createSessionCookie } from '@/lib/session-cookie'
import {
  createAuditRecord,
  findUserRecordByEmail,
  touchUserLogin,
} from '@/lib/server-data'
import { adminAuth } from '@/lib/firebase-admin'

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

export async function POST(request) {
  try {
    assertSameOrigin(request)

    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const googleIdToken = String(body?.googleIdToken || '').trim()

    if (!email || !password) {
      return withNoStore(
        NextResponse.json(
          { error: 'Email and password are required.' },
          { status: 400 }
        )
      )
    }

    // Verify Gmail ID via Google authentication
    if (!email.endsWith('@gmail.com')) {
      return withNoStore(
        NextResponse.json(
          { error: 'Only Gmail addresses are allowed for login.' },
          { status: 400 }
        )
      )
    }

    if (!googleIdToken) {
      return withNoStore(
        NextResponse.json(
          { error: 'Invalid or unverified Gmail ID' },
          { status: 401 }
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

    const record = await findUserRecordByEmail(email)
    if (!record || record.user.authProvider !== 'credentials') {
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    if (record.user.status !== 'active') {
      return withNoStore(
        NextResponse.json({ error: 'This account is currently disabled.' }, { status: 403 })
      )
    }

    let result
    try {
      result = await signInWithPassword(record.user.email, password)
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('INVALID_PASSWORD')) {
        return withNoStore(
          NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
        )
      }
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    if (!result?.uid || result.uid !== record.user.uid) {
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    await touchUserLogin(record.user.uid)
    await createAuditRecord({
      actorUid: record.user.uid,
      actorRole: record.user.role,
      action: 'auth.credentials.login',
      targetId: record.user.uid,
      targetRole: record.user.role,
      message: `${record.user.role} login granted for ${record.user.email}.`,
    })

    const sessionCookie = createSessionCookie({
      uid: record.user.uid,
      email: record.user.email,
      role: record.user.role,
      status: record.user.status,
      authProvider: 'credentials',
      name: record.user.displayName || null,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })

    const response = withNoStore(
      NextResponse.json({
        user: record.user,
        role: record.user.role,
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
        { error: getFriendlyCredentialMessage(error) },
        { status: error?.status || 401 }
      )
    )
  }
}
