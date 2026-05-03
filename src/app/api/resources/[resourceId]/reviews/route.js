import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  listResourceReviews,
  createResourceReview,
  moderateResourceReview,
  respondToResourceReview,
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

export async function PATCH(request, { params }) {
  try {
    const { resourceId } = params
    const session = await requireApiSession(request, ['faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    
    const { reviewId, action, status, response: replyText } = body

    if (!resourceId || !reviewId) {
      return NextResponse.json({ error: 'Resource ID and Review ID are required.' }, { status: 400 })
    }

    const allReviews = await listResourceReviews(resourceId)
    const reviewExists = allReviews.find(r => r.id === reviewId)
    
    if (!reviewExists) {
      return NextResponse.json({ error: 'Review not found for this resource.' }, { status: 400 })
    }

    let updatedReview
    if (action === 'moderate') {
      if (session.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can moderate reviews.' }, { status: 403 })
      }
      updatedReview = await moderateResourceReview({ reviewId, status })
    } else {
      updatedReview = await respondToResourceReview({ 
        reviewId, 
        response: replyText,
        responder: {
          uid: session.uid,
          name: session.name || session.email,
          role: session.role
        }
      })
    }

    return withNoStore(
      NextResponse.json({
        review: updatedReview,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not update review.')
  }
}
