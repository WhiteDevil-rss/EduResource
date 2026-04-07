import 'server-only'
import { ApiError } from '@/lib/api-security'

/**
 * RBAC (Role-Based Access Control) Middleware
 * Provides strict authorization controls based on user roles
 */

const ROLE_HIERARCHY = {
  admin: 3,
  faculty: 2,
  student: 1,
}

export const ADMIN_ROUTES = {
  // User Management
  'POST /api/admin/users': ['admin'],
  'GET /api/admin/users': ['admin'],
  'GET /api/admin/users/:userId': ['admin'],
  'PATCH /api/admin/users/:userId/status': ['admin'],
  'POST /api/admin/users/:userId/reset-credentials': ['admin'],
  'DELETE /api/admin/users/:userId': ['admin'],

  // Statistics & Audit
  'GET /api/admin/overview': ['admin'],
  'GET /api/admin/audit-logs': ['admin'],
  'GET /api/admin/session-settings': ['admin'],
  'PUT /api/admin/session-settings': ['admin'],
}

export const FACULTY_ROUTES = {
  // Resource Management
  'POST /api/faculty/resources': ['faculty', 'admin'],
  'GET /api/faculty/resources': ['faculty', 'admin'],
  'GET /api/faculty/resource-requests': ['faculty', 'admin'],
  'GET /api/faculty/resources/:resourceId': ['faculty', 'admin'],
  'PATCH /api/faculty/resources/:resourceId': ['faculty', 'admin'],
  'DELETE /api/faculty/resources/:resourceId': ['faculty', 'admin'],
}

export const STUDENT_ROUTES = {
  // Resource Access
  'GET /api/student/resources': ['student', 'faculty', 'admin'],
  'GET /api/student/resources/:resourceId': ['student', 'faculty', 'admin'],
}

export const PUBLIC_ROUTES = [
  'GET /login',
  'POST /api/auth/student-google',
  'POST /api/auth/credential-login',
  'POST /api/auth/register-student',
  'GET /api/session',
]

/**
 * Validates if a user with a given role can access a given endpoint
 * @param {string} session - User session object
 * @param {string} endpoint - Endpoint path (e.g., 'POST /api/admin/users')
 * @returns {boolean} Whether access is allowed
 */
export function validateAccess(session, endpoint) {
  if (!session || !session.uid || !session.role) {
    throw new ApiError(401, 'Authentication required.')
  }

  if (session.status !== 'active') {
    throw new ApiError(403, 'Your account is currently inactive or disabled.')
  }

  // Check against route-specific permissions
  const adminRoute = Object.entries(ADMIN_ROUTES).find(([pattern]) =>
    matchRoute(endpoint, pattern)
  )
  if (adminRoute && !adminRoute[1].includes(session.role)) {
    throw new ApiError(
      403,
      'You do not have permission to access this resource.'
    )
  }

  const facultyRoute = Object.entries(FACULTY_ROUTES).find(([pattern]) =>
    matchRoute(endpoint, pattern)
  )
  if (facultyRoute && !facultyRoute[1].includes(session.role)) {
    throw new ApiError(
      403,
      'You do not have permission to access this resource.'
    )
  }

  const studentRoute = Object.entries(STUDENT_ROUTES).find(([pattern]) =>
    matchRoute(endpoint, pattern)
  )
  if (studentRoute && !studentRoute[1].includes(session.role)) {
    throw new ApiError(
      403,
      'You do not have permission to access this resource.'
    )
  }

  return true
}

/**
 * Ensures a user has a specific role or higher (admin > faculty > student)
 * @param {object} session - User session
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean}
 */
export function requireRole(session, requiredRoles) {
  if (!session || !session.uid || !session.role) {
    throw new ApiError(401, 'Authentication required.')
  }

  if (session.status !== 'active') {
    throw new ApiError(403, 'Your account is currently inactive or disabled.')
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  if (!roles.includes(session.role)) {
    throw new ApiError(
      403,
      'You do not have permission to access this resource.'
    )
  }

  return true
}

/**
 * Ensures a user has at least a minimum role level (admin > faculty > student)
 * @param {object} session - User session
 * @param {string} minimumRole - Minimum required role
 * @returns {boolean}
 */
export function requireMinimumRole(session, minimumRole) {
  if (!session || !session.uid || !session.role) {
    throw new ApiError(401, 'Authentication required.')
  }

  if (session.status !== 'active') {
    throw new ApiError(403, 'Your account is currently inactive or disabled.')
  }

  const userLevel = ROLE_HIERARCHY[session.role] || 0
  const minLevel = ROLE_HIERARCHY[minimumRole] || 0

  if (userLevel < minLevel) {
    throw new ApiError(
      403,
      'You do not have sufficient permissions to access this resource.'
    )
  }

  return true
}

/**
 * Ensures a user owns a resource (ownership check)
 * @param {string} ownerId - UID of resource owner
 * @param {string} currentUserId - Current user's UID
 * @param {string} currentUserRole - Current user's role
 * @returns {boolean}
 */
export function validateOwnership(ownerId, currentUserId, currentUserRole) {
  if (ownerId === currentUserId) {
    return true
  }

  if (currentUserRole === 'admin') {
    return true
  }

  throw new ApiError(403, 'You do not have permission to modify this resource.')
}

/**
 * Prevents user from modifying their own critical properties (unless they're not admin)
 * @param {string} targetUserId - ID of user being modified
 * @param {object} session - Current user's session
 * @param {string[]} protectedFields - Fields that can't be changed
 * @returns {boolean}
 */
export function validateSelfModification(
  targetUserId,
  session
) {
  if (targetUserId === session.uid) {
    throw new ApiError(
      403,
      'You cannot modify your own critical account properties.'
    )
  }

  return true
}

/**
 * Simple pattern matching for route endpoints
 * @param {string} endpoint - Actual endpoint (e.g., 'POST /api/users/123')
 * @param {string} pattern - Pattern to match (e.g., 'POST /api/users/:userId')
 * @returns {boolean}
 */
function matchRoute(endpoint, pattern) {
  const endpointParts = endpoint.split(' ')
  const patternParts = pattern.split(' ')

  if (endpointParts[0] !== patternParts[0]) {
    return false
  }

  const endpointPath = endpointParts[1]
  const patternPath = patternParts[1]

  const endpointSegments = endpointPath.split('/')
  const patternSegments = patternPath.split('/')

  if (endpointSegments.length !== patternSegments.length) {
    return false
  }

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i]
    if (!patternSegment.startsWith(':')) {
      if (endpointSegments[i] !== patternSegment) {
        return false
      }
    }
  }

  return true
}

/**
 * Gets all permissions for a specific role
 * @param {string} role - User role
 * @returns {Set<string>} Set of accessible endpoints
 */
export function getPermissionsForRole(role) {
  const permissions = new Set()

  if (role === 'admin') {
    Object.keys(ADMIN_ROUTES).forEach((route) => permissions.add(route))
    Object.keys(FACULTY_ROUTES)
      .filter((route) => FACULTY_ROUTES[route].includes('admin'))
      .forEach((route) => permissions.add(route))
    Object.keys(STUDENT_ROUTES)
      .filter((route) => STUDENT_ROUTES[route].includes('admin'))
      .forEach((route) => permissions.add(route))
  } else if (role === 'faculty') {
    Object.keys(FACULTY_ROUTES).forEach((route) => permissions.add(route))
    Object.keys(STUDENT_ROUTES)
      .filter((route) => STUDENT_ROUTES[route].includes('faculty'))
      .forEach((route) => permissions.add(route))
  } else if (role === 'student') {
    Object.keys(STUDENT_ROUTES)
      .filter((route) => STUDENT_ROUTES[route].includes('student'))
      .forEach((route) => permissions.add(route))
  }

  return permissions
}
