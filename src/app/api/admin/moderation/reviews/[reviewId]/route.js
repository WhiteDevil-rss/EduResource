import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { moderateResourceReview } from '@/lib/server-data'

export async function PATCH(request, { params }) {
  try {
    const session = await requireApiSession(request, ['admin'])
    
    // Super-admin only
    if (session.role !== 'admin') {
      return jsonError(new Error('Unauthorized.'), 'Moderation access denied.', 403)
    }

    const { reviewId } = await params
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '').trim().toLowerCase()

    if (!['publish', 'hide'].includes(action)) {
      return jsonError(new Error('Invalid action.'), 'Action must be publish or hide.', 400)
    }

    const review = await moderateResourceReview({
      reviewId,
      moderator: session,
      status: action === 'publish' ? 'published' : 'hidden',
    })

    return withNoStore(NextResponse.json({ review }))
  } catch (error) {
    return jsonError(error, 'Could not moderate review.')
  }
}
