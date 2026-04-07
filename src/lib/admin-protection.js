export const PROTECTED_ADMIN_EMAIL = 'ss7051017@gmail.com'

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function isProtectedAdminEmail(email) {
  return normalizeEmail(email) === PROTECTED_ADMIN_EMAIL
}

export function requiresProtectedAdminPasswordForExport(currentUserEmail) {
  return !isProtectedAdminEmail(currentUserEmail)
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
