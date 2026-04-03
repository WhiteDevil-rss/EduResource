const FIRESTORE_SETUP_PATTERNS = [
  'cloud firestore api has not been used in project',
  'cloud firestore is not enabled for project',
  'firestore.googleapis.com',
  'service_disabled',
  'api has not been used in project',
  'database (default) does not exist',
]

const CLIENT_FIRESTORE_UNAVAILABLE_KEY = 'eduresourcehub.firestore-unavailable.v1'

export function isRoleValue(role) {
  return role === 'student' || role === 'faculty' || role === 'admin'
}

export function isFirestoreSetupError(error) {
  const code = String(error?.code || error?.status || '').toLowerCase()
  const message = String(error?.message || error || '').toLowerCase()

  if (code.includes('service_disabled')) {
    return true
  }

  return FIRESTORE_SETUP_PATTERNS.some((pattern) => message.includes(pattern))
}

export function getFirestoreSetupMessage(
  projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
) {
  if (projectId) {
    return `Cloud Firestore is not enabled for project ${projectId}. Enable Firestore in Firebase Console or Google Cloud, then retry.`
  }

  return 'Cloud Firestore is not enabled for this Firebase project. Enable Firestore, then retry.'
}

export function isClientFirestoreUnavailable() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(CLIENT_FIRESTORE_UNAVAILABLE_KEY) === 'true'
  } catch {
    return false
  }
}

export function markClientFirestoreUnavailable() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(CLIENT_FIRESTORE_UNAVAILABLE_KEY, 'true')
  } catch {
    // Ignore localStorage errors (e.g., in private browsing mode)
  }
}

export function clearClientFirestoreUnavailable() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(CLIENT_FIRESTORE_UNAVAILABLE_KEY)
  } catch {
    // Ignore localStorage errors (e.g., in private browsing mode)
  }
}
