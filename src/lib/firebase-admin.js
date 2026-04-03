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

let adminApp = null
let adminAuth = null
let adminDb = null

if (projectId) {
  adminApp =
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

  adminAuth = getAuth(adminApp)
  adminDb = getFirestore(adminApp)
} else {
  // Build-time path: API routes may be evaluated during static generation.
  // Defer error until runtime to avoid failing the Next.js build when env vars are missing.
  console.warn(
    'Firebase Admin is not initialized because FIREBASE_PROJECT_ID is missing. Ensure environment variables are configured at runtime.'
  )
}

export function assertPrivilegedFirebaseAccess() {
  if (!projectId || !hasServiceAccountCredentials || !adminApp || !adminAuth || !adminDb) {
    throw new Error(
      'Privileged Firebase access is not configured. Set FIREBASE_PROJECT_ID and service account credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS).' 
    )
  }
}

export { adminApp, adminAuth, adminDb, hasServiceAccountCredentials }
