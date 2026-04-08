import { isProtectedAdminEmail } from '@/lib/admin-protection'

export const FEATURE_ACCESS = {
  student: ['search', 'bookmarks', 'reviews', 'dashboard', 'preview', 'notifications', 'study_tracking', 'collections'],
  faculty: ['upload', 'collections', 'analytics', 'reviews', 'bulk_actions', 'preview'],
  admin: ['advanced_analytics', 'security_settings', 'advanced_security_controls', 'ip_management', 'user_management', 'audit_logs', 'suspicious_activity', 'activity_timeline', 'export_reports', 'backup_system', 'content_moderation', 'compliance_reports', 'integration_hub', 'system_health'],
}

export function getUserAccessScope(user) {
  const email = String(user?.email || '').trim()
  const role = String(user?.role || '').trim().toLowerCase()
  const isSuperAdmin = isProtectedAdminEmail(email)

  if (isSuperAdmin) {
    return 'super_admin'
  }

  if (role === 'faculty') {
    return 'faculty'
  }

  if (role === 'admin') {
    return 'admin'
  }

  return 'student'
}

export function canAccessFeature(user, feature) {
  const scope = getUserAccessScope(user)
  if (scope === 'super_admin') {
    return true
  }

  if (scope === 'faculty') {
    return FEATURE_ACCESS.faculty.includes(feature) || FEATURE_ACCESS.student.includes(feature)
  }

  if (scope === 'admin') {
    return FEATURE_ACCESS.admin.includes(feature)
  }

  return FEATURE_ACCESS.student.includes(feature)
}

export function filterNavItemsByRole(user, navItems = []) {
  const scope = getUserAccessScope(user)

  return navItems.filter((item) => {
    const allowed = Array.isArray(item.allowedScopes) ? item.allowedScopes : ['student', 'faculty', 'admin', 'super_admin']
    if (scope === 'super_admin') {
      return true
    }

    return allowed.includes(scope)
  })
}
