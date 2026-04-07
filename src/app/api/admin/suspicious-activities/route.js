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
    const page = Number(url.searchParams.get('page') || 1)
    const limit = Number(url.searchParams.get('limit') || 20)
    const severity = String(url.searchParams.get('severity') || '')
    const user = String(url.searchParams.get('user') || '')
    const from = String(url.searchParams.get('from') || '')
    const to = String(url.searchParams.get('to') || '')
    const search = String(url.searchParams.get('search') || '')
    const format = String(url.searchParams.get('format') || '').trim().toLowerCase()
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
    const activityId = String(body?.activityId || '').trim()

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
