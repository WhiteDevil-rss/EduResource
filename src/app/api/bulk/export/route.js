import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  ApiError,
} from '@/lib/api-security'
import { requireRole } from '@/lib/rbac-middleware'
import { logAction } from '@/lib/audit-log'
import { logActivity } from '@/lib/activity-log'
import { getUserRecordById, getResourceRecordById } from '@/lib/server-data'

/**
 * Generate CSV content from user records
 */
function generateUserCSV(users) {
  const headers = ['ID', 'Email', 'Display Name', 'Role', 'Status', 'Created At']
  const rows = users.map((user) => [
    user.id || '',
    user.email || '',
    user.displayName || '',
    user.role || '',
    user.status || 'active',
    user.createdAt ? new Date(user.createdAt).toISOString() : '',
  ])

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csvContent
}

/**
 * Generate CSV content from resource records
 */
function generateResourceCSV(resources) {
  const headers = [
    'ID',
    'Title',
    'Subject',
    'Class',
    'Resource Type',
    'Uploaded By',
    'Upload Date',
    'Downloads',
  ]
  const rows = resources.map((resource) => [
    resource.id || '',
    resource.title || '',
    resource.subject || '',
    resource.class || '',
    resource.resourceType || '',
    resource.uploadedBy || '',
    resource.createdAt ? new Date(resource.createdAt).toISOString() : '',
    resource.downloads || 0,
  ])

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csvContent
}

/**
 * POST /api/bulk/export
 * Export multiple users or resources as CSV
 * Only admin and faculty can use this endpoint
 */
export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request)
    requireRole(session, ['admin', 'faculty'])

    const body = await request.json()
    const { ids = [], type } = body

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'No items selected for export.')
    }

    if (!type || !['user', 'resource'].includes(type)) {
      throw new ApiError(400, 'Invalid item type. Must be "user" or "resource".')
    }

    // Faculty can only export their own resources
    if (session.role === 'faculty' && type === 'user') {
      throw new ApiError(403, 'Faculty cannot export user accounts.')
    }

    const items = []
    const failedIds = []

    if (type === 'user') {
      // Only admin can export users
      if (session.role !== 'admin') {
        throw new ApiError(403, 'Only admins can export user accounts.')
      }

      for (const userId of ids) {
        try {
          const user = await getUserRecordById(userId)
          if (user) {
            items.push(user)
          } else {
            failedIds.push(userId)
          }
        } catch {
          failedIds.push(userId)
        }
      }
    } else if (type === 'resource') {
      for (const resourceId of ids) {
        try {
          const resource = await getResourceRecordById(resourceId)
          if (resource) {
            // Faculty can only export their own resources
            if (session.role === 'faculty' && resource.uploadedBy !== session.uid) {
              failedIds.push(resourceId)
            } else {
              items.push(resource)
            }
          } else {
            failedIds.push(resourceId)
          }
        } catch {
          failedIds.push(resourceId)
        }
      }
    }

    // Generate CSV
    let csvContent
    if (type === 'user') {
      csvContent = generateUserCSV(items)
    } else {
      csvContent = generateResourceCSV(items)
    }

    // Log the export action
    await logAction({
      user: session,
      action: 'BULK_EXPORT',
      description: `Exported ${items.length} ${type}(s) to CSV. Failed: ${failedIds.length}`,
      module: type === 'user' ? 'User Management' : 'Resources',
      status: items.length > 0 ? 'SUCCESS' : 'FAILED',
      request,
      metadata: {
        type,
        exportedCount: items.length,
        failedCount: failedIds.length,
      },
    })

    if (items.length > 0) {
      await logActivity({
        userId: session.uid,
        userName: session.displayName || session.name,
        userEmail: session.email,
        role: session.role,
        action: 'DOWNLOAD_RESOURCE',
        description: `Bulk exported ${items.length} ${type === 'user' ? 'user' : 'resource'} records to CSV`,
        metadata: {
          bulkAction: true,
          itemType: type,
          exportedCount: items.length,
        },
      })
    }

    // Return CSV as file download
    const filename = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const session = await requireApiSession(request).catch(() => null)
    await logAction({
      user: session,
      action: 'BULK_EXPORT',
      description: `Bulk export operation failed.`,
      module: 'Bulk Operations',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return jsonError(error)
  }
}
