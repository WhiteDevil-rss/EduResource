import { NextResponse } from 'next/server'
import {
  ApiError,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { getActivityLogs } from '@/lib/activity-log'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Activity timeline access is restricted to super admin only.')
    }

    const url = new URL(request.url)
    const pageLimit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
    const userId = url.searchParams.get('userId') || null
    const action = url.searchParams.get('action') || null
    const startDateStr = url.searchParams.get('startDate')
    const endDateStr = url.searchParams.get('endDate')

    const filters = {
      limit: pageLimit,
      userId,
      action,
    }

    if (startDateStr) {
      try {
        filters.startDate = new Date(startDateStr)
      } catch {
        throw new ApiError(400, 'Invalid startDate format. Use ISO 8601 format.')
      }
    }

    if (endDateStr) {
      try {
        filters.endDate = new Date(endDateStr)
      } catch {
        throw new ApiError(400, 'Invalid endDate format. Use ISO 8601 format.')
      }
    }

    const activities = await getActivityLogs(filters)

    return withNoStore(
      NextResponse.json({
        activities,
        count: activities.length,
        limit: pageLimit,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load activity timeline.')
  }
}
