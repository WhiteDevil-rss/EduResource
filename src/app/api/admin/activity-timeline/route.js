import { NextResponse } from 'next/server'
import {
  ApiError,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { getActivityLogs } from '@/lib/activity-log'
import { sanitizePlainText, validatePagination } from '@/lib/request-validation'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Activity timeline access is restricted to super admin only.')
    }

    const url = new URL(request.url)
    const { limit } = validatePagination('1', url.searchParams.get('limit'))
    const pageLimit = Math.min(limit, 200)
    const userId = sanitizePlainText(url.searchParams.get('userId') || '', { maxLength: 128, collapseWhitespace: true }) || null
    const action = sanitizePlainText(url.searchParams.get('action') || '', { maxLength: 80, collapseWhitespace: true }) || null
    const startDateStr = sanitizePlainText(url.searchParams.get('startDate') || '', { maxLength: 40, collapseWhitespace: true })
    const endDateStr = sanitizePlainText(url.searchParams.get('endDate') || '', { maxLength: 40, collapseWhitespace: true })

    const filters = {
      limit: pageLimit,
      userId,
      action,
    }

    if (startDateStr) {
      const parsedStartDate = new Date(startDateStr)
      if (Number.isNaN(parsedStartDate.getTime())) {
        throw new ApiError(400, 'Invalid startDate format. Use ISO 8601 format.')
      }
      filters.startDate = parsedStartDate
    }

    if (endDateStr) {
      const parsedEndDate = new Date(endDateStr)
      if (Number.isNaN(parsedEndDate.getTime())) {
        throw new ApiError(400, 'Invalid endDate format. Use ISO 8601 format.')
      }
      filters.endDate = parsedEndDate
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
