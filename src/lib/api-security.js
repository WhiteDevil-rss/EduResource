import 'server-only'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { readSessionCookie } from '@/lib/session-cookie'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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

export function getSessionFromRequest(request) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!sessionCookie) {
    return null
  }

  const session = readSessionCookie(sessionCookie)
  if (!session?.uid || !session?.role) {
    return null
  }

  return session
}

export function requireApiSession(request, allowedRoles = null) {
  const session = getSessionFromRequest(request)

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
