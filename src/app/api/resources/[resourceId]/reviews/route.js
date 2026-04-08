import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  createResourceReview,
  listResourceReviews,
  moderateResourceReview,
  respondToResourceReview,
} from '@/lib/server-data'

export async function GET(request, { params }) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const { resourceId } = await params
    const reviews = await listResourceReviews(resourceId, { includeHidden: session.role !== 'student' })
    return withNoStore(NextResponse.json({ reviews }))
  } catch (error) {
    return jsonError(error, 'Could not load reviews.')
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const { resourceId } = await params
    const body = await request.json().catch(() => ({}))
    const review = await createResourceReview({
      resourceId,
      reviewer: session,
      rating: body?.rating,
      comment: body?.comment,
    })
    return withNoStore(NextResponse.json({ review }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not submit review.')
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireApiSession(request, ['faculty', 'admin'])
    const { resourceId } = await params
    const body = await request.json().catch(() => ({}))
    const reviewId = String(body?.reviewId || '').trim()
    if (!reviewId) {
      return jsonError(new Error('Review ID is required.'), 'Could not update review.', 400)
    }

    const reviews = await listResourceReviews(resourceId, { includeHidden: true })
    const matchingReview = reviews.find((entry) => String(entry.id || '') === reviewId)
    if (!matchingReview) {
      return jsonError(new Error('Review does not belong to this resource.'), 'Could not update review.', 400)
    }

    if (body?.action === 'moderate') {
      const review = await moderateResourceReview({
        reviewId,
        moderator: session,
        status: body?.status,
      })
      return withNoStore(NextResponse.json({ review }))
    }

    const review = await respondToResourceReview({
      reviewId,
      responder: session,
      response: body?.response,
      status: body?.status,
    })

    return withNoStore(NextResponse.json({ review }))
  } catch (error) {
    return jsonError(error, 'Could not update review.')
  }
}
