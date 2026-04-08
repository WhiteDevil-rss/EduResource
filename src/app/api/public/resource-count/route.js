import { NextResponse } from 'next/server'
import { listResourceRecords } from '@/lib/server-data'

function withPublicCache(response) {
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
  return response
}

export async function GET() {
  try {
    const resources = await listResourceRecords()
    const publishedResourceCount = resources.filter((entry) => entry.status === 'live').length

    return withPublicCache(NextResponse.json({ publishedResourceCount }))
  } catch (error) {
    const message = String(error?.message || '')

    // Keep the home page experience stable when Firestore is temporarily unavailable.
    if (message.includes('Privileged Firebase access is not configured') || message.includes('NOT_FOUND')) {
      return withPublicCache(NextResponse.json({ publishedResourceCount: 0 }))
    }

    return withPublicCache(
      NextResponse.json({ error: 'Could not load resource count.' }, { status: 500 })
    )
  }
}
