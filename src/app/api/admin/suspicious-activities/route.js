import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  getSessionFromRequest,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import {
  buildSuspiciousActivitiesCsv,
  listSuspiciousActivities,
  logSuspiciousActivity,
  markSuspiciousActivityReviewed,
} from '@/lib/suspicious-activity'
import { sanitizePlainText, validatePagination } from '@/lib/request-validation'

async function requireSuperAdmin(request) {
  const session = await requireApiSession(request, ['admin'])
  if (!isSuperAdmin(session)) {
    await logSuspiciousActivity({
      user: session,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      description: 'Attempted access to suspicious activity logs without super admin privileges.',
      severity: 'HIGH',
      request,
      dedupeWindowSeconds: 45,
      metadata: {
        endpoint: '/api/admin/suspicious-activities',
      },
    }).catch(() => null)

    throw new ApiError(403, 'Access restricted to super admin only.')
  }

  return session
}

export async function GET(request) {
  try {
    const session = await requireSuperAdmin(request)

    const url = new URL(request.url)
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    )
    const severity = sanitizePlainText(url.searchParams.get('severity') || '', { maxLength: 20, collapseWhitespace: true }).toLowerCase()
    const user = sanitizePlainText(url.searchParams.get('user') || '', { maxLength: 160, collapseWhitespace: true })
    const from = sanitizePlainText(url.searchParams.get('from') || '', { maxLength: 40, collapseWhitespace: true })
    const to = sanitizePlainText(url.searchParams.get('to') || '', { maxLength: 40, collapseWhitespace: true })
    const search = sanitizePlainText(url.searchParams.get('search') || '', { maxLength: 160, collapseWhitespace: true })
    const format = sanitizePlainText(url.searchParams.get('format') || '', { maxLength: 12, collapseWhitespace: true }).toLowerCase()
    const exportCsv = format === 'csv'

    const result = await listSuspiciousActivities({
      page,
      limit,
      severity,
      user,
      from,
      to,
      search,
      includeAll: exportCsv,
    })

    if (exportCsv) {
      const csv = buildSuspiciousActivitiesCsv(result.entries)

      await logAction({
        user: session,
        action: 'EXPORT_SUSPICIOUS_ACTIVITIES',
        description: `Exported ${result.entries.length} suspicious activity records to CSV.`,
        module: 'Security Monitoring',
        status: 'SUCCESS',
        request,
        metadata: {
          total: result.pagination.total,
          filters: { severity, user, from, to, search },
        },
      }).catch(() => null)

      return withNoStore(
        new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="suspicious-activities-${new Date().toISOString().split('T')[0]}.csv"`,
          },
        })
      )
    }

    return withNoStore(
      NextResponse.json({
        activities: result.entries,
        pagination: result.pagination,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load suspicious activities.')
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request)
    const session = await requireSuperAdmin(request)
    const body = await request.json().catch(() => ({}))
    const activityId = sanitizePlainText(body?.activityId || '', { maxLength: 128, collapseWhitespace: true })

    if (!activityId) {
      throw new ApiError(400, 'Activity ID is required.')
    }

    await markSuspiciousActivityReviewed({ activityId, reviewer: session })

    await logAction({
      user: session,
      action: 'REVIEW_SUSPICIOUS_ACTIVITY',
      description: `Reviewed suspicious activity entry ${activityId}.`,
      module: 'Security Monitoring',
      status: 'SUCCESS',
      request,
      targetId: activityId,
      targetRole: 'security-event',
    }).catch(() => null)

    return withNoStore(NextResponse.json({ success: true }))
  } catch (error) {
    return jsonError(error, 'Could not update suspicious activity entry.')
  }
}

export async function POST(request) {
  // Defensive no-op endpoint to avoid misuse.
  try {
    const session = await getSessionFromRequest(request)
    if (!session || !isSuperAdmin(session)) {
      throw new ApiError(403, 'Access restricted to super admin only.')
    }

    throw new ApiError(405, 'Method not allowed.')
  } catch (error) {
    return jsonError(error)
  }
}
