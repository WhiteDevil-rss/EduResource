import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { listResourceReviews } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])
    
    // Super-admin only
    if (session.role !== 'admin') {
      return jsonError(new Error('Unauthorized.'), 'Moderation access denied.', 403)
    }

    // Collect all reviews across all resources
    const allReviews = await listResourceReviews(null, { includeHidden: true })
    
    return withNoStore(NextResponse.json({ reviews: allReviews }))
  } catch (error) {
    return jsonError(error, 'Could not load moderation data.')
  }
}
