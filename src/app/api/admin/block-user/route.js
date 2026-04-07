import { NextResponse } from 'next/server'
import { ApiError, assertSameOrigin, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isSuperAdmin, isProtectedAdminEmail } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { blockUserAccount, findUserRecordByEmail, getUserRecordById } from '@/lib/server-data'

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
    const reason = String(body?.reason || '').trim()
    const durationMinutesRaw = body?.durationMinutes
    const durationMinutes = durationMinutesRaw === '' || durationMinutesRaw === null || durationMinutesRaw === undefined
      ? null
      : Number(durationMinutesRaw)

    if (!userId && !email) {
      throw new ApiError(400, 'User ID or email is required.')
    }

    if (durationMinutes !== null && (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 43200)) {
      throw new ApiError(400, 'Temporary block duration must be between 1 and 43200 minutes.')
    }

    const targetUser = await resolveTargetUser({ userId, email })
    if (!targetUser) {
      throw new ApiError(404, 'User account not found.')
    }

    if (isProtectedAdminEmail(targetUser.email)) {
      throw new ApiError(403, 'This protected admin account cannot be blocked.')
    }

    const blockedUser = await blockUserAccount({
      userId: targetUser.id,
      actor: session,
      reason,
      expiresAt: durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null,
    })

    await logAction({
      user: session,
      action: 'BLOCK_USER',
      description: `Blocked user ${blockedUser.email || blockedUser.id}.`,
      module: 'Security Controls',
      status: 'SUCCESS',
      request,
      targetId: blockedUser.id,
      targetRole: blockedUser.role,
      metadata: { reason: blockedUser.blockedReason || reason || '', blockedExpiresAt: blockedUser.blockedExpiresAt },
    }).catch(() => null)

    return withNoStore(NextResponse.json({ success: true, user: blockedUser }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not block user account.')
  }
}
