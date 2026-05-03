import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  listResourceReviews,
  createResourceReview,
} from '@/lib/server-data'

export async function GET(request, { params }) {
  try {
    const { resourceId } = params
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    
    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
    }

    const reviews = await listResourceReviews(resourceId)

    return withNoStore(
      NextResponse.json({
        reviews,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load reviews.')
  }
}

export async function POST(request, { params }) {
  try {
    const { resourceId } = params
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    
    const { rating, comment } = body

    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 })
    }

    if (!rating) {
      return NextResponse.json({ error: 'Rating is required.' }, { status: 400 })
    }

    const review = await createResourceReview({
      resourceId,
      reviewer: {
        uid: session.uid,
        name: session.name || session.email,
        email: session.email,
        role: session.role,
      },
      rating,
      comment: String(comment || '').trim(),
    })

    return withNoStore(
      NextResponse.json({
        review,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not submit review.')
  }
}
