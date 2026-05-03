function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function readConfiguredSuperAdminEmail() {
  const frontendEmail =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || process.env.VITE_SUPER_ADMIN_EMAIL
      : ''
  const backendEmail = typeof process !== 'undefined' ? process.env.SUPER_ADMIN_EMAIL : ''
  return normalizeEmail(frontendEmail || backendEmail)
}

export const PROTECTED_ADMIN_EMAIL = readConfiguredSuperAdminEmail()

export const ADMIN_DASHBOARD_PATH = '/admin/dashboard'

const ADMIN_PANEL_SHARED_ROLES = ['admin', 'super_admin']
const ADMIN_PANEL_SUPER_ADMIN_ONLY_FEATURES = new Set([
  'security-settings',
  'advanced-security',
  'ip-management',
  'audit-logs',
  'suspicious-activity',
  'activity-timeline',
  'export-reports',
  'backup-system',
])

export function getSuperAdminEmail() {
  return PROTECTED_ADMIN_EMAIL
}

export function isSuperAdminEmail(email) {
  return isProtectedAdminEmail(email)
}

export function isProtectedAdminEmail(email) {
  const configuredEmail = getSuperAdminEmail()
  return Boolean(configuredEmail) && normalizeEmail(email) === configuredEmail
}

export function requiresProtectedAdminPasswordForExport(currentUserEmail) {
  return !isProtectedAdminEmail(currentUserEmail)
}

export function isSuperAdmin(user) {
  if (!user) return false
  return isProtectedAdminEmail(user.email)
}

export function isAdminUser(user, roleOverride = null) {
  const role = String(roleOverride || user?.role || '').trim().toLowerCase()
  return role === 'admin' || isSuperAdmin(user)
}

export function getPostLoginRedirectPath(user, role = user?.role) {
  const normalizedRole = String(role || '').trim().toLowerCase()

  if (normalizedRole === 'admin' || isSuperAdmin(user)) {
    return ADMIN_DASHBOARD_PATH
  }

  if (!normalizedRole) {
    return '/login'
  }

  return `/dashboard/${normalizedRole}`
}

export function getAdminNavAllowedScopes(featureId) {
  if (ADMIN_PANEL_SUPER_ADMIN_ONLY_FEATURES.has(featureId)) {
    return ['super_admin']
  }

  return ADMIN_PANEL_SHARED_ROLES
}

export function canAccessAdminFeature(user, featureId) {
  if (!isAdminUser(user)) {
    return false
  }

  if (ADMIN_PANEL_SUPER_ADMIN_ONLY_FEATURES.has(featureId)) {
    return isSuperAdmin(user)
  }

  return true
}

export function isSameUser(currentUser, targetUser) {
  const sameUid =
    Boolean(currentUser?.uid) &&
    Boolean(targetUser?.id) &&
    String(currentUser.uid).trim() === String(targetUser.id).trim()

  const currentEmail = normalizeEmail(currentUser?.email)
  const targetEmail = normalizeEmail(targetUser?.email)
  const sameEmail = Boolean(currentEmail) && Boolean(targetEmail) && currentEmail === targetEmail

  return sameUid || sameEmail
}

export function getUserManagementActionPolicy(currentUser, targetUser) {
  if (!targetUser) {
    return {
      showMenu: false,
      allowResetPassword: false,
      allowSensitiveActions: false,
      protectedTarget: false,
      selfTarget: false,
    }
  }

  const protectedTarget = isProtectedAdminEmail(targetUser.email)
  const selfTarget = isSameUser(currentUser, targetUser)

  if (protectedTarget && !selfTarget) {
    return {
      showMenu: false,
      allowResetPassword: false,
      allowSensitiveActions: false,
      protectedTarget: true,
      selfTarget: false,
    }
  }

  if (selfTarget) {
    return {
      showMenu: true,
      allowResetPassword: true,
      allowSensitiveActions: false,
      protectedTarget,
      selfTarget: true,
    }
  }

  return {
    showMenu: true,
    allowResetPassword: true,
    allowSensitiveActions: true,
    protectedTarget,
    selfTarget: false,
  }
}
