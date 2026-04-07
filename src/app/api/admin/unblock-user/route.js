import { NextResponse } from 'next/server'
import { ApiError, assertSameOrigin, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { unblockUserAccount, findUserRecordByEmail, getUserRecordById } from '@/lib/server-data'

async function resolveTargetUser({ userId, email }) {
  if (userId) {
    const byId = await getUserRecordById(userId)
    if (byId) return byId
  }

  if (email) {
    const byEmail = await findUserRecordByEmail(email)
    if (byEmail?.user) return byEmail.user
  }

  return null
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Access restricted to super admin only.')
    }

    const body = await request.json().catch(() => ({}))
    const userId = String(body?.userId || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!userId && !email) {
      throw new ApiError(400, 'User ID or email is required.')
    }

    const targetUser = await resolveTargetUser({ userId, email })
    if (!targetUser) {
      throw new ApiError(404, 'User account not found.')
    }

    const unblockedUser = await unblockUserAccount({
      userId: targetUser.id,
      actor: session,
    })

    await logAction({
      user: session,
      action: 'UNBLOCK_USER',
      description: `Unblocked user ${unblockedUser.email || unblockedUser.id}.`,
      module: 'Security Controls',
      status: 'SUCCESS',
      request,
      targetId: unblockedUser.id,
      targetRole: unblockedUser.role,
    }).catch(() => null)

    return withNoStore(NextResponse.json({ success: true, user: unblockedUser }))
  } catch (error) {
    return jsonError(error, 'Could not unblock user account.')
  }
}
