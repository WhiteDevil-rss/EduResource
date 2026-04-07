import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  ApiError,
  withNoStore,
} from '@/lib/api-security'
import { requireRole } from '@/lib/rbac-middleware'
import { logAction } from '@/lib/audit-log'
import { logActivity } from '@/lib/activity-log'
import { deleteUserAndData, deleteResourceRecord, getResourceRecordById } from '@/lib/server-data'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
import { getUserRecordById } from '@/lib/server-data'

/**
 * POST /api/bulk/delete
 * Delete multiple users or resources in bulk
 * Only admin and faculty can use this endpoint
 * Enforces role-based restrictions and protected account rules
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
      throw new ApiError(400, 'No items selected for deletion.')
    }

    if (!type || !['user', 'resource'].includes(type)) {
      throw new ApiError(400, 'Invalid item type. Must be "user" or "resource".')
    }

    // Faculty can only delete their own resources
    if (session.role === 'faculty' && type === 'user') {
      throw new ApiError(403, 'Faculty cannot delete user accounts.')
    }

    const results = {
      deleted: [],
      failed: [],
      skipped: [],
    }

    if (type === 'user') {
      // Only admin can delete users
      if (session.role !== 'admin') {
        throw new ApiError(403, 'Only admins can delete user accounts.')
      }

      for (const userId of ids) {
        try {
          const targetUser = await getUserRecordById(userId)

          if (!targetUser) {
            results.skipped.push({
              id: userId,
              reason: 'User not found',
            })
            continue
          }

          // Protect admin accounts
          if (isProtectedAdminEmail(targetUser.email)) {
            results.skipped.push({
              id: userId,
              reason: 'Protected admin account cannot be deleted',
            })
            continue
          }

          await deleteUserAndData(userId)

          results.deleted.push({
            id: userId,
            email: targetUser.email,
            role: targetUser.role,
          })
        } catch (err) {
          results.failed.push({
            id: userId,
            reason: err.message,
          })
        }
      }
    } else if (type === 'resource') {
      for (const resourceId of ids) {
        try {
          const resource = await getResourceRecordById(resourceId)

          if (!resource) {
            results.skipped.push({
              id: resourceId,
              reason: 'Resource not found',
            })
            continue
          }

          // Faculty can only delete their own resources
          if (session.role === 'faculty' && resource.uploadedBy !== session.uid) {
            results.skipped.push({
              id: resourceId,
              reason: 'You can only delete your own resources',
            })
            continue
          }

          await deleteResourceRecord({ resourceId, session })

          results.deleted.push({
            id: resourceId,
            title: resource.title,
            uploadedBy: resource.uploadedBy,
          })
        } catch (err) {
          results.failed.push({
            id: resourceId,
            reason: err.message,
          })
        }
      }
    }

    // Log the bulk action
    await logAction({
      user: session,
      action: 'BULK_DELETE',
      description: `Bulk deleted ${results.deleted.length} ${type}(s). Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`,
      module: type === 'user' ? 'User Management' : 'Resources',
      status: results.deleted.length > 0 ? 'SUCCESS' : 'FAILED',
      request,
      metadata: {
        type,
        deletedCount: results.deleted.length,
        failedCount: results.failed.length,
        skippedCount: results.skipped.length,
        ids: ids.slice(0, 10), // Log first 10 IDs
      },
    })

    if (results.deleted.length > 0) {
      await logActivity({
        userId: session.uid,
        userName: session.displayName || session.name,
        userEmail: session.email,
        role: session.role,
        action: 'DELETE_USER',
        description: `Bulk deleted ${results.deleted.length} ${type === 'user' ? 'user' : 'resource'}(s)`,
        metadata: {
          bulkAction: true,
          itemType: type,
          deletedCount: results.deleted.length,
        },
      })
    }

    return withNoStore(
      NextResponse.json(
        {
          success: true,
          message: `Deleted ${results.deleted.length} item(s).`,
          results,
        },
        {
          status: 200,
        }
      )
    )
  } catch (error) {
    const session = await requireApiSession(request).catch(() => null)
    await logAction({
      user: session,
      action: 'BULK_DELETE',
      description: `Bulk delete operation failed.`,
      module: 'Bulk Operations',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return jsonError(error)
  }
}
