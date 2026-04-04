import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { signInWithPassword, updateFirebasePassword } from '@/lib/firebase-rest-auth'

export async function POST(request) {
  try {
    const { user } = await getSessionUser()
    if (!user || !user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new passwords are required.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    // 1. Verify current password by attempting a sign-in and get a fresh idToken
    let idToken
    try {
      const result = await signInWithPassword(user.email, currentPassword)
      idToken = result.idToken
    } catch (passwordError) {
      console.warn(`Password verification failed for user: ${user.email}`)
      return NextResponse.json(
        { error: 'The current password you entered is incorrect.' },
        { status: 403 }
      )
    }

    // 2. Update password in Firebase Auth using REST API (Edge safe)
    if (!idToken) {
      throw new Error('Could not retrieve identity token for update.')
    }

    await updateFirebasePassword(idToken, newPassword)

    console.log(`Password successfully updated for user: ${user.email}`)

    return NextResponse.json({
      message: 'Password updated successfully.',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
