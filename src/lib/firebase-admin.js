import { readFileSync } from 'fs'

const FALLBACK_SERVICE_ACCOUNT_PATH = './eduresourcehub-73f9b-firebase-adminsdk-fbsvc-ce5cd52668.json'

function loadFallbackServiceAccount() {
  try {
    const raw = readFileSync(FALLBACK_SERVICE_ACCOUNT_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const fileServiceAccount = loadFallbackServiceAccount()
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  fileServiceAccount?.project_id ||
  null
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || fileServiceAccount?.client_email || null
let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || fileServiceAccount?.private_key || null
// Helper to normalize the private key string from any source (ENV or JSON)
function normalizePrivateKey(key) {
  if (!key) return null
  let cleaned = String(key).trim()
  
  // Handle literal or escaped \n
  cleaned = cleaned.replace(/\\n/g, '\n')
  
  // Remove outer quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1)
  }
  
  return cleaned.trim()
}

const privateKey = normalizePrivateKey(rawPrivateKey)

const hasServiceAccountCredentials = Boolean(
  (clientEmail && (privateKey || '').length > 0) || 
  fileServiceAccount || 
  process.env.GOOGLE_APPLICATION_CREDENTIALS
)



let adminApp = null
let adminAuth = null
let adminDb = null
let adminServicesPromise = null
let adminInitializationError = null

function canUseApplicationDefaultCredentials() {
  const shouldUseAdc = String(process.env.FIREBASE_USE_APPLICATION_DEFAULT || '')
    .trim()
    .toLowerCase()

  return shouldUseAdc === '1' || shouldUseAdc === 'true'
}

/**
 * Initializes and returns the admin services.
 * Uses a promise-singleton to avoid multiple initializations.
 */
async function initializeAdminServices() {
  if (adminInitializationError) {
    throw adminInitializationError
  }

  if (adminApp && adminAuth && adminDb) {
    return { adminApp, adminAuth, adminDb }
  }

  if (!adminServicesPromise) {
    adminServicesPromise = (async () => {
      try {
        const [{ cert, getApps, initializeApp, applicationDefault }, { getAuth }, { getFirestore }] =
          await Promise.all([
            import('firebase-admin/app'),
            import('firebase-admin/auth'),
            import('firebase-admin/firestore'),
          ])

        if (getApps().length > 0) {
          adminApp = getApps()[0]
        } else {
          const credentialCandidates = []

          // 1. Direct ENV credentials
          if (clientEmail && privateKey) {
            credentialCandidates.push({
              name: 'ENV-CREDENTIALS',
              config: {
                credential: cert({ projectId, clientEmail, privateKey }),
                projectId,
              }
            })
          }

          // 2. Local JSON file fallback
          if (fileServiceAccount) {
            credentialCandidates.push({
              name: 'JSON-FILE-CREDENTIALS',
              config: {
                credential: cert({
                  projectId: fileServiceAccount.project_id,
                  clientEmail: fileServiceAccount.client_email,
                  privateKey: normalizePrivateKey(fileServiceAccount.private_key),
                }),
                projectId: fileServiceAccount.project_id,
              }
            })
          }

          // 3. Application Default Credentials
          if (canUseApplicationDefaultCredentials()) {
            credentialCandidates.push({
              name: 'ADC-CREDENTIALS',
              config: {
                credential: applicationDefault(),
                projectId,
              }
            })
          }

          // 4. Naked Project ID (useful in some GCP environments)
          if (projectId) {
            credentialCandidates.push({
              name: 'PROJECT-ID-ONLY',
              config: { projectId }
            })
          }

          let lastInitError = null
          for (const cand of credentialCandidates) {
            try {
              adminApp = initializeApp(cand.config, 'admin-sdk')
              console.log(`✅ Firebase Admin initialized using ${cand.name}`)
              break
            } catch (err) {
              console.warn(`⚠️  Failed to initialize with ${cand.name}: ${err.message}`)
              lastInitError = err
            }
          }

          if (!adminApp) {
            throw lastInitError || new Error('No valid Firebase credentials found.')
          }
        }

        adminAuth = getAuth(adminApp)
        adminDb = getFirestore(adminApp)
        adminInitializationError = null

        return { adminApp, adminAuth, adminDb }
      } catch (error) {
        adminInitializationError = error
        console.warn(`Firebase Admin initialization failed: ${String(error?.message || error)}`)
        adminServicesPromise = null // Allow retry
        throw error
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

export function getAdminInitializationError() {
  return adminInitializationError
}

export function assertPrivilegedFirebaseAccess() {
  if (!projectId || !hasServiceAccountCredentials) {
    throw new Error(
      'Privileged Firebase access is not configured. Set FIREBASE_PROJECT_ID and service account credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS).'
    )
  }
}

export { hasServiceAccountCredentials }
