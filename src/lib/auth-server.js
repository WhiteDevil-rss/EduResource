import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { getSessionRecordById } from '@/lib/server-data'
import { readSessionCookie } from '@/lib/session-cookie'

export async function getSessionUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) {
    return { user: null, role: null, status: null }
  }

  const session = await readSessionCookie(sessionCookie)
  if (!session) {
    console.warn('Session verification failed: invalid or expired cookie')
    return { user: null, role: null, status: null }
  }

  if (session.sid) {
    const sessionRecord = await getSessionRecordById(session.sid)
    if (!sessionRecord || sessionRecord.uid !== session.uid) {
      console.warn('Session verification failed: revoked or missing session record')
      return { user: null, role: null, status: null }
    }
  }

  return {
    user: {
      uid: session.uid,
      email: session.email || null,
      name: session.name || null,
      loginId: session.loginId || null,
      role: session.role || null,
      status: session.status || 'active',
    },
    role: session.role,
    status: session.status || 'active',
    authProvider: session.authProvider || null,
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
