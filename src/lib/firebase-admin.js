import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
let privateKey = process.env.FIREBASE_PRIVATE_KEY

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

export { adminApp, adminAuth, adminDb }
