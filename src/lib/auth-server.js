import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { readSessionCookie } from '@/lib/session-cookie'

export async function getSessionUser() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) {
    return { user: null, role: null, status: null }
  }

  const session = readSessionCookie(sessionCookie)
  if (!session) {
    console.warn('Session verification failed: invalid or expired cookie')
    return { user: null, role: null, status: null }
  }

  return {
    user: {
      uid: session.uid,
      email: session.email || null,
    },
    role: session.role,
    status: session.status || 'active',
  }
}

export async function requireRole(allowedRoles, contextPath = '') {
  const { user, role, status } = await getSessionUser()

  if (!user || !role) {
    console.warn(`Unauthorized access to ${contextPath || 'protected route'}: missing session or role`)
    redirect('/login?reason=unauthorized')
  }

  if (status && status !== 'active') {
    console.warn(`Blocked user with status=${status} on ${contextPath || 'protected route'} uid=${user.uid}`)
    redirect('/login?reason=unauthorized')
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn(`Role mismatch on ${contextPath || 'protected route'}: uid=${user.uid} role=${role}`)
    redirect('/login?reason=unauthorized')
  }

  return { user, role }
}
