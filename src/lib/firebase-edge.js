import * as jose from 'jose'

/**
 * 🛠️ FIREBASE EDGE CLIENT (Cloudflare Native)
 * 
 * Replaces firebase-admin with direct REST API calls using 'fetch'
 * and the 'jose' library for token verification.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const SERVICE_ACCOUNT = {
  project_id: PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY
}

async function parseResponsePayload(response) {
  const text = await response.text()
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function extractApiErrorMessage(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message
  }

  if (typeof payload?.error === 'string') {
    return payload.error
  }

  if (typeof payload?.message === 'string') {
    return payload.message
  }

  if (typeof payload?.raw === 'string' && payload.raw.trim().startsWith('<!DOCTYPE')) {
    return `${fallback} (received HTML response from upstream API)`
  }

  return fallback
}

function normalizePrivateKey(privateKey) {
  if (!privateKey) return privateKey

  const trimmed = String(privateKey).trim()
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed

  const normalized = unquoted.replace(/\\n/g, '\n').trim()

  // Some deployments store the body only (base64) without PEM guards.
  if (!normalized.includes('BEGIN PRIVATE KEY') && !normalized.includes('END PRIVATE KEY')) {
    const compact = normalized.replace(/\s+/g, '')
    if (/^[A-Za-z0-9+/=]+$/.test(compact)) {
      const lines = compact.match(/.{1,64}/g) || [compact]
      return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`
    }
  }

  return normalized
}

// Cache for Google's public keys (JWKS)
let cachedJwks = null
let jwksExpiry = 0

/**
 * Verifies a Firebase ID Token using Google's public certificates.
 * Fully compatible with Cloudflare Edge runtime.
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!idToken) throw new Error('ID Token is required')

  const projectId = PROJECT_ID
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not configured')

  // 1. Fetch JWKS from Google if not cached or expired
  if (!cachedJwks || Date.now() > jwksExpiry) {
    try {
      const jwksRes = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
      if (!jwksRes.ok) throw new Error('Could not fetch Google public keys')
      cachedJwks = await jwksRes.json()
      jwksExpiry = Date.now() + 3600000 // Cache for 1 hour
    } catch (err) {
      console.error('Failed to fetch JWKS:', err)
      throw new Error('Authentication service temporarily unavailable')
    }
  }

  // 2. Verify with jose
  try {
    const JWKS = jose.createLocalJWKSet(cachedJwks)
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId
    })

    return {
      uid: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      picture: payload.picture,
      name: payload.name,
      ...payload
    }
  } catch (error) {
    console.error('ID Token verification failed:', error)
    throw new Error('Invalid or expired Firebase ID Token')
  }
}

/**
 * Generates a Google Access Token using the Service Account credentials.
 * Used for authenticated Firestore REST requests on the Edge.
 */
async function getGoogleAccessToken() {
  const { client_email, private_key } = SERVICE_ACCOUNT
  if (!client_email || !private_key) {
    throw new Error('Missing service account credentials (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)')
  }

  // Import private key for signing
  const pk = normalizePrivateKey(private_key)
  const alg = 'RS256'
  
  try {
    const privateKey = await jose.importPKCS8(pk, alg)

    // Create Signed JWT (Assertion)
    const jwt = await new jose.SignJWT({
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    })
      .setProtectedHeader({ alg })
      .setIssuer(client_email)
      .setSubject(client_email)
      .setAudience('https://oauth2.googleapis.com/token')
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(privateKey)

    // Exchange for Access Token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    const data = await parseResponsePayload(response)
    if (!response.ok) {
      throw new Error(
        `Cloudflare Edge Auth Error: ${extractApiErrorMessage(data, 'Token exchange failed.')}`
      )
    }

    const { access_token } = data
    if (!access_token) {
      throw new Error('Cloudflare Edge Auth Error: Missing access token in response.')
    }

    return access_token
  } catch (err) {
    const message = String(err?.message || err)
    if (
      message.includes('base64 input') ||
      message.includes('PKCS8') ||
      message.includes('private key')
    ) {
      throw new Error(
        'Privileged Firebase access is not configured correctly (invalid FIREBASE_PRIVATE_KEY format).'
      )
    }

    console.error('Failed to generate access token:', err)
    throw err
  }
}

/**
 * Execute a Firestore REST API request.
 */
async function firestoreRequest(method, path, body = null) {
  const token = await getGoogleAccessToken()
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  const data = await parseResponsePayload(response)

  if (!response.ok) {
    // Return null for 404s on GET requests (common check for document existence)
    if (response.status === 404 && method === 'GET') return null
    throw new Error(
      `Firestore REST Error [${response.status}]: ${extractApiErrorMessage(data, response.statusText)}`
    )
  }

  return data
}

/**
 * Helper to transform Firestore REST data to a regular JS object.
 */
function fromFirestore(fields) {
  const result = {}
  if (!fields) return result
  
  for (const [key, value] of Object.entries(fields)) {
    // Basic types support (String, Boolean, Timestamp, Map, etc.)
    if ('stringValue' in value) result[key] = value.stringValue
    else if ('booleanValue' in value) result[key] = value.booleanValue
    else if ('integerValue' in value) result[key] = parseInt(value.integerValue)
    else if ('doubleValue' in value) result[key] = value.doubleValue
    else if ('timestampValue' in value) result[key] = value.timestampValue
    else if ('mapValue' in value) result[key] = fromFirestore(value.mapValue.fields)
    else if ('arrayValue' in value) result[key] = (value.arrayValue.values || []).map(v => Object.values(v)[0])
    else result[key] = value
  }
  return result
}

/**
 * Helper to transform a JS object to Firestore REST fields.
 */
function toFirestore(obj) {
  const fields = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue
    
    if (typeof value === 'string') fields[key] = { stringValue: value }
    else if (typeof value === 'boolean') fields[key] = { booleanValue: value }
    else if (typeof value === 'number') {
      if (Number.isInteger(value)) fields[key] = { integerValue: value.toString() }
      else fields[key] = { doubleValue: value }
    }
    else if (Array.isArray(value)) fields[key] = { arrayValue: { values: value.map(v => toFirestore({ v: v }).v) } }
    else if (typeof value === 'object') fields[key] = { mapValue: { fields: toFirestore(value) } }
  }
  return fields
}

// AUTH EXPORTS
export const auth = {
  /**
   * Verified by 'jose' on the Edge.
   */
  verifyIdToken: (idToken) => verifyFirebaseIdToken(idToken),

  /**
   * Identity Platform REST - Create User
   */
  createUser: async (userData) => {
    const token = await getGoogleAccessToken()
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`
    
    // adminAuth.createUser map: { email, password, displayName } -> { email, password, displayName }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        disabled: userData.disabled === true
      })
    })
    
    const data = await parseResponsePayload(response)
    if (!response.ok) {
      throw new Error(`Auth REST Error: ${extractApiErrorMessage(data, 'Create failed')}`)
    }
    
    return { uid: data.localId, ...data }
  },

  /**
   * Identity Platform REST - Update User
   */
  updateUser: async (uid, userData) => {
    const token = await getGoogleAccessToken()
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        localId: uid,
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        disableUser: userData.disabled === true
      })
    })
    
    const data = await parseResponsePayload(response)
    if (!response.ok) {
      throw new Error(`Auth REST Error: ${extractApiErrorMessage(data, 'Update failed')}`)
    }
    
    return { uid, ...data }
  }
}

// EXPORTS FOR server-data.js Replacement
export const firestore = {
  getDoc: async (path) => {
    const data = await firestoreRequest('GET', path)
    if (!data) return null
    return { id: data.name.split('/').pop(), ...fromFirestore(data.fields) }
  },
  
  listDocs: async (collectionPath) => {
    const data = await firestoreRequest('GET', collectionPath)
    if (!data || !data.documents) return []
    return (data.documents).map(doc => ({
      id: doc.name.split('/').pop(),
      ...fromFirestore(doc.fields)
    }))
  },

  /**
   * Updates or creates a document.
   * Path should be collection/docId
   */
  setDoc: async (path, fields, merge = false) => {
    // Firestore REST 'PATCH' with mask for merge support:
    const updateFields = toFirestore(fields)
    const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&')
    const url = merge ? `${path}?${fieldPaths}` : path
    
    const data = await firestoreRequest('PATCH', url, { fields: updateFields })
    return { id: data.name.split('/').pop(), ...fromFirestore(data.fields) }
  },

  /**
   * Adds a document to a collection with a generated ID.
   */
  addDoc: async (collectionPath, fields) => {
    const data = await firestoreRequest('POST', collectionPath, { fields: toFirestore(fields) })
    return { id: data.name.split('/').pop(), ...fromFirestore(data.fields) }
  },

  deleteDoc: async (path) => {
    await firestoreRequest('DELETE', path)
    return true
  },

  /**
   * Runs a structured query on a collection.
   */
  runQuery: async (collectionPath, filter) => {
    const token = await getGoogleAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`

    const [field, op, value] = filter

    const query = {
      structuredQuery: {
        from: [{ collectionId: collectionPath }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: op === '==' ? 'EQUAL' : op,
            value: toFirestore({ v: value }).v
          }
        },
        limit: 1
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Firestore Query Error: ${error.error?.message || response.statusText}`)
    }

    const results = await response.json()
    const first = (results || []).find((entry) => entry.document)
    if (!first) return null

    return {
      id: first.document.name.split('/').pop(),
      ...fromFirestore(first.document.fields)
    }
  },

  /**
   * Runs a structured query and returns up to `limit` matches.
   */
  runQueryMany: async (collectionPath, filter, limit = 10) => {
    const token = await getGoogleAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`

    const [field, op, value] = filter
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10))

    const query = {
      structuredQuery: {
        from: [{ collectionId: collectionPath }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: op === '==' ? 'EQUAL' : op,
            value: toFirestore({ v: value }).v
          }
        },
        limit: safeLimit
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Firestore Query Error: ${error.error?.message || response.statusText}`)
    }

    const results = await response.json()
    return (results || [])
      .filter((entry) => entry?.document)
      .map((entry) => ({
        id: entry.document.name.split('/').pop(),
        ...fromFirestore(entry.document.fields)
      }))
  },

  /**
   * Commits a batch of writes atomically.
   * ops: Array of { type: 'set'|'delete', path, data?, merge? }
   */
  commit: async (ops) => {
    const token = await getGoogleAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`
    
    const writes = ops.map(op => {
      const fullPath = `projects/${PROJECT_ID}/databases/(default)/documents/${op.path}`
      if (op.type === 'delete') {
        return { delete: fullPath }
      }
      
      const update = {
        name: fullPath,
        fields: toFirestore(op.data)
      }

      if (op.merge) {
        return {
          update,
          updateMask: { fieldPaths: Object.keys(op.data) }
        }
      }
      return { update }
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writes })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Firestore Commit Error: ${error.error?.message || response.statusText}`)
    }

    return await response.json()
  }
}
