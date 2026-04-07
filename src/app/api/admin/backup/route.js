import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { logActivity } from '@/lib/activity-log'
import { performBackup, getLastBackupTimestamp } from '@/lib/backup-service'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Backup functionality is restricted to super admin only.')
    }

    const backupResult = await performBackup()

    await logAction({
      user: session,
      action: 'BACKUP_SYSTEM',
      description: `System backup performed. Users: ${backupResult.userCount}, Resources: ${backupResult.resourceCount}`,
      module: 'System',
      status: 'SUCCESS',
      request,
      metadata: {
        timestamp: backupResult.timestamp,
        userCount: backupResult.userCount,
        resourceCount: backupResult.resourceCount,
      },
    })

    await logActivity({
      userId: session.uid,
      userName: session.displayName || session.name,
      userEmail: session.email,
      role: session.role,
      action: 'UPLOAD_RESOURCE',
      description: `Performed system backup (Users: ${backupResult.userCount}, Resources: ${backupResult.resourceCount})`,
      metadata: {
        backupTimestamp: backupResult.timestamp,
        userCount: backupResult.userCount,
        resourceCount: backupResult.resourceCount,
      },
    })

    return withNoStore(
      NextResponse.json({
        success: true,
        message: 'Backup completed successfully.',
        timestamp: backupResult.timestamp,
        userCount: backupResult.userCount,
        resourceCount: backupResult.resourceCount,
      })
    )
  } catch (error) {
    const session = await requireApiSession(request, ['admin']).catch(() => null)
    await logAction({
      user: session,
      action: 'BACKUP_SYSTEM',
      description: 'Failed to perform system backup.',
      module: 'System',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return jsonError(error, 'Could not perform backup.')
  }
}

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Backup information access is restricted to super admin only.')
    }

    const lastBackup = getLastBackupTimestamp()

    return withNoStore(
      NextResponse.json({
        lastBackupTimestamp: lastBackup,
        lastBackupDate: lastBackup ? new Date(lastBackup).toLocaleString() : 'No backup yet',
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not retrieve backup information.')
  }
}
