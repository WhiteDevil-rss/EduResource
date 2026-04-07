import 'server-only'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { getBlockedIpRecordByIp, getSessionRecordById, getUserRecordById } from '@/lib/server-data'
import { readSessionCookie } from '@/lib/session-cookie'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function normalizeRequestIp(request) {
  const directIp = String(request?.ip || '').trim()
  if (directIp) {
    return directIp.replace(/^::ffff:/, '')
  }

  const headers = request?.headers
  const forwarded = headers?.get('x-forwarded-for') || headers?.get('cf-connecting-ip') || headers?.get('x-real-ip') || ''
  return String(forwarded).split(',')[0].trim().replace(/^::ffff:/, '')
}

export async function assertRequestNotBlocked(request) {
  const ipAddress = normalizeRequestIp(request)
  if (!ipAddress) {
    return
  }

  const blocked = await getBlockedIpRecordByIp(ipAddress).catch(() => null)
  if (blocked) {
    throw new ApiError(403, 'Access denied. Your IP is blocked.')
  }
}

export function assertSameOrigin(request) {
  const method = String(request?.method || 'GET').toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return
  }

  const origin = request.headers.get('origin')
  if (!origin) {
    return
  }

  const requestOrigin = new URL(request.url).origin
  if (origin !== requestOrigin) {
    throw new ApiError(403, 'Cross-site request blocked.')
  }
}

export async function getSessionFromRequest(request) {
  await assertRequestNotBlocked(request)

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) {
    return null
  }

  const session = await readSessionCookie(sessionCookie)
  if (!session?.uid || !session?.role) {
    return null
  }

  if (session.sid) {
    const sessionRecord = await getSessionRecordById(session.sid)
    if (!sessionRecord || sessionRecord.uid !== session.uid) {
      return null
    }
  }

  const userRecord = await getUserRecordById(session.uid).catch(() => null)
  if (userRecord?.isBlocked) {
    throw new ApiError(403, 'Your account is blocked.')
  }

  return session
}

export async function requireApiSession(request, allowedRoles = null) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    throw new ApiError(401, 'Authentication required.')
  }

  if (session.status && session.status !== 'active') {
    throw new ApiError(403, 'Your account is currently disabled.')
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new ApiError(403, 'You are not allowed to access this resource.')
  }

  return session
}

export function withNoStore(response) {
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export function jsonError(error, fallbackMessage = 'Request failed.') {
  const status = Number(error?.status) || 500
  const message = error?.message || fallbackMessage
  return withNoStore(NextResponse.json({ error: message }, { status }))
}
