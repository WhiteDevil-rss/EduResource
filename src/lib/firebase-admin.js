import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
let privateKey = process.env.FIREBASE_PRIVATE_KEY
const hasServiceAccountCredentials = Boolean(
  (clientEmail && privateKey) || process.env.GOOGLE_APPLICATION_CREDENTIALS
)

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n')
}

if (!projectId) {
  throw new Error('Missing FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) for Firebase Admin.')
}

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(
        clientEmail && privateKey
          ? {
              credential: cert({ projectId, clientEmail, privateKey }),
              projectId,
            }
          : process.env.GOOGLE_APPLICATION_CREDENTIALS
          ? { credential: applicationDefault(), projectId }
          : { projectId }
      )

const adminAuth = getAuth(adminApp)
const adminDb = getFirestore(adminApp)

export function assertPrivilegedFirebaseAccess() {
  if (hasServiceAccountCredentials) {
    return
  }

  throw new Error(
    'Privileged Firebase access is not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY before using secure management APIs.'
  )
}

export { adminApp, adminAuth, adminDb, hasServiceAccountCredentials }
