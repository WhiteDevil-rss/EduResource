import { NextResponse } from 'next/server'
import { 
  requireApiSession, 
  assertSameOrigin, 
  ApiError, 
  jsonError 
} from '@/lib/api-security'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { logActivity } from '@/lib/activity-log'
import { deleteUserAndData, getUserRecordById, resetManagedCredentials, setManagedUserStatus } from '@/lib/server-data'
import { sanitizePlainText, validatePassword } from '@/lib/request-validation'

export async function DELETE(request, { params }) {
  try {
    const { userId } = params
    
    // Ensure the caller is an admin
    const session = await requireApiSession(request, ['admin'])
    assertSameOrigin(request)

    if (!userId) {
      throw new ApiError(400, 'Missing userId in request path.')
    }

    const targetUser = await getUserRecordById(userId)
    if (!targetUser) {
      throw new ApiError(404, 'User account not found.')
    }

    if (isProtectedAdminEmail(targetUser.email)) {
      throw new ApiError(403, 'This protected admin account cannot be deleted.')
    }

    // Perform hard deletion (Firestore + Auth)
    await deleteUserAndData(userId)

    await logAction({
      user: session,
      action: 'DELETE_USER',
      description: `Deleted user ${targetUser.email || targetUser.id}.`,
      module: 'User Management',
      status: 'SUCCESS',
      request,
      targetId: targetUser.id,
      targetRole: targetUser.role,
    })

    await logActivity({
      userId: session.uid,
      userName: session.displayName || session.name,
      userEmail: session.email,
      role: session.role,
      action: 'DELETE_USER',
      description: `Deleted user account: ${targetUser.email}`,
      metadata: {
        targetUserEmail: targetUser.email,
        targetUserId: targetUser.id,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Account and associated data permanently removed.' 
    })

  } catch (error) {
    const actor = await requireApiSession(request, ['admin']).catch(() => null)
    await logAction({
      user: actor,
      action: 'DELETE_USER',
      description: `Failed to delete user ${params?.userId || ''}.`,
      module: 'User Management',
      status: 'FAILED',
      request,
      targetId: params?.userId || null,
      targetRole: 'user',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error)
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireApiSession(request, ['admin'])
    assertSameOrigin(request)

    const { userId } = params
    if (!userId) {
      throw new ApiError(400, 'Missing userId in request path.')
    }

    const targetUser = await getUserRecordById(userId)
    if (!targetUser) {
      throw new ApiError(404, 'User account not found.')
    }

    const body = await request.json().catch(() => ({}))
    const action = sanitizePlainText(body?.action, {
      maxLength: 40,
      collapseWhitespace: true,
    })
    const protectedTarget = isProtectedAdminEmail(targetUser.email)
    const selfTarget =
      (session.uid && targetUser.id && session.uid === targetUser.id) ||
      (session.email && targetUser.email && String(session.email).toLowerCase() === String(targetUser.email).toLowerCase())

    if (action === 'set-status') {
      if (protectedTarget) {
        throw new ApiError(403, 'This protected admin account cannot be disabled or enabled via admin actions.')
      }

      const status = body?.status === 'active' ? 'active' : 'disabled'
      const user = await setManagedUserStatus({
        userId,
        nextStatus: status,
        actorUid: session.uid,
        actorRole: session.role,
      })

      await logAction({
        user: session,
        action: status === 'active' ? 'ENABLE_USER' : 'DISABLE_USER',
        description: `${status === 'active' ? 'Enabled' : 'Disabled'} user ${targetUser.email || targetUser.id}.`,
        module: 'User Management',
        status: 'SUCCESS',
        request,
        targetId: targetUser.id,
        targetRole: targetUser.role,
      })

      await logActivity({
        userId: session.uid,
        userName: session.displayName || session.name,
        userEmail: session.email,
        role: session.role,
        action: 'UPDATE_USER',
        description: `${status === 'active' ? 'Enabled' : 'Disabled'} user: ${targetUser.email}`,
        metadata: {
          targetUserEmail: targetUser.email,
          action: status === 'active' ? 'ENABLE' : 'DISABLE',
        },
      })

      return NextResponse.json({ success: true, user })
    }

    if (action === 'resetCredentials') {
      if (protectedTarget && !selfTarget) {
        throw new ApiError(403, 'Only the protected admin can reset credentials for this account.')
      }

      const requestedPassword = body?.password ? String(body.password) : null
      if (requestedPassword) {
        validatePassword(requestedPassword, true)
      }

      const result = await resetManagedCredentials({
        userId,
        actorUid: session.uid,
        actorRole: session.role,
        newPassword: requestedPassword,
      })

      await logAction({
        user: session,
        action: 'RESET_PASSWORD',
        description: `Reset credentials for ${targetUser.email || targetUser.id}.`,
        module: 'User Management',
        status: 'SUCCESS',
        request,
        targetId: targetUser.id,
        targetRole: targetUser.role,
      })

      await logActivity({
        userId: session.uid,
        userName: session.displayName || session.name,
        userEmail: session.email,
        role: session.role,
        action: 'UPDATE_USER',
        description: `Reset credentials for user: ${targetUser.email}`,
        metadata: {
          targetUserEmail: targetUser.email,
          action: 'RESET_PASSWORD',
        },
      })

      return NextResponse.json({ success: true, ...result })
    }

    throw new ApiError(400, 'Unsupported admin user action.')
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['admin']).catch(() => null),
      action: 'UPDATE_USER',
      description: `Failed admin user update for ${params?.userId || ''}.`,
      module: 'User Management',
      status: 'FAILED',
      request,
      targetId: params?.userId || null,
      targetRole: 'user',
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error)
  }
}
