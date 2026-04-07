import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { listBookmarkedResourcesByStudent } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student'])
    const resources = await listBookmarkedResourcesByStudent(session.uid)

    return withNoStore(
      NextResponse.json({
        resources,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load bookmarks.')
  }
}
