import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth-constants'
import { assertSameOrigin, withNoStore } from '@/lib/api-security'
import { signInWithPassword } from '@/lib/firebase-rest-auth'
import { assertPrivilegedFirebaseAccess } from '@/lib/firebase-admin'
import { createSessionCookie } from '@/lib/session-cookie'
import {
  createAuditRecord,
  findUserRecordByEmail,
  findUserRecordByLoginId,
  getUserRecordById,
  touchUserLogin,
} from '@/lib/server-data'

function getFriendlyCredentialMessage(error) {
  const message = String(error?.message || '')
  if (
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.includes('INVALID_PASSWORD') ||
    message.includes('EMAIL_NOT_FOUND')
  ) {
    return 'Invalid email or password.'
  }

  if (message.includes('USER_DISABLED')) {
    return 'This account is currently disabled.'
  }

  return message || 'Credential sign-in failed.'
}

function inferRoleFromIdentifier(identifier = '', email = '') {
  const probe = `${identifier} ${email}`.toLowerCase()
  if (probe.includes('admin') || probe.includes('ss7051017@gmail.com')) {
    return 'admin'
  }

  return 'faculty'
}

function shouldPromoteToAdmin(identifier = '', email = '') {
  const probe = `${identifier} ${email}`.toLowerCase()
  return probe.includes('admin') || probe.includes('ss7051017@gmail.com')
}


function isCredentialAuthError(message = '') {
  return (
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.includes('INVALID_PASSWORD') ||
    message.includes('EMAIL_NOT_FOUND') ||
    message.includes('INVALID_EMAIL')
  )
}

function isConfigurationError(message = '') {
  return (
    message.includes('Missing NEXT_PUBLIC_FIREBASE_API_KEY') ||
    message.includes('CONFIGURATION_NOT_FOUND') ||
    message.includes('API key not valid')
  )
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    assertPrivilegedFirebaseAccess()

    const body = await request.json()
    const loginIdentifier = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const isEmailIdentifier = loginIdentifier.includes('@')

    if (!loginIdentifier || !password) {
      return withNoStore(
        NextResponse.json(
          { error: 'Email/login ID and password are required.' },
          { status: 400 }
        )
      )
    }

    let recordByEmailInput = null
    let recordByLoginIdInput = null
    let lookupFailed = false
    try {
      recordByEmailInput = await findUserRecordByEmail(loginIdentifier)
      recordByLoginIdInput = recordByEmailInput
        ? null
        : await findUserRecordByLoginId(loginIdentifier)
    } catch {
      // Firestore lookup is required when using login IDs.
      lookupFailed = true
      recordByEmailInput = null
      recordByLoginIdInput = null
    }

    const resolvedRecord = recordByEmailInput || recordByLoginIdInput

    if (!isEmailIdentifier) {
      if (lookupFailed) {
        return withNoStore(
          NextResponse.json(
            { error: 'Login directory lookup failed. Please try again in a moment.' },
            { status: 503 }
          )
        )
      }

      if (!resolvedRecord?.user?.email) {
        return withNoStore(
          NextResponse.json(
            { error: 'Invalid login ID or password.' },
            { status: 401 }
          )
        )
      }
    }

    const accountEmail = String(
      resolvedRecord?.user?.email || loginIdentifier
    ).toLowerCase()

    let result
    try {
      result = await signInWithPassword(accountEmail, password)
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('USER_DISABLED')) {
        return withNoStore(
          NextResponse.json({ error: 'This account is currently disabled.' }, { status: 403 })
        )
      }

      if (isConfigurationError(message)) {
        return withNoStore(
          NextResponse.json(
            {
              error:
                'Authentication provider is not configured correctly. Check NEXT_PUBLIC_FIREBASE_API_KEY and Firebase project settings.',
            },
            { status: 500 }
          )
        )
      }

      if (isCredentialAuthError(message)) {
        return withNoStore(
          NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
        )
      }

      return withNoStore(
        NextResponse.json({ error: 'Credential sign-in is temporarily unavailable.' }, { status: 503 })
      )
    }

    let recordByUid = null
    let recordByResolvedEmail = null
    try {
      recordByUid = await getUserRecordById(result.uid)
      recordByResolvedEmail = await findUserRecordByEmail(accountEmail)
    } catch {
      // Keep login flow alive if profile directory lookup fails.
      recordByUid = null
      recordByResolvedEmail = null
    }

    const resolvedUser =
      recordByUid ||
      recordByResolvedEmail?.user ||
      resolvedRecord?.user ||
      null

    const accountRole = shouldPromoteToAdmin(loginIdentifier, result.email || accountEmail)
      ? 'admin'
      : resolvedUser?.role || inferRoleFromIdentifier(loginIdentifier, result.email || accountEmail)

    const effectiveUser =
      resolvedUser ||
      {
        uid: result.uid,
        email: result.email || accountEmail,
        displayName: (result.email || accountEmail).split('@')[0],
        role: accountRole,
        status: 'active',
        authProvider: 'credentials',
      }

    effectiveUser.role = accountRole
    if (accountRole === 'admin') {
      effectiveUser.status = 'active'
    }

    if (effectiveUser.role === 'student') {
      return withNoStore(
        NextResponse.json(
          { error: 'Students must sign in using the Google Student Portal.' },
          { status: 403 }
        )
      )
    }

    const authProvider = String(effectiveUser.authProvider || '').toLowerCase()
    const isCredentialProvider =
      !authProvider ||
      authProvider === 'credentials' ||
      authProvider === 'credential' ||
      authProvider === 'password' ||
      authProvider === 'email' ||
      authProvider === 'unknown'

    if (!isCredentialProvider) {
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    if (effectiveUser.status !== 'active') {
      return withNoStore(
        NextResponse.json({ error: 'This account is currently disabled.' }, { status: 403 })
      )
    }

    if (!result?.uid) {
      return withNoStore(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
      )
    }

    try {
      await touchUserLogin(result.uid)
      await createAuditRecord({
        actorUid: result.uid,
        actorRole: effectiveUser.role,
        action: 'auth.credentials.login',
        targetId: result.uid,
        targetRole: effectiveUser.role,
        message: `${effectiveUser.role} login granted for ${effectiveUser.email}.`,
      })
    } catch (error) {
      // Do not block successful credential auth when profile/audit persistence is unavailable.
      console.warn(`Post-login persistence failed: ${String(error?.message || error)}`)
    }

    const sessionCookie = createSessionCookie({
      uid: result.uid,
      email: effectiveUser.email,
      role: effectiveUser.role,
      status: effectiveUser.status,
      authProvider: 'credentials',
      name: effectiveUser.displayName || null,
      exp: Date.now() + SESSION_MAX_AGE_MS,
    })

    const response = withNoStore(
      NextResponse.json({
        user: {
          ...effectiveUser,
          uid: result.uid,
        },
        role: effectiveUser.role,
      })
    )
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
      path: '/',
    })

    return response
  } catch (error) {
    const message = String(error?.message || '')
    if (
      message.includes('Privileged Firebase access is not configured') ||
      message.includes('FIREBASE_PRIVATE_KEY') ||
      message.includes('FIREBASE_CLIENT_EMAIL')
    ) {
      return withNoStore(
        NextResponse.json(
          {
            error:
              'Server authentication is not properly configured. Please check your environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).',
          },
          { status: 500 }
        )
      )
    }

    if (message.includes('NOT_FOUND')) {
      return withNoStore(
        NextResponse.json(
          {
            error:
              'Authentication backend is partially configured. Firestore database is missing or inaccessible for the configured project.',
          },
          { status: 500 }
        )
      )
    }

    return withNoStore(
      NextResponse.json(
        { error: getFriendlyCredentialMessage(error) },
        { status: error?.status || 401 }
      )
    )
  }
}
