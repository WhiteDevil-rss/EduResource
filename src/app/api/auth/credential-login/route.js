import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertSameOrigin, withNoStore } from '@/lib/api-security'
import { signInWithPassword } from '@/lib/firebase-rest-auth'
import { createSessionCookie } from '@/lib/session-cookie'
import {
  createAuditRecord,
  findUserRecordByLoginId,
  touchUserLogin,
} from '@/lib/server-data'

function getFriendlyCredentialMessage(error) {
  const message = String(error?.message || '')
  if (
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.includes('INVALID_PASSWORD') ||
    message.includes('EMAIL_NOT_FOUND')
  ) {
    return 'Invalid login ID or password.'
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
    const loginId = String(body?.loginId || '').trim()
    const password = String(body?.password || '')

    if (!loginId || !password) {
      return withNoStore(
        NextResponse.json(
          { error: 'Login ID and password are required.' },
          { status: 400 }
        )
      )
    }

    const record = await findUserRecordByLoginId(loginId)
    if (!record || record.user.authProvider !== 'credentials') {
      return withNoStore(
        NextResponse.json({ error: 'Invalid login ID or password.' }, { status: 401 })
      )
    }

    if (!['faculty', 'admin'].includes(record.user.role)) {
      return withNoStore(
        NextResponse.json(
          { error: 'Credential sign-in is reserved for faculty and admin accounts.' },
          { status: 403 }
        )
      )
    }

    if (record.user.status !== 'active') {
      return withNoStore(
        NextResponse.json({ error: 'This account is currently disabled.' }, { status: 403 })
      )
    }

    const result = await signInWithPassword(record.user.email, password)
    if (!result?.uid || result.uid !== record.user.uid) {
      return withNoStore(
        NextResponse.json({ error: 'Invalid login ID or password.' }, { status: 401 })
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
      loginId: record.user.loginId,
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
