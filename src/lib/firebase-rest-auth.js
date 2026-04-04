import 'server-only'
import {
  getFirestoreSetupMessage,
  isFirestoreSetupError,
} from '@/lib/firestore-service'

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing ${name}.`)
  }

  return value
}

async function parseJsonResponse(response, service = 'firebase') {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      'Firebase request failed.'

    if (service === 'firestore' && isFirestoreSetupError(message)) {
      throw new Error(getFirestoreSetupMessage(FIREBASE_PROJECT_ID))
    }

    throw new Error(message)
  }

  return payload
}

function getFirestoreString(fields, key) {
  return fields?.[key]?.stringValue ?? null
}

export async function lookupFirebaseUser(idToken) {
  const apiKey = requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', FIREBASE_API_KEY)
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    }
  )

  const payload = await parseJsonResponse(response)
  const user = payload?.users?.[0]

  if (!user?.localId) {
    throw new Error('Unable to verify Firebase user.')
  }

  return {
    uid: user.localId,
    email: user.email || null,
    providers: Array.isArray(user.providerUserInfo)
      ? user.providerUserInfo
          .map((entry) => entry?.providerId)
          .filter(Boolean)
      : [],
  }
}

export async function getFirestoreUserProfile(idToken, uid) {
  const projectId = requireEnv(
    'FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    FIREBASE_PROJECT_ID
  )

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    }
  )

  const payload = await parseJsonResponse(response, 'firestore')
  const fields = payload?.fields || {}

  return {
    uid: getFirestoreString(fields, 'uid') || uid,
    email: getFirestoreString(fields, 'email'),
    role: getFirestoreString(fields, 'role'),
    status: getFirestoreString(fields, 'status') || 'active',
  }
}

export async function verifyFirebaseSession(idToken, options = {}) {
  const account = await lookupFirebaseUser(idToken)
  const profile = options.skipProfile
    ? { role: null, status: 'active', email: account.email }
    : await getFirestoreUserProfile(idToken, account.uid)

  return {
    user: {
      uid: account.uid,
      email: account.email || profile.email,
    },
    role: profile.role,
    status: profile.status,
  }
}

export async function signInWithPassword(email, password) {
  const apiKey = requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', FIREBASE_API_KEY)
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      cache: 'no-store',
    }
  )

  const payload = await parseJsonResponse(response)
  const uid = payload?.localId

  if (!uid) {
    throw new Error('INVALID_LOGIN_CREDENTIALS')
  }

  return { uid, email: payload?.email || email, idToken: payload?.idToken }
}

export async function updateFirebasePassword(idToken, newPassword) {
  const apiKey = requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', FIREBASE_API_KEY)
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        password: newPassword,
        returnSecureToken: true,
      }),
      cache: 'no-store',
    }
  )

  return parseJsonResponse(response)
}

