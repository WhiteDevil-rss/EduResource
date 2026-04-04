const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
let privateKey = process.env.FIREBASE_PRIVATE_KEY
const hasServiceAccountCredentials = Boolean(
  (clientEmail && privateKey) || process.env.GOOGLE_APPLICATION_CREDENTIALS
)

if (privateKey) {
  const normalized = String(privateKey).trim()
  const hasDoubleQuotes = normalized.startsWith('"') && normalized.endsWith('"')
  const hasSingleQuotes = normalized.startsWith("'") && normalized.endsWith("'")
  privateKey = hasDoubleQuotes || hasSingleQuotes ? normalized.slice(1, -1) : normalized
  privateKey = privateKey.replace(/\\n/g, '\n')
}

let adminApp = null
let adminAuth = null
let adminDb = null
let adminServicesPromise = null

function canUseApplicationDefaultCredentials() {
  const shouldUseAdc = String(process.env.FIREBASE_USE_APPLICATION_DEFAULT || '')
    .trim()
    .toLowerCase()

  return shouldUseAdc === '1' || shouldUseAdc === 'true'
}

async function initializeAdminServices() {
  if (!projectId) {
    return null
  }

  if (adminApp && adminAuth && adminDb) {
    return { adminApp, adminAuth, adminDb }
  }

  if (!adminServicesPromise) {
    adminServicesPromise = (async () => {
      try {
        const [{ applicationDefault, cert, getApps, initializeApp }, { getAuth }, { getFirestore }] =
          await Promise.all([
            import('firebase-admin/app'),
            import('firebase-admin/auth'),
            import('firebase-admin/firestore'),
          ])

        adminApp =
          getApps().length > 0
            ? getApps()[0]
            : initializeApp(
                clientEmail && privateKey
                  ? {
                      credential: cert({ projectId, clientEmail, privateKey }),
                      projectId,
                    }
                  : canUseApplicationDefaultCredentials()
                  ? { credential: applicationDefault(), projectId }
                  : { projectId }
              )

        adminAuth = getAuth(adminApp)
        adminDb = getFirestore(adminApp)

        return { adminApp, adminAuth, adminDb }
      } catch (error) {
        console.warn(
          `Firebase Admin initialization failed: ${String(error?.message || error)}`
        )
        adminApp = null
        adminAuth = null
        adminDb = null
        adminServicesPromise = null
        return null
      }
    })()
  }

  return adminServicesPromise
}

export async function getAdminApp() {
  const services = await initializeAdminServices()
  return services?.adminApp || null
}

export async function getAdminAuth() {
  const services = await initializeAdminServices()
  return services?.adminAuth || null
}

export async function getAdminDb() {
  const services = await initializeAdminServices()
  return services?.adminDb || null
}

export function assertPrivilegedFirebaseAccess() {
  if (!projectId || !hasServiceAccountCredentials) {
    throw new Error(
      'Privileged Firebase access is not configured. Set FIREBASE_PROJECT_ID and service account credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS).'
    )
  }
}

export { hasServiceAccountCredentials }
