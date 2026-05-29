import 'server-only'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { getBlockedIpRecordByIp, getSessionRecordById, getUserRecordById } from '@/lib/server-data'
import { readSessionCookie } from '@/lib/session-cookie'

export class ApiError extends Error {
  constructor(status, message, retryAfter = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

const rateLimitStores = new Map()

export function rateLimit(key, limit, windowMs = 60000) {
  const now = Date.now()
  if (!rateLimitStores.has(key)) {
    rateLimitStores.set(key, [])
  }
  
  const timestamps = rateLimitStores.get(key)
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs)
  
  if (validTimestamps.length >= limit) {
    const oldestValid = validTimestamps[0]
    const retryAfter = Math.ceil((oldestValid + windowMs - now) / 1000)
    return { allowed: false, retryAfter }
  }
  
  validTimestamps.push(now)
  rateLimitStores.set(key, validTimestamps)

  // Periodic memory leak cleanup
  if (rateLimitStores.size > 2000) {
    for (const [k, ts] of rateLimitStores.entries()) {
      const valid = ts.filter(t => now - t < 60000)
      if (valid.length === 0) {
        rateLimitStores.delete(k)
      } else {
        rateLimitStores.set(k, valid)
      }
    }
  }

  return { allowed: true }
}

export function applyRateLimit(request, limitType = 'public') {
  const ip = normalizeRequestIp(request) || '127.0.0.1'
  const key = `ip:${ip}:${limitType}`
  let limit = 20
  const windowMs = 60000

  if (limitType === 'auth') {
    limit = 5
  } else if (limitType === 'llm' || limitType === 'cost-heavy') {
    limit = 10
  }

  const check = rateLimit(key, limit, windowMs)
  if (!check.allowed) {
    throw new ApiError(429, `Rate limit exceeded. Please try again after ${check.retryAfter} seconds.`, check.retryAfter)
  }
}

const ALLOWED_CORS_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3000',
])

function addSecurityHeaders(response, request = null) {
  if (request) {
    const origin = request.headers.get('origin')
    if (origin && ALLOWED_CORS_ORIGINS.has(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    }
  }

  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Content-Security-Policy', "default-src 'self'")
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  return response
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

  // Handle Cloudflare/reverse proxy protocol and host headers
  const headers = request.headers
  const proto = headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')
  const host = headers.get('x-forwarded-host') || new URL(request.url).host
  const requestOrigin = `${proto}://${host}`

  // Normalize protocols for comparison (e.g. behind SSL-terminating proxies)
  const normOrigin = origin.replace(/^http:/, 'https:')
  const normRequestOrigin = requestOrigin.replace(/^http:/, 'https:')

  if (normOrigin !== normRequestOrigin) {
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
  assertSameOrigin(request)
  const session = await getSessionFromRequest(request)

  if (!session) {
    throw new ApiError(401, 'Authentication required.')
  }

  // Rate limit authenticated user: 60 requests/min/user
  const key = `user:${session.uid}`
  const check = rateLimit(key, 60, 60000)
  if (!check.allowed) {
    throw new ApiError(429, `Rate limit exceeded. Please try again after ${check.retryAfter} seconds.`, check.retryAfter)
  }

  if (session.status && session.status !== 'active') {
    throw new ApiError(403, 'Your account is currently disabled.')
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new ApiError(403, 'You are not allowed to access this resource.')
  }

  return session
}

export function withNoStore(response, request = null) {
  return addSecurityHeaders(response, request)
}

export function jsonError(error, fallbackMessage = 'Request failed.', status = null) {
  const resolvedStatus = status || Number(error?.status) || 500
  const message = (resolvedStatus < 500 && error?.message) ? error.message : fallbackMessage
  
  if (resolvedStatus >= 500) {
    console.error('[SERVER_ERROR]', error)
  }

  const response = NextResponse.json({ error: message }, { status: resolvedStatus })
  
  if (resolvedStatus === 429) {
    const retryAfter = error?.retryAfter || 60
    response.headers.set('Retry-After', String(retryAfter))
  }

  return addSecurityHeaders(response)
}
