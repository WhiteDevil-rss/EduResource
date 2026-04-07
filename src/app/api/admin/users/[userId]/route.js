import { NextResponse } from 'next/server'
import { 
  requireApiSession, 
  assertSameOrigin, 
  ApiError, 
  jsonError 
} from '@/lib/api-security'
import { deleteUserAndData, resetManagedCredentials, setManagedUserStatus } from '@/lib/server-data'

export async function DELETE(request, { params }) {
  try {
    const { userId } = params
    
    // Ensure the caller is an admin
    await requireApiSession(request, ['admin'])
    assertSameOrigin(request)

    if (!userId) {
      throw new ApiError(400, 'Missing userId in request path.')
    }

    // Perform hard deletion (Firestore + Auth)
    await deleteUserAndData(userId)

    return NextResponse.json({ 
      success: true, 
      message: 'Account and associated data permanently removed.' 
    })

  } catch (error) {
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

    const body = await request.json().catch(() => ({}))
    const action = body?.action

    if (action === 'set-status') {
      const status = body?.status === 'active' ? 'active' : 'disabled'
      const user = await setManagedUserStatus({
        userId,
        nextStatus: status,
        actorUid: session.uid,
        actorRole: session.role,
      })

      return NextResponse.json({ success: true, user })
    }

    if (action === 'resetCredentials') {
      const result = await resetManagedCredentials({
        userId,
        actorUid: session.uid,
        actorRole: session.role,
        newPassword: body?.password || null,
      })

      return NextResponse.json({ success: true, ...result })
    }

    throw new ApiError(400, 'Unsupported admin user action.')
  } catch (error) {
    return jsonError(error)
  }
}
