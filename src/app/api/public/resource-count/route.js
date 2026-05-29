import { NextResponse } from 'next/server'
import { listResourceRecords } from '@/lib/server-data'
import { applyRateLimit, jsonError } from '@/lib/api-security'

function withPublicCache(response) {
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
  response.headers.set('Content-Security-Policy', "default-src 'self'")
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  return response
}

export async function GET(request) {
  try {
    applyRateLimit(request, 'public')
    const resources = await listResourceRecords()
    const publishedResourceCount = resources.filter((entry) => entry.status === 'live').length

    return withPublicCache(NextResponse.json({ publishedResourceCount }))
  } catch (error) {
    if (error?.status === 429) {
      return jsonError(error, 'Rate limit exceeded.', 429)
    }

    const message = String(error?.message || '')

    // Keep the home page experience stable when Firestore is temporarily unavailable.
    if (message.includes('Privileged Firebase access is not configured') || message.includes('NOT_FOUND')) {
      return withPublicCache(NextResponse.json({ publishedResourceCount: 0 }))
    }

    return jsonError(error, 'Could not load resource count.')
  }
}

