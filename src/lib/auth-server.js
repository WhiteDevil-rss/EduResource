import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { getSessionRecordById } from '@/lib/server-data'
import { readSessionCookie } from '@/lib/session-cookie'

export async function getSessionUser() {
  let cookieStore;
  try {
    cookieStore = await cookies()
  } catch (error) {
    console.error('[AUTH] Cookie access error:', error.message);
    return { user: null, role: null, status: null };
  }

  if (!cookieStore) {
    return { user: null, role: null, status: null };
  }

  const cookiesSnapshot = cookieStore.getAll()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {

    return { user: null, role: null, status: null }
  }

  const session = await readSessionCookie(sessionCookie)
  if (!session) {

    return { user: null, role: null, status: null }
  }

  if (session.sid) {
    const sessionRecord = await getSessionRecordById(session.sid)
    if (!sessionRecord || sessionRecord.uid !== session.uid) {

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

    redirect('/login')
  }

  if (status && status !== 'active') {

    redirect('/login?reason=unauthorized')
  }

  if (allowedRoles && !allowedRoles.includes(role)) {

    redirect('/login?reason=unauthorized')
  }


  return { user, role }
}
