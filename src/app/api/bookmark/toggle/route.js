import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { toggleBookmarkForStudent } from '@/lib/server-data'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['student'])
    const body = await request.json().catch(() => ({}))
    const resourceId = String(body?.resourceId || '').trim()

    if (!resourceId) {
      throw new ApiError(400, 'Resource ID is required.')
    }

    const result = await toggleBookmarkForStudent({
      studentUid: session.uid,
      resourceId,
    })

    await logAction({
      user: session,
      action: result.bookmarked ? 'BOOKMARK_RESOURCE' : 'UNBOOKMARK_RESOURCE',
      description: `${result.bookmarked ? 'Bookmarked' : 'Removed bookmark for'} resource ${resourceId}.`,
      module: 'Bookmarks',
      status: 'SUCCESS',
      request,
      targetId: resourceId,
      targetRole: 'resource',
    }).catch(() => {})

    return withNoStore(
      NextResponse.json({
        bookmarked: result.bookmarked,
        bookmarks: result.bookmarks,
      })
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['student']).catch(() => null),
      action: 'BOOKMARK_RESOURCE',
      description: 'Failed bookmark toggle attempt.',
      module: 'Bookmarks',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return jsonError(error, 'Could not update bookmark.')
  }
}
