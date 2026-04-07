import { NextResponse } from 'next/server'
import { 
  requireApiSession, 
  assertSameOrigin, 
  ApiError, 
  jsonError 
} from '@/lib/api-security'
import { deleteUserAndData } from '@/lib/server-data'

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
