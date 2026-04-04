import 'server-only'
import { getAdminAuth, getAdminDb, assertPrivilegedFirebaseAccess } from '@/lib/firebase-admin'

const USERS_COLLECTION = 'users'
const RESOURCES_COLLECTION = 'resources'
const AUDIT_COLLECTION = 'audit_logs'

function nowIso() {
  return new Date().toISOString()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeLoginId(loginId) {
  return String(loginId || '').trim().toLowerCase()
}

function buildPendingStudentId(emailLower) {
  const slug = emailLower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `pending-${slug || 'student'}`
}

function createLoginIdBase(value) {
  const fallback = 'faculty'
  const base = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')

  return base || fallback
}

function randomIndex(max) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

async function requireAdminAuth() {
  const adminAuth = await getAdminAuth()
  if (!adminAuth) {
    throw new Error('Privileged Firebase access is not configured.')
  }

  return adminAuth
}

async function requireAdminDb() {
  const adminDb = await getAdminDb()
  if (!adminDb) {
    throw new Error('Privileged Firebase access is not configured.')
  }

  return adminDb
}

function generateTemporaryPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_'
  let value = ''

  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomIndex(alphabet.length)]
  }

  return `Edu-${value}`
}

function sanitizeUserData(docId, data = {}) {
  return {
    id: docId,
    uid: data.uid || docId,
    displayName: data.displayName || data.name || '',
    email: data.email || '',
    loginId: data.loginId || null,
    role: data.role || 'student',
    status: data.status || 'disabled',
    authProvider: data.authProvider || 'unknown',
    pending: Boolean(data.pending),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    lastLoginAt: data.lastLoginAt || null,
  }
}

function sanitizeAuditData(docId, data = {}) {
  return {
    id: docId,
    action: data.action || 'activity',
    message: data.message || '',
    actorUid: data.actorUid || null,
    actorRole: data.actorRole || null,
    targetId: data.targetId || null,
    targetRole: data.targetRole || null,
    createdAt: data.createdAt || null,
  }
}

function sanitizeResourceData(docId, data = {}) {
  return {
    id: docId,
    title: data.title || 'Untitled Resource',
    titleLower: data.titleLower || String(data.title || '').trim().toLowerCase(),
    subject: data.subject || 'General',
    class: data.class || 'CORE 101',
    fileUrl: data.fileUrl || '',
    status: data.status || 'live',
    uploadedBy: data.uploadedBy || data.facultyId || '',
    facultyId: data.facultyId || data.uploadedBy || '',
    facultyEmail: data.facultyEmail || '',
    summary: data.summary || data.description || '',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

async function getCollectionRecords(collectionName) {
  const adminDb = await requireAdminDb()
  const snapshot = await adminDb.collection(collectionName).get()
  return snapshot.docs
}

export async function getUserRecordById(userId) {
  const adminDb = await requireAdminDb()
  const snapshot = await adminDb.collection(USERS_COLLECTION).doc(userId).get()
  if (!snapshot.exists) {
    return null
  }

  return sanitizeUserData(snapshot.id, snapshot.data())
}

export async function getRawUserRecordById(userId) {
  const adminDb = await requireAdminDb()
  const snapshot = await adminDb.collection(USERS_COLLECTION).doc(userId).get()
  if (!snapshot.exists) {
    return null
  }

  return {
    id: snapshot.id,
    data: snapshot.data() || {},
  }
}

export async function findUserRecordByEmail(email) {
  const adminDb = await requireAdminDb()
  const emailLower = normalizeEmail(email)
  if (!emailLower) {
    return null
  }

  const snapshot = await adminDb
    .collection(USERS_COLLECTION)
    .where('emailLower', '==', emailLower)
    .limit(1)
    .get()

  const match = snapshot.docs[0]
  if (!match) {
    return null
  }

  return {
    id: match.id,
    data: match.data() || {},
    user: sanitizeUserData(match.id, match.data()),
  }
}

export async function findUserRecordByLoginId(loginId) {
  const adminDb = await requireAdminDb()
  const loginIdLower = normalizeLoginId(loginId)
  if (!loginIdLower) {
    return null
  }

  const snapshot = await adminDb
    .collection(USERS_COLLECTION)
    .where('loginIdLower', '==', loginIdLower)
    .limit(1)
    .get()

  const match = snapshot.docs[0]
  if (!match) {
    return null
  }

  return {
    id: match.id,
    data: match.data() || {},
    user: sanitizeUserData(match.id, match.data()),
  }
}

export async function listUserRecords() {
  const records = await getCollectionRecords(USERS_COLLECTION)
  return records
    .map((document) => sanitizeUserData(document.id, document.data()))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function listResourceRecords() {
  const records = await getCollectionRecords(RESOURCES_COLLECTION)
  return records
    .map((document) => sanitizeResourceData(document.id, document.data()))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function searchResourceRecords({
  searchTerm = '',
  subject = '',
  classFilter = '',
  status = 'live',
} = {}) {
  const allRecords = await listResourceRecords()
  const liveRecords = allRecords.filter((entry) => entry.status === status)

  return liveRecords.filter((entry) => {
    const matchesSearch =
      !searchTerm.trim() ||
      [entry.title, entry.subject, entry.class, entry.summary]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())

    const matchesSubject = !subject || subject === 'All Subjects' || entry.subject === subject
    const matchesClass = !classFilter || entry.class === classFilter

    return matchesSearch && matchesSubject && matchesClass
  })
}

export async function listAuditRecords(limit = 12) {
  const records = await getCollectionRecords(AUDIT_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeAuditData(document.id, document.data()))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
    .slice(0, limit)
}

export async function createAuditRecord({
  actorUid,
  actorRole,
  action,
  targetId = null,
  targetRole = null,
  message,
}) {
  try {
    const adminDb = await requireAdminDb()
    await adminDb.collection(AUDIT_COLLECTION).add({
      actorUid: actorUid || null,
      actorRole: actorRole || null,
      action: action || 'activity',
      targetId,
      targetRole,
      message: message || '',
      createdAt: nowIso(),
    })
  } catch (error) {
    console.warn('Audit log warning:', error?.message || error)
  }
}

async function ensureUniqueLoginId(baseValue) {
  const normalizedBase = createLoginIdBase(baseValue)
  let candidate = normalizedBase
  let suffix = 1

  while (true) {
    const existing = await findUserRecordByLoginId(candidate)
    if (!existing) {
      return candidate
    }

    suffix += 1
    candidate = `${normalizedBase}.${suffix}`
  }
}

export async function touchUserLogin(userId) {
  const adminDb = await requireAdminDb()
  await adminDb.collection(USERS_COLLECTION).doc(userId).set(
    {
      lastLoginAt: nowIso(),
      updatedAt: nowIso(),
    },
    { merge: true }
  )
}

export async function createManagedUser({ role, email, displayName, actorUid, actorRole }) {
  assertPrivilegedFirebaseAccess()
  const adminAuth = await requireAdminAuth()
  const adminDb = await requireAdminDb()

  const normalizedRole = role === 'admin' ? 'admin' : role === 'faculty' ? 'faculty' : 'student'
  const normalizedEmail = normalizeEmail(email)
  const safeDisplayName = String(displayName || '').trim()
  const createdAt = nowIso()

  if (!normalizedEmail) {
    throw new Error('Email is required.')
  }

  const existingByEmail = await findUserRecordByEmail(normalizedEmail)
  if (existingByEmail && existingByEmail.user.role !== normalizedRole) {
    throw new Error('An account with this email already exists under a different role.')
  }

  if (normalizedRole === 'student') {
    const documentId = existingByEmail?.id || buildPendingStudentId(normalizedEmail)
    const payload = {
      uid: existingByEmail?.data?.uid || null,
      displayName:
        safeDisplayName || existingByEmail?.data?.displayName || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      emailLower: normalizedEmail,
      role: 'student',
      status: 'active',
      authProvider: 'google',
      pending: existingByEmail?.data?.uid ? false : true,
      createdAt: existingByEmail?.data?.createdAt || createdAt,
      updatedAt: createdAt,
    }

    await adminDb.collection(USERS_COLLECTION).doc(documentId).set(payload, { merge: true })
    await createAuditRecord({
      actorUid,
      actorRole,
      action: 'user.student.prepared',
      targetId: documentId,
      targetRole: 'student',
      message: `Prepared Google-only student access for ${normalizedEmail}.`,
    })

    return {
      user: sanitizeUserData(documentId, payload),
      credentials: null,
    }
  }

  if (existingByEmail) {
    throw new Error('An account with this email already exists.')
  }

  const loginId = await ensureUniqueLoginId(
    normalizedEmail.split('@')[0] || safeDisplayName || normalizedRole
  )
  const temporaryPassword = generateTemporaryPassword()
  const authUser = await adminAuth.createUser({
    email: normalizedEmail,
    password: temporaryPassword,
    displayName: safeDisplayName || undefined,
    disabled: false,
  })

  const payload = {
    uid: authUser.uid,
    displayName: safeDisplayName || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    emailLower: normalizedEmail,
    loginId,
    loginIdLower: loginId,
    role: normalizedRole,
    status: 'active',
    authProvider: 'credentials',
    pending: false,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: null,
  }

  await adminDb.collection(USERS_COLLECTION).doc(authUser.uid).set(payload)
  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.credentials.created',
    targetId: authUser.uid,
    targetRole: normalizedRole,
    message: `Created ${normalizedRole} account for ${normalizedEmail}.`,
  })

  return {
    user: sanitizeUserData(authUser.uid, payload),
    credentials: {
      loginId,
      temporaryPassword,
    },
  }
}

export async function setManagedUserStatus({ userId, nextStatus, actorUid, actorRole }) {
  assertPrivilegedFirebaseAccess()
  const adminAuth = await requireAdminAuth()
  const adminDb = await requireAdminDb()

  const record = await getRawUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  const normalizedStatus = nextStatus === 'active' ? 'active' : 'disabled'
  if (record.data.role === 'admin' && record.id === actorUid && normalizedStatus !== 'active') {
    throw new Error('You cannot disable your own admin account from this panel.')
  }

  const updated = {
    ...record.data,
    status: normalizedStatus,
    updatedAt: nowIso(),
  }

  await adminDb.collection(USERS_COLLECTION).doc(record.id).set(updated, { merge: true })

  if (updated.uid) {
    try {
      await adminAuth.updateUser(updated.uid, {
        disabled: normalizedStatus !== 'active',
      })
    } catch (error) {
      console.warn('Firebase Auth status sync warning:', error?.message || error)
    }
  }

  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.status.updated',
    targetId: record.id,
    targetRole: updated.role,
    message: `Set ${updated.email || record.id} to ${normalizedStatus}.`,
  })

  return sanitizeUserData(record.id, updated)
}

export async function resetManagedCredentials({ userId, actorUid, actorRole }) {
  assertPrivilegedFirebaseAccess()
  const adminAuth = await requireAdminAuth()
  const adminDb = await requireAdminDb()

  const record = await getRawUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  if (record.data.authProvider !== 'credentials' || !record.data.uid) {
    throw new Error('Only credential-managed accounts can be reset.')
  }

  const temporaryPassword = generateTemporaryPassword()
  await adminAuth.updateUser(record.data.uid, {
    password: temporaryPassword,
    disabled: record.data.status !== 'active',
  })

  await adminDb.collection(USERS_COLLECTION).doc(record.id).set(
    {
      updatedAt: nowIso(),
    },
    { merge: true }
  )

  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.credentials.reset',
    targetId: record.id,
    targetRole: record.data.role,
    message: `Reset credentials for ${record.data.email || record.id}.`,
  })

  return {
    user: sanitizeUserData(record.id, record.data),
    credentials: {
      loginId: record.data.loginId || null,
      temporaryPassword,
    },
  }
}

export async function resolveStudentGoogleUser(decodedToken) {
  assertPrivilegedFirebaseAccess()
  const adminDb = await requireAdminDb()

  const email = normalizeEmail(decodedToken?.email)
  if (!decodedToken?.uid || !email) {
    throw new Error('A verified Google email is required for student access.')
  }

  const currentRecord = await getRawUserRecordById(decodedToken.uid)
  if (currentRecord) {
    if (currentRecord.data.role !== 'student') {
      throw new Error('This Google account is not assigned to the student portal.')
    }

    const merged = {
      ...currentRecord.data,
      uid: decodedToken.uid,
      email,
      emailLower: email,
      displayName:
        currentRecord.data.displayName ||
        decodedToken.name ||
        email.split('@')[0],
      authProvider: 'google',
      pending: false,
      updatedAt: nowIso(),
      lastLoginAt: nowIso(),
    }

    await adminDb.collection(USERS_COLLECTION).doc(decodedToken.uid).set(merged, { merge: true })
    return sanitizeUserData(decodedToken.uid, merged)
  }

  const existingByEmail = await findUserRecordByEmail(email)
  if (existingByEmail) {
    if (existingByEmail.user.role !== 'student') {
      throw new Error('This Google account is not assigned to the student portal.')
    }

    const merged = {
      ...existingByEmail.data,
      uid: decodedToken.uid,
      email,
      emailLower: email,
      displayName:
        existingByEmail.data.displayName ||
        decodedToken.name ||
        email.split('@')[0],
      authProvider: 'google',
      pending: false,
      updatedAt: nowIso(),
      lastLoginAt: nowIso(),
    }

    const batch = adminDb.batch()
    batch.set(adminDb.collection(USERS_COLLECTION).doc(decodedToken.uid), merged, { merge: true })
    if (existingByEmail.id !== decodedToken.uid) {
      batch.delete(adminDb.collection(USERS_COLLECTION).doc(existingByEmail.id))
    }
    await batch.commit()
    return sanitizeUserData(decodedToken.uid, merged)
  }

  const payload = {
    uid: decodedToken.uid,
    displayName: decodedToken.name || email.split('@')[0],
    email,
    emailLower: email,
    role: 'student',
    status: 'active',
    authProvider: 'google',
    pending: false,
    selfRegistered: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastLoginAt: nowIso(),
  }

  await adminDb.collection(USERS_COLLECTION).doc(decodedToken.uid).set(payload)
  await createAuditRecord({
    actorUid: decodedToken.uid,
    actorRole: 'student',
    action: 'user.student.self-registered',
    targetId: decodedToken.uid,
    targetRole: 'student',
    message: `Student access created for ${email}.`,
  })

  return sanitizeUserData(decodedToken.uid, payload)
}

export async function createStudentAccount({ email, password, displayName, googleIdToken }) {
  assertPrivilegedFirebaseAccess()
  const adminAuth = await requireAdminAuth()
  const adminDb = await requireAdminDb()

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    throw new Error('Invalid email address.')
  }

  const existingByEmail = await findUserRecordByEmail(normalizedEmail)
  if (existingByEmail) {
    throw new Error('An account with this email already exists.')
  }

  const createdAt = nowIso()
  const authUser = await adminAuth.createUser({
    email: normalizedEmail,
    password,
    displayName: displayName || undefined,
    disabled: false,
  })

  const payload = {
    uid: authUser.uid,
    displayName: displayName || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    emailLower: normalizedEmail,
    role: 'student',
    status: 'active',
    authProvider: 'credentials',
    pending: false,
    selfRegistered: true,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: null,
  }

  await adminDb.collection(USERS_COLLECTION).doc(authUser.uid).set(payload)
  await createAuditRecord({
    actorUid: authUser.uid,
    actorRole: 'student',
    action: 'user.student.self-registered',
    targetId: authUser.uid,
    targetRole: 'student',
    message: `Student account created for ${normalizedEmail}.`,
  })

  return {
    user: sanitizeUserData(authUser.uid, payload),
  }
}

export async function createResourceRecord({ session, payload }) {
  assertPrivilegedFirebaseAccess()
  const adminDb = await requireAdminDb()

  const title = String(payload?.title || '').trim()
  const subject = String(payload?.subject || '').trim()
  const courseClass = String(payload?.class || '').trim()
  const fileUrl = String(payload?.fileUrl || '').trim()
  const summary = String(payload?.summary || '').trim()
  const status = payload?.status === 'draft' ? 'draft' : 'live'

  if (!title || !subject || !courseClass || !fileUrl) {
    throw new Error('Title, subject, class, and file URL are required.')
  }

  const createdAt = nowIso()
  const document = await adminDb.collection(RESOURCES_COLLECTION).add({
    title,
    titleLower: title.toLowerCase(),
    subject,
    class: courseClass,
    fileUrl,
    summary,
    status,
    uploadedBy: session.uid,
    facultyId: session.uid,
    facultyEmail: session.email || '',
    createdAt,
    updatedAt: createdAt,
  })

  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.created',
    targetId: document.id,
    targetRole: 'resource',
    message: `Created resource "${title}".`,
  })

  return sanitizeResourceData(document.id, {
    title,
    titleLower: title.toLowerCase(),
    subject,
    class: courseClass,
    fileUrl,
    summary,
    status,
    uploadedBy: session.uid,
    facultyId: session.uid,
    facultyEmail: session.email || '',
    createdAt,
    updatedAt: createdAt,
  })
}

export async function updateResourceRecord({ resourceId, session, payload }) {
  assertPrivilegedFirebaseAccess()
  const adminDb = await requireAdminDb()

  const snapshot = await adminDb.collection(RESOURCES_COLLECTION).doc(resourceId).get()
  if (!snapshot.exists) {
    throw new Error('Resource not found.')
  }

  const current = snapshot.data() || {}
  if (current.uploadedBy !== session.uid && current.facultyId !== session.uid) {
    throw new Error('You can only manage resources that you uploaded.')
  }

  const title = String(payload?.title || '').trim()
  const subject = String(payload?.subject || '').trim()
  const courseClass = String(payload?.class || '').trim()
  const fileUrl = String(payload?.fileUrl || '').trim()
  const summary = String(payload?.summary || '').trim()
  const status = payload?.status === 'draft' ? 'draft' : 'live'

  if (!title || !subject || !courseClass || !fileUrl) {
    throw new Error('Title, subject, class, and file URL are required.')
  }

  const updated = {
    ...current,
    title,
    titleLower: title.toLowerCase(),
    subject,
    class: courseClass,
    fileUrl,
    summary,
    status,
    updatedAt: nowIso(),
  }

  await adminDb.collection(RESOURCES_COLLECTION).doc(resourceId).set(updated, { merge: true })
  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.updated',
    targetId: resourceId,
    targetRole: 'resource',
    message: `Updated resource "${title}".`,
  })

  return sanitizeResourceData(resourceId, updated)
}

export async function deleteResourceRecord({ resourceId, session }) {
  assertPrivilegedFirebaseAccess()
  const adminDb = await requireAdminDb()

  const snapshot = await adminDb.collection(RESOURCES_COLLECTION).doc(resourceId).get()
  if (!snapshot.exists) {
    throw new Error('Resource not found.')
  }

  const current = snapshot.data() || {}
  if (current.uploadedBy !== session.uid && current.facultyId !== session.uid) {
    throw new Error('You can only manage resources that you uploaded.')
  }

  await adminDb.collection(RESOURCES_COLLECTION).doc(resourceId).delete()
  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.deleted',
    targetId: resourceId,
    targetRole: 'resource',
    message: `Deleted resource "${current.title || resourceId}".`,
  })
}
