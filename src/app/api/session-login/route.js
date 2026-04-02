import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { verifyFirebaseSession } from '@/lib/firebase-rest-auth'
import { createSessionCookie } from '@/lib/session-cookie'

function canUseRoleFallback() {
  return process.env.NODE_ENV !== 'production'
}

export async function POST(request) {
  try {
    const body = await request.json()
    const idToken = body?.idToken
    const requestedRole = body?.role

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Invalid token.' }, { status: 400 })
    }

    let user
    let role
    let status

    try {
      const result = await verifyFirebaseSession(idToken)
      user = result.user
      role = result.role
      status = result.status
    } catch (error) {
      if (!canUseRoleFallback()) {
        throw error
      }

      if (!requestedRole || !['student', 'faculty', 'admin'].includes(requestedRole)) {
        throw error
      }

      const fallbackResult = await verifyFirebaseSession(idToken, { skipProfile: true })
      user = fallbackResult.user
      role = requestedRole
      status = 'active'
      console.warn(`Session login using development role fallback for uid=${user.uid} role=${role}`)
    }

    if (!role) {
      console.warn(`Session login denied: role missing for uid=${user.uid}`)
      return NextResponse.json({ error: 'Role missing.' }, { status: 403 })
    }

    if (status !== 'active') {
      console.warn(`Session login denied: status=${status} uid=${user.uid}`)
      return NextResponse.json({ error: 'Account inactive.' }, { status: 403 })
    }

    const sessionCookie = createSessionCookie({
      uid: user.uid,
      email: user.email,
      role,
      status,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })

    const response = NextResponse.json({ role })
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
      path: '/',
    })

    return response
  } catch (error) {
    console.warn('Session login error:', error?.message || error)
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
}
