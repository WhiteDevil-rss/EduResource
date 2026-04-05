import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { requireRole, validateSelfModification } from '@/lib/rbac-middleware'
import { validateUuid, validateStatus } from '@/lib/request-validation'
import {
  resetManagedCredentials,
  setManagedUserStatus,
  getUserRecordById,
} from '@/lib/server-data'

/**
 * GET /api/admin/users/:userId
 * Retrieve detailed information about a specific user
 * Only admin can access this endpoint
 */
export async function GET(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request)
    requireRole(session, ['admin'])

    const routeParams = await params
    const userId = validateUuid(routeParams?.userId)

    const user = await getUserRecordById(userId)
    if (!user) {
      return withNoStore(
        NextResponse.json({ error: 'User not found.' }, { status: 404 })
      )
    }

    return withNoStore(
      NextResponse.json(
        {
          user,
        },
        { status: 200 }
      )
    )
  } catch (error) {
    return jsonError(error, 'Could not retrieve user information.')
  }
}

/**
 * PATCH /api/admin/users/:userId
 * Update user status or reset credentials
 * Actions:
 *   - setStatus: Change user's active/disabled status
 *   - resetCredentials: Generate new temporary password for credential-based users
 * Only admin can perform these actions
 */
export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request)
    requireRole(session, ['admin'])

    const body = await request.json()
    const routeParams = await params
    const userId = validateUuid(routeParams?.userId)
    const action = String(body?.action || '').trim().toLowerCase()

    // Reset Credentials Action - for faculty/admin accounts
    if (action === 'resetcredentials' || action === 'reset-credentials') {
      const result = await resetManagedCredentials({
        userId,
        actorUid: session.uid,
        actorRole: session.role,
        newPassword: body?.newPassword || body?.password || null,
      })

      return withNoStore(
        NextResponse.json(
          {
            message: 'Credentials have been reset successfully.',
            user: result.user,
            credentials: result.credentials,
          },
          { status: 200 }
        )
      )
    }

    // Set Status Action - enable/disable user access
    if (action === 'setstatus' || action === 'set-status' || !action) {
      const status = validateStatus(body?.status)

      // Prevent admins from disabling their own account
      validateSelfModification(userId, session)

      const user = await setManagedUserStatus({
        userId,
        nextStatus: status,
        actorUid: session.uid,
        actorRole: session.role,
      })

      return withNoStore(
        NextResponse.json(
          {
            message: `User status updated to ${status}.`,
            user,
          },
          { status: 200 }
        )
      )
    }

    return withNoStore(
      NextResponse.json(
        { error: 'Invalid action. Must be one of: setStatus, resetCredentials' },
        { status: 400 }
      )
    )
  } catch (error) {
    return jsonError(error, 'Could not update the requested user account.')
  }
}

/**
 * DELETE /api/admin/users/:userId
 * Delete a user account (soft delete - set to disabled)
 * Only admin can delete users
 * This is implemented as a status change rather than actual deletion
 * to preserve audit trails and referential integrity
 */
export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request)
    requireRole(session, ['admin'])

    const routeParams = await params
    const userId = validateUuid(routeParams?.userId)

    // Prevent admins from deleting their own account
    validateSelfModification(userId, session)

    // Delete by setting status to disabled
    const user = await setManagedUserStatus({
      userId,
      nextStatus: 'disabled',
      actorUid: session.uid,
      actorRole: session.role,
    })

    return withNoStore(
      NextResponse.json(
        {
          message: 'User account has been disabled.',
          user,
        },
        { status: 200 }
      )
    )
  } catch (error) {
    return jsonError(error, 'Could not delete the requested user account.')
  }
}
