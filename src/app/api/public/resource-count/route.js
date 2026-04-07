import { NextResponse } from 'next/server'
import { listResourceRecords } from '@/lib/server-data'
import { withNoStore } from '@/lib/api-security'

export async function GET() {
  try {
    const resources = await listResourceRecords()
    const publishedResourceCount = resources.filter((entry) => entry.status === 'live').length

    return withNoStore(NextResponse.json({ publishedResourceCount }))
  } catch (error) {
    const message = String(error?.message || '')

    // Keep the home page experience stable when Firestore is temporarily unavailable.
    if (message.includes('Privileged Firebase access is not configured') || message.includes('NOT_FOUND')) {
      return withNoStore(NextResponse.json({ publishedResourceCount: 0 }))
    }

    return withNoStore(
      NextResponse.json({ error: 'Could not load resource count.' }, { status: 500 })
    )
  }
}
