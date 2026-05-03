import { NextResponse } from 'next/server'
import {
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { requireRole } from '@/lib/rbac-middleware'
import {
  validateEmail,
  validateRole,
  validateDisplayName,
  validatePagination,
  sanitizePlainText,
} from '@/lib/request-validation'
import { logAction } from '@/lib/audit-log'
import { logActivity } from '@/lib/activity-log'
import { createManagedUser, listUserRecords } from '@/lib/server-data'

/**
 * POST /api/admin/users
 * Create a new user account (faculty or admin)
 * Students must use Google OAuth - they cannot be created manually
 * Only admin can create users
 */
export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request)
    requireRole(session, ['admin'])

    const body = await request.json()

    // Validate input
    const email = validateEmail(body?.email, true)
    const role = validateRole(body?.role)
    const displayName = validateDisplayName(body?.displayName, false)

    // Students cannot be created by admin - they use Google OAuth only
    if (role === 'student') {
      return withNoStore(
        NextResponse.json(
          {
            error:
              'Student accounts cannot be created manually. Students must register using Google OAuth.',
          },
          { status: 400 }
        )
      )
    }

    const result = await createManagedUser({
      role,
      email,
      displayName,
      actorUid: session.uid,
      actorRole: session.role,
    })

    await logAction({
      user: session,
      action: 'CREATE_USER',
      description: `Created ${role} user account for ${email}.`,
      module: 'User Management',
      status: 'SUCCESS',
      request,
      targetId: result?.user?.id || null,
      targetRole: role,
    })

    await logActivity({
      userId: session.uid,
      userName: session.displayName || session.name,
      userEmail: session.email,
      role: session.role,
      action: 'CREATE_USER',
      description: `Created ${role} account: ${displayName || email}`,
      metadata: {
        targetUserEmail: email,
        targetUserRole: role,
      },
    })

    return withNoStore(
      NextResponse.json(
        {
          message: 'User account created successfully.',
          user: result.user,
          credentials: result.credentials,
        },
        { status: 201 }
      )
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request).catch(() => null),
      action: 'CREATE_USER',
      description: 'Failed user creation attempt.',
      module: 'User Management',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not create the requested user account.')
  }
}

/**
 * GET /api/admin/users
 * List all user accounts with filtering and pagination
 * Only admin can access this endpoint
 */
export async function GET(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request)
    requireRole(session, ['admin'])

    const url = new URL(request.url)
    const role = sanitizePlainText(url.searchParams.get('role') || '', {
      maxLength: 20,
      collapseWhitespace: true,
    }).toLowerCase()
    const status = sanitizePlainText(url.searchParams.get('status') || '', {
      maxLength: 20,
      collapseWhitespace: true,
    }).toLowerCase()
    const search = sanitizePlainText(url.searchParams.get('search') || '', {
      maxLength: 160,
      collapseWhitespace: true,
    }).toLowerCase()
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    )

    let users = await listUserRecords()

    // Apply filters
    if (role) {
      const validRoles = ['admin', 'faculty', 'student']
      if (validRoles.includes(role)) {
        users = users.filter((u) => u.role === role)
      }
    }

    if (status) {
      const validStatuses = ['active', 'disabled']
      if (validStatuses.includes(status)) {
        users = users.filter((u) => u.status === status)
      }
    }

    if (search) {
      users = users.filter(
        (u) =>
          String(u.email || '').toLowerCase().includes(search) ||
          String(u.displayName || '').toLowerCase().includes(search) ||
          String(u.loginId || '').toLowerCase().includes(search)
      )
    }

    // Apply pagination
    const total = users.length
    const startIdx = (page - 1) * limit
    const paginatedUsers = users.slice(startIdx, startIdx + limit)

    return withNoStore(
      NextResponse.json(
        {
          users: paginatedUsers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        { status: 200 }
      )
    )
  } catch (error) {
    return jsonError(error, 'Could not retrieve user list.')
  }
}
