import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { assertSameOrigin, withNoStore } from '@/lib/api-security'
import { signInWithPassword, updateFirebasePassword } from '@/lib/firebase-rest-auth'
import { validatePassword } from '@/lib/request-validation'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const { user } = await getSessionUser()
    if (!user || !user.uid) {
      return withNoStore(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = String(body?.currentPassword || '')
    const newPassword = String(body?.newPassword || '')

    if (!currentPassword || !newPassword) {
      return withNoStore(NextResponse.json(
        { error: 'Current and new passwords are required.' },
        { status: 400 }
      ))
    }

    if (newPassword === currentPassword) {
      return withNoStore(
        NextResponse.json(
          { error: 'New password must be different from current password.' },
          { status: 400 }
        )
      )
    }

    validatePassword(newPassword, true)

    // 1. Verify current password by attempting a sign-in and get a fresh idToken
    let idToken
    try {
      const result = await signInWithPassword(user.email, currentPassword)
      idToken = result.idToken
    } catch {

      return withNoStore(NextResponse.json(
        { error: 'The current password you entered is incorrect.' },
        { status: 403 }
      ))
    }

    // 2. Update password in Firebase Auth using REST API (Edge safe)
    if (!idToken) {
      throw new Error('Could not retrieve identity token for update.')
    }

    await updateFirebasePassword(idToken, newPassword)

    return withNoStore(NextResponse.json({
      message: 'Password updated successfully.',
    }))
  } catch (error) {
    console.error('Change password error:', error)
    const status = Number(error?.status) || 500
    return withNoStore(NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status }
    ))
  }
}
