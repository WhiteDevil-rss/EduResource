import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebase-edge'
import { getSessionFromRequest } from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/system/maintenance
 * Public endpoint to check if maintenance mode is enabled and if the current user is allowed.
 */
export async function GET(request) {
  try {
    const config = await firestore.getDoc('configs/maintenance')
    const enabled = config?.enabled === true
    
    if (!enabled) {
      return NextResponse.json({ enabled: false, isAllowed: true })
    }

    // If maintenance is enabled, check if current user is allowed
    const session = await getSessionFromRequest(request).catch(() => null)
    
    let isAllowed = false
    if (session) {
      // 1. Superadmin check
      if (isSuperAdmin(session)) {
        isAllowed = true
      } else {
        // 2. Whitelist check
        const whitelist = Array.isArray(config?.whitelist) ? config.whitelist : []
        const userEmail = String(session.email || '').trim().toLowerCase()
        if (userEmail && whitelist.includes(userEmail)) {
          isAllowed = true
        }
      }
    }
    
    return NextResponse.json({
      enabled,
      isAllowed
    })
  } catch (error) {
    console.error('[MAINTENANCE_STATUS_ERROR]', error)
    return NextResponse.json({ enabled: false, isAllowed: true }, { status: 200 })
  }
}
