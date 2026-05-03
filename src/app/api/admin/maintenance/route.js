import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { firestore } from '@/lib/firebase-edge'
import { logAction } from '@/lib/audit-log'


/**
 * GET /api/admin/maintenance
 * Retrieves the maintenance configuration. Restricted to Superadmin.
 */
export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])
    
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Maintenance settings are restricted to super admin only.')
    }
    
    const config = await firestore.getDoc('configs/maintenance')

    return withNoStore(
      NextResponse.json({
        enabled: config?.enabled === true,
        whitelist: config?.whitelist || [],
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load maintenance settings.')
  }
}

/**
 * PUT /api/admin/maintenance
 * Updates the maintenance configuration. Restricted to Superadmin.
 */
export async function PUT(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])
    
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Maintenance settings are restricted to super admin only.')
    }
    
    const body = await request.json().catch(() => ({}))
    
    const enabled = body.enabled === true
    const whitelist = Array.isArray(body.whitelist) 
      ? body.whitelist.map(email => String(email).trim().toLowerCase()).filter(Boolean)
      : []

    const config = {
      enabled,
      whitelist,
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid
    }

    await firestore.setDoc('configs/maintenance', config, true)

    await logAction({
      user: session,
      action: 'UPDATE_MAINTENANCE_MODE',
      description: `Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}. Whitelist size: ${whitelist.length}`,
      module: 'Security Settings',
      status: 'SUCCESS',
      request,
      metadata: config,
    })

    return withNoStore(
      NextResponse.json({
        message: 'Maintenance settings updated successfully.',
        config,
      })
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['admin']).catch(() => null),
      action: 'UPDATE_MAINTENANCE_MODE',
      description: 'Failed to update maintenance settings.',
      module: 'Security Settings',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not update maintenance settings.')
  }
}
