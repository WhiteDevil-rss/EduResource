'use client'

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Inbox,
  HardDrive,
  KeyRound,
  LayoutPanelTop,
  Library,
  MoreVertical,
  ShieldAlert,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AdminDashboardSkeleton } from '@/components/LoadingStates'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { SuspiciousActivityPanel } from '@/components/SuspiciousActivityPanel'
import { SecurityBlockManagement } from '@/components/SecurityBlockManagement'
import { DashboardScrollableSection } from '@/components/dashboard/DashboardScrollableSection'
import { ExportReportsSection, BackupSystemSection } from '@/components/ExportBackupSection'
import { SecurityAdvancedSettings } from '@/components/SecurityAdvancedSettings'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { BulkActionBar } from '@/components/BulkActionBar'
import { SelectableCard } from '@/components/SelectableCard'
import { performBulkDelete, performBulkExport } from '@/lib/bulk-operations'
import { getUserManagementActionPolicy, isProtectedAdminEmail, requiresProtectedAdminPasswordForExport, isSuperAdmin } from '@/lib/admin-protection'
import { formatDisplayDate, formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'
import { minutesToMs, msToMinutes, SESSION_SETTINGS_DEFAULTS } from '@/lib/session-settings'

const EMPTY_CREATE_FORM = {
  role: 'faculty',
  displayName: '',
  email: '',
}

function requestStatusLabel(status) {
  if (status === 'underreview') return 'Under Review'
  if (status === 'done') return 'Done'
  return 'Pending'
}

function authProviderLabel(entry) {
  if (entry.authProvider === 'google') {
    return entry.pending ? 'Google access pending' : 'Google OAuth'
  }
  return 'Admin-issued credentials'
}

function buildTimeoutForm(settings) {
  return {
    inactivityMinutes: String(msToMinutes(settings.inactivityTimeout)),
    warningMinutes: String(msToMinutes(settings.warningTimeout)),
    maxSessionMinutes: String(msToMinutes(settings.maxSessionTimeout)),
  }
}

function parseTimeoutForm(formState) {
  const inactivityMinutes = Number(formState.inactivityMinutes)
  const warningMinutes = Number(formState.warningMinutes)
  const maxSessionMinutes = Number(formState.maxSessionMinutes)

  if (![inactivityMinutes, warningMinutes, maxSessionMinutes].every((value) => Number.isFinite(value))) {
    return { error: 'Please enter numeric values for all timeout fields.' }
  }

  if (inactivityMinutes <= 1 || warningMinutes <= 1 || maxSessionMinutes <= 1) {
    return { error: 'All timeout values must be greater than 1 minute.' }
  }

  if (warningMinutes >= inactivityMinutes) {
    return { error: 'Warning timeout must be less than inactivity timeout.' }
  }

  if (maxSessionMinutes < inactivityMinutes) {
    return { error: 'Max session duration must be greater than or equal to inactivity timeout.' }
  }

  if (inactivityMinutes > 1440 || warningMinutes > 1440 || maxSessionMinutes > 1440) {
    return { error: 'Timeout values above 1440 minutes (24h) are not allowed.' }
  }

  return {
    value: {
      inactivityTimeout: minutesToMs(inactivityMinutes),
      warningTimeout: minutesToMs(warningMinutes),
      maxSessionTimeout: minutesToMs(maxSessionMinutes),
    },
  }
}

export default function AdminDashboard() {
  const { user, logout, refreshSessionSettings } = useAuth()
  const sessionTimer = useSessionTimer()
  const [users, setUsers] = useState([])
  const [resources, setResources] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [resetModal, setResetModal] = useState(null)
  const [pendingCredentials, setPendingCredentials] = useState(null)
  const [deleteModalTarget, setDeleteModalTarget] = useState(null)
  const [statusModalTarget, setStatusModalTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [resourceClassFilter, setResourceClassFilter] = useState('All Classes')
  const [resourceSubjectFilter, setResourceSubjectFilter] = useState('All Subjects')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const [sessionTimeoutForm, setSessionTimeoutForm] = useState(buildTimeoutForm(SESSION_SETTINGS_DEFAULTS))
  const [savedSessionTimeouts, setSavedSessionTimeouts] = useState(SESSION_SETTINGS_DEFAULTS)
  const [sessionTimeoutsLoading, setSessionTimeoutsLoading] = useState(false)
  const [sessionTimeoutsSaving, setSessionTimeoutsSaving] = useState(false)
  const [sessionTimeoutError, setSessionTimeoutError] = useState('')
  const [saveTimeoutConfirmOpen, setSaveTimeoutConfirmOpen] = useState(false)
  const [resetTimeoutConfirmOpen, setResetTimeoutConfirmOpen] = useState(false)
  const [exportVerifyOpen, setExportVerifyOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportVerifyError, setExportVerifyError] = useState('')
  const [isExportVerifying, setIsExportVerifying] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 })
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditStatusFilter, setAuditStatusFilter] = useState('')
  const [auditFromDate, setAuditFromDate] = useState('')
  const [auditToDate, setAuditToDate] = useState('')
  const [userBulkLoading, setUserBulkLoading] = useState(false)
  const notificationsPanelRef = useRef(null)
  const isProtectedAuditAdmin = isProtectedAdminEmail(user?.email)
  const filteredUsers = users.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.displayName, entry.email, entry.loginId, entry.role, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)
    const matchesRole = userRoleFilter === 'all' || entry.role === userRoleFilter
    return matchesSearch && matchesRole
  })
  const userSelection = useBulkSelection(filteredUsers.map((u) => u.id))
  const { clearAll: clearUserSelection } = userSelection

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    // Clear bulk selection when search term or role filter changes
    clearUserSelection()
  }, [searchTerm, userRoleFilter, clearUserSelection])

  const loadOverview = async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load the admin overview.')
      }

      setUsers(Array.isArray(payload?.users) ? payload.users : [])
      setResources(Array.isArray(payload?.resources) ? payload.resources : [])
      setErrorMessage(payload?.warning ? String(payload.warning) : '')
    } catch (error) {
      console.error('Admin overview error:', error)
      setErrorMessage(error.message || 'Could not load the admin overview.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadRequests = async ({ background = false } = {}) => {
    if (!background) {
      setRefreshing(true)
    }

    try {
      const response = await fetch('/api/admin/resource-requests', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load the resource requests.')
      }

      setRequests(Array.isArray(payload?.requests) ? payload.requests : [])
      setErrorMessage('')
    } catch (error) {
      console.error('Admin requests error:', error)
      setErrorMessage(error.message || 'Could not load the resource requests.')
    } finally {
      if (!background) {
        setRefreshing(false)
      }
    }
  }

  const loadNotifications = async () => {
    setNotificationsLoading(true)

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load notifications.')
      }

      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setNotificationsError('')
    } catch (error) {
      console.error('Admin notifications error:', error)
      setNotifications([])
      setNotificationsError(error.message || 'Could not load notifications.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  const loadSessionTimeoutSettings = async () => {
    setSessionTimeoutsLoading(true)
    try {
      const response = await fetch('/api/admin/session-settings', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load session timeout settings.')
      }

      const settings = payload?.settings || SESSION_SETTINGS_DEFAULTS
      setSavedSessionTimeouts(settings)
      setSessionTimeoutForm(buildTimeoutForm(settings))
      setSessionTimeoutError('')
    } catch (error) {
      setSessionTimeoutError(error.message || 'Could not load session timeout settings.')
    } finally {
      setSessionTimeoutsLoading(false)
    }
  }

  const loadAuditLogs = useCallback(async ({ nextPage = auditPage } = {}) => {
    if (!isProtectedAuditAdmin) {
      setAuditLogs([])
      setAuditError('')
      return
    }

    setAuditLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '20',
      })

      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      if (auditActionFilter) params.set('action', auditActionFilter)
      if (auditStatusFilter) params.set('status', auditStatusFilter)
      if (auditFromDate) params.set('fromDate', auditFromDate)
      if (auditToDate) params.set('toDate', auditToDate)

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load audit logs.')
      }

      setAuditLogs(Array.isArray(payload?.logs) ? payload.logs : [])
      setAuditPagination(payload?.pagination || { page: 1, limit: 20, total: 0, pages: 1 })
      setAuditError('')
    } catch (error) {
      setAuditLogs([])
      setAuditError(error.message || 'Could not load audit logs.')
    } finally {
      setAuditLoading(false)
    }
  }, [auditActionFilter, auditFromDate, auditPage, auditStatusFilter, auditToDate, isProtectedAuditAdmin, searchTerm])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadOverview()
    loadRequests()
    loadNotifications()
    if (isSuperAdmin(user)) {
      loadSessionTimeoutSettings()
    }
  }, [user, user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadAuditLogs({ nextPage: auditPage })
  }, [auditPage, loadAuditLogs, user?.uid])

  const parsedTimeoutForm = useMemo(() => parseTimeoutForm(sessionTimeoutForm), [sessionTimeoutForm])
  const sessionTimeoutHasChanges = useMemo(() => {
    if (!parsedTimeoutForm.value) {
      return false
    }

    return (
      parsedTimeoutForm.value.inactivityTimeout !== savedSessionTimeouts.inactivityTimeout ||
      parsedTimeoutForm.value.warningTimeout !== savedSessionTimeouts.warningTimeout ||
      parsedTimeoutForm.value.maxSessionTimeout !== savedSessionTimeouts.maxSessionTimeout
    )
  }, [parsedTimeoutForm.value, savedSessionTimeouts])

  const showAggressiveTimeoutWarning = useMemo(() => {
    if (!parsedTimeoutForm.value) {
      return false
    }
    return parsedTimeoutForm.value.inactivityTimeout <= 2 * 60 * 1000
  }, [parsedTimeoutForm.value])

  const saveSessionTimeoutSettings = async () => {
    if (!parsedTimeoutForm.value) {
      setSessionTimeoutError(parsedTimeoutForm.error || 'Please fix validation errors before saving.')
      return
    }

    setSessionTimeoutsSaving(true)
    try {
      const response = await fetch('/api/admin/session-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedTimeoutForm.value),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save session timeout settings.')
      }

      const settings = payload?.settings || parsedTimeoutForm.value
      setSavedSessionTimeouts(settings)
      setSessionTimeoutForm(buildTimeoutForm(settings))
      setSessionTimeoutError('')
      await refreshSessionSettings()
      toast.success('Session timeout settings saved.')
    } catch (error) {
      setSessionTimeoutError(error.message || 'Could not save session timeout settings.')
      toast.error(error.message || 'Could not save session timeout settings.')
    } finally {
      setSessionTimeoutsSaving(false)
    }
  }

  const resetSessionTimeoutFormToDefaults = () => {
    setSessionTimeoutForm(buildTimeoutForm(SESSION_SETTINGS_DEFAULTS))
    setSessionTimeoutError('')
  }

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationsOpen) {
        return
      }

      if (notificationsPanelRef.current && !notificationsPanelRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [notificationsOpen])

  const resourceClassOptions = useMemo(
    () => ['All Classes', ...new Set(resources.map((entry) => entry.class).filter(Boolean))],
    [resources]
  )

  const resourceSubjectOptions = useMemo(
    () => ['All Subjects', ...new Set(resources.map((entry) => entry.subject).filter(Boolean))],
    [resources]
  )

  const filteredResources = resources.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.title, entry.class, entry.subject, entry.summary, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesClass =
      resourceClassFilter === 'All Classes' || !resourceClassFilter || entry.class === resourceClassFilter
    const matchesSubject =
      resourceSubjectFilter === 'All Subjects' || !resourceSubjectFilter || entry.subject === resourceSubjectFilter

    return matchesSearch && matchesClass && matchesSubject
  })

  const filteredRequests = requests.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.studentName, entry.studentEmail, entry.courseName, entry.titleName, entry.preferredFormat, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesStatus = requestStatusFilter === 'all' || entry.status === requestStatusFilter
    return matchesSearch && matchesStatus
  })

  const activeStudents = users.filter((entry) => entry.role === 'student' && entry.status === 'active').length
  const facultyCount = users.filter((entry) => entry.role === 'faculty').length
  const openRequests = requests.filter((entry) => entry.status !== 'done').length
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length

  const downloadCsvFromApi = async (verificationToken = null) => {
    setIsExportingCsv(true)
    try {
      const response = await fetch('/api/admin/users/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken,
          searchTerm,
          roleFilter: userRoleFilter,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Could not export CSV.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'sps-educationam-access-control.csv'
      link.click()
      URL.revokeObjectURL(url)
      toast.success('CSV export downloaded successfully.')
    } catch (error) {
      toast.error(error.message || 'Could not export CSV.')
    } finally {
      setIsExportingCsv(false)
    }
  }

  const exportUsers = async () => {
    if (!user?.email) {
      toast.error('You must be signed in as admin to export users.')
      return
    }

    if (requiresProtectedAdminPasswordForExport(user.email)) {
      setExportPassword('')
      setExportVerifyError('')
      setExportVerifyOpen(true)
      return
    }

    await downloadCsvFromApi(null)
  }

  const confirmExportVerification = async () => {
    setIsExportVerifying(true)
    setExportVerifyError('')

    try {
      const response = await fetch('/api/admin/verify-export-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: exportPassword }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Incorrect admin password')
      }

      const token = payload?.verificationToken
      if (!token) {
        throw new Error('Verification token not issued. Please retry.')
      }

      setExportVerifyOpen(false)
      setExportPassword('')
      await downloadCsvFromApi(token)
    } catch (error) {
      setExportVerifyError(error.message || 'Incorrect admin password')
    } finally {
      setIsExportVerifying(false)
    }
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setSubmittingCreate(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not create the requested account.')
      }

      setPendingCredentials(
        payload?.credentials
          ? {
              ...payload.credentials,
              role: payload?.user?.role || createForm.role,
              email: payload?.user?.email || createForm.email,
            }
          : null
      )
      setCreateForm(EMPTY_CREATE_FORM)
      setCreateOpen(false)
      toast.success('Account created successfully.')
      await loadOverview({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not create the requested account.')
    } finally {
      setSubmittingCreate(false)
    }
  }

  const confirmHardDelete = async () => {
    if (!deleteModalTarget) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${deleteModalTarget.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not permanently delete the account.')
      }

      setUsers((current) => current.filter((item) => item.id !== deleteModalTarget.id))
      toast.success('Account permanently removed.')
      setDeleteModalTarget(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete the user account.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUserStatusChange = async (targetUser, nextStatus) => {
    if (!targetUser) {
      return
    }

    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-status',
          status: nextStatus,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update account status.')
      }

      setUsers((current) => current.map((entry) => (entry.id === targetUser.id ? payload.user : entry)))
      setStatusModalTarget(null)
      toast.success(`User ${nextStatus === 'active' ? 'enabled' : 'disabled'} successfully.`)
    } catch (error) {
      toast.error(error.message || 'Could not update account status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleResetCredentials = async (targetUser, forcedPassword = null) => {
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetCredentials',
          password: forcedPassword || undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not reset the credentials.')
      }

      setPendingCredentials({
        ...payload.credentials,
        role: targetUser.role,
        email: targetUser.email,
      })

      setResetModal(null)
      toast.success(forcedPassword ? 'Password updated successfully.' : 'Temporary credentials generated.')
      await loadOverview({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not reset the credentials.')
      if (resetModal) {
        setResetModal((prev) => ({ ...prev, submitting: false }))
      }
    }
  }

  const handleRequestStatusChange = async (requestEntry, status) => {
    try {
      const response = await fetch(`/api/admin/resource-requests/${requestEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the request status.')
      }

      setRequests((current) => current.map((entry) => (entry.id === requestEntry.id ? payload.request : entry)))
      toast.success(`Request moved to ${requestStatusLabel(status).toLowerCase()}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the request status.')
    }
  }

  const markNotificationRead = async (notificationId) => {
    setNotificationsSaving(true)

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update notifications.')
      }

      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
    } catch (error) {
      toast.error(error.message || 'Could not update notifications.')
    } finally {
      setNotificationsSaving(false)
    }
  }

  const readAllNotifications = async () => {
    setNotificationsSaving(true)

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not clear notifications.')
      }

      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      toast.success('All notifications marked as read.')
    } catch (error) {
      toast.error(error.message || 'Could not clear notifications.')
    } finally {
      setNotificationsSaving(false)
    }
  }

  const handleBulkDeleteUsers = async () => {
    setUserBulkLoading(true)
    try {
      const result = await performBulkDelete(userSelection.getSelectedArray(), 'user')
      
      if (result.deleted.length > 0) {
        setUsers((current) => current.filter((u) => !result.deleted.includes(u.id)))
        userSelection.deselectItems(result.deleted)
      }
      
      if (result.failed.length > 0) {
        toast.error(`Failed to delete ${result.failed.length} user(s). Check the admin logs.`)
      } else if (result.skipped.length > 0) {
        toast.warning(`${result.skipped.length} user(s) were protected and could not be deleted.`)
      }
    } catch (error) {
      toast.error(error.message || 'Bulk delete failed.')
    } finally {
      setUserBulkLoading(false)
    }
  }

  const handleBulkExportUsers = async () => {
    setUserBulkLoading(true)
    try {
      await performBulkExport(userSelection.getSelectedArray(), 'user')
    } catch (error) {
      toast.error(error.message || 'Bulk export failed.')
    } finally {
      setUserBulkLoading(false)
    }
  }

  if (loading) {
    return <AdminDashboardSkeleton />
  }

  return (
    <div className="student-panel">
      <DashboardSidebar
        role="admin"
        title="Admin Center"
        subtitle="Access Control"
        navItems={[
          { id: 'overview', label: 'Dashboard', href: '#admin-overview', icon: LayoutPanelTop },
          ...(isSuperAdmin(user) ? [{ id: 'security', label: 'Security', href: '#admin-security', icon: Shield }] : []),
          { id: 'users', label: 'Users', href: '#admin-users', icon: Users },
          { id: 'resources', label: 'Resources', href: '#admin-resources', icon: FileText },
          { id: 'requests', label: 'Requests', href: '#admin-requests', icon: Library },
          ...(isProtectedAuditAdmin ? [{ id: 'activity', label: 'Audit Logs', href: '#admin-activity', icon: Shield }] : []),
          ...(isSuperAdmin(user) ? [{ id: 'blocking', label: 'IP/User Blocking', href: '#admin-blocking', icon: ShieldAlert }] : []),
          ...(isSuperAdmin(user) ? [{ id: 'suspicious', label: 'Suspicious Activity', href: '#admin-suspicious', icon: ShieldAlert }] : []),
          ...(isSuperAdmin(user) ? [{ id: 'timeline', label: 'Activity Timeline', href: '#admin-timeline', icon: FileText }] : []),
            ...(isSuperAdmin(user) ? [{ id: 'export', label: 'Export Reports', href: '#admin-export', icon: Download }, { id: 'backup', label: 'Backup', href: '#admin-backup', icon: HardDrive }] : []),
          ]}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={logout}
      />

      <div className="student-panel__main">
        <DashboardTopbar
          role="admin"
          title="Admin Dashboard"
          subtitle="Manage users, publications, and requests"
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onOpenMenu={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen((prev) => !prev)}
          unreadCount={unreadNotificationCount}
          sessionIndicator={
            sessionTimer.isVisible ? (
              <div
                className={`session-indicator ${sessionTimer.isWarning ? 'session-indicator--warning' : ''}`}
                role="status"
                aria-live="polite"
              >
                <span>Session {sessionTimer.formatted}</span>
                <Button type="button" variant="ghost" onClick={sessionTimer.onExtendSession}>
                  Extend
                </Button>
              </div>
            ) : null
          }
          userLabel={getDisplayName(user?.email, 'Admin')}
        />

        <main className="student-panel__content">
          {notificationsOpen ? (
            <div className="student-notification-panel-wrap" ref={notificationsPanelRef}>
              <Card className="student-notification-panel" role="dialog" aria-label="Notifications center">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>{unreadNotificationCount} unread update(s)</CardDescription>
                </CardHeader>
                <CardContent className="student-notification-list">
                  {notificationsError ? (
                    <div className="student-inline-message student-inline-message--error">
                      <HelpCircle size={16} />
                      <span>{notificationsError}</span>
                    </div>
                  ) : null}
                  {notificationsLoading ? <p>Fetching updates...</p> : null}
                  {!notificationsLoading && notifications.length === 0 ? <p>No notifications available.</p> : null}
                  {!notificationsLoading && notifications.length > 0
                    ? notifications.slice(0, 5).map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          className="student-notification-item"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          <div>
                            <strong>{notification.resourceTitle || notification.message || 'Update'}</strong>
                            <p>{notification.message || 'A new dashboard update is available.'}</p>
                            <span>{formatRelativeUpdate(notification.createdAt)}</span>
                          </div>
                          {!notification.readAt ? <Badge>New</Badge> : <Badge variant="outline">Read</Badge>}
                        </button>
                      ))
                    : null}
                  <div className="student-notification-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={readAllNotifications}
                      disabled={notificationsSaving || unreadNotificationCount === 0}
                    >
                      <CheckCircle2 size={14} />
                      Mark all as read
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setNotificationsOpen(false)}>
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="student-inline-message student-inline-message--error" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <section id="admin-overview" className="student-section" aria-label="Admin overview">
            <div className="student-section__heading">
              <h2>Overview</h2>
              <p>Unified governance across users, content, and requests.</p>
              <p className="student-muted-text">{refreshing ? 'Refreshing live data...' : 'Data synced from protected APIs.'}</p>
            </div>
            <div className="student-metrics">
              <Card>
                <CardHeader>
                  <CardDescription>Total Accounts</CardDescription>
                  <CardTitle>{users.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Active Students</CardDescription>
                  <CardTitle>{activeStudents}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Faculty Accounts</CardDescription>
                  <CardTitle>{facultyCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Open Requests</CardDescription>
                  <CardTitle>{openRequests}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          {isSuperAdmin(user) ? (
          <section id="admin-security" className="student-section" aria-label="Session security settings">
            <div className="student-section__heading">
              <h2>Session Control</h2>
              <p>Configure inactivity logout, warning timing, and max session duration globally.</p>
            </div>

              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Changes sync globally and are applied to active users on the next settings refresh cycle.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="student-request-form"
                    style={{
                      gap: '1rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    }}
                  >
                  <label>
                    <span>Inactivity Timeout (minutes)</span>
                    <Input
                      type="number"
                      min="2"
                      step="1"
                      value={sessionTimeoutForm.inactivityMinutes}
                      onChange={(event) =>
                        setSessionTimeoutForm((current) => ({
                          ...current,
                          inactivityMinutes: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Warning Time Before Logout (minutes)</span>
                    <Input
                      type="number"
                      min="2"
                      step="1"
                      value={sessionTimeoutForm.warningMinutes}
                      onChange={(event) =>
                        setSessionTimeoutForm((current) => ({
                          ...current,
                          warningMinutes: event.target.value,
                        }))
                      }
                    />
                    <small className="student-muted-text" style={{ display: 'block', marginTop: '0.35rem' }}>
                      Default 4 means warning appears at minute 4 of inactivity when timeout is 5.
                    </small>
                  </label>
                  <label>
                    <span>Max Session Duration (minutes)</span>
                    <Input
                      type="number"
                      min="2"
                      step="1"
                      value={sessionTimeoutForm.maxSessionMinutes}
                      onChange={(event) =>
                        setSessionTimeoutForm((current) => ({
                          ...current,
                          maxSessionMinutes: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                {parsedTimeoutForm.error ? (
                  <div className="student-inline-message student-inline-message--error" style={{ marginTop: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{parsedTimeoutForm.error}</span>
                  </div>
                ) : null}

                {sessionTimeoutError ? (
                  <div className="student-inline-message student-inline-message--error" style={{ marginTop: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{sessionTimeoutError}</span>
                  </div>
                ) : null}

                {showAggressiveTimeoutWarning ? (
                  <div className="student-inline-message" style={{ marginTop: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>Very low inactivity timeout may log out users during normal reading workflows.</span>
                  </div>
                ) : null}

                <div className="student-filter-actions" style={{ marginTop: '1rem' }}>
                  <Button
                    type="button"
                    onClick={() => setSaveTimeoutConfirmOpen(true)}
                    disabled={!sessionTimeoutHasChanges || Boolean(parsedTimeoutForm.error) || sessionTimeoutsSaving || sessionTimeoutsLoading}
                  >
                    {sessionTimeoutsSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sessionTimeoutsSaving || sessionTimeoutsLoading}
                    onClick={() => setResetTimeoutConfirmOpen(true)}
                  >
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div style={{ marginTop: '1rem' }}>
              <SecurityAdvancedSettings />
            </div>
          </section>
          ) : null}

          {isSuperAdmin(user) ? (
            <DashboardScrollableSection
              id="admin-blocking"
              ariaLabel="IP and user blocking"
              title="IP Management"
              description="Block malicious IPs and disable or re-enable user accounts from one place."
            >
              <SecurityBlockManagement users={users} onChanged={() => loadOverview({ background: true })} />
            </DashboardScrollableSection>
          ) : null}

          {pendingCredentials ? (
            <section className="student-section" aria-label="One-time credentials">
              <Card>
                <CardHeader>
                  <CardTitle>One-Time Credentials</CardTitle>
                  <CardDescription>Copy and share securely. This view appears once per admin session.</CardDescription>
                </CardHeader>
                <CardContent className="student-download-list">
                  <div className="student-download-item"><strong>Role</strong><p>{pendingCredentials.role}</p></div>
                  <div className="student-download-item"><strong>Email</strong><p>{pendingCredentials.email}</p></div>
                  {pendingCredentials.loginId ? <div className="student-download-item"><strong>Login ID</strong><p>{pendingCredentials.loginId}</p></div> : null}
                  {pendingCredentials.temporaryPassword ? <div className="student-download-item"><strong>Temporary Password</strong><p>{pendingCredentials.temporaryPassword}</p></div> : null}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <DashboardScrollableSection
            id="admin-users"
            ariaLabel="User management"
            title="User Management"
            description="Create, review, and remove accounts with role-aware controls."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search users by name, email, role"
                    aria-label="Search users"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Role</span>
                  <select className="ui-input" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <div className="student-filter-actions">
                  <Button type="button" variant="outline" onClick={() => setSearchTerm(searchInput.trim())}>
                    <Users size={14} />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setUserRoleFilter('all')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button 
                    type="button" 
                    variant={userSelection.isSomeSelected ? 'secondary' : 'outline'}
                    onClick={userSelection.toggleAll}
                    disabled={filteredUsers.length === 0}
                  >
                    <CheckCircle2 size={14} />
                    {userSelection.isAllSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                  {userSelection.selectedCount > 0 && (
                    <span style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', borderRadius: '0.375rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', fontSize: '0.875rem' }}>
                      {userSelection.selectedCount} selected
                    </span>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={exportUsers} disabled={isExportingCsv || isExportVerifying}><Download size={14} />{isExportingCsv ? 'Exporting...' : 'Export CSV'}</Button>
                <Button type="button" onClick={() => setCreateOpen(true)}><Sparkles size={14} />Create Account</Button>
              </CardContent>
            </Card>
            {filteredUsers.length === 0 ? (
              <Card className="student-empty-state"><CardContent><Inbox size={32} /><h3>No users found</h3><p>Adjust search or role filters.</p></CardContent></Card>
            ) : (
              <div className="student-resource-grid">
                {filteredUsers.map((entry) => {
                  const actionPolicy = getUserManagementActionPolicy(user, entry)

                  return (
                  <SelectableCard 
                    key={entry.id}
                    id={entry.id}
                    isSelected={userSelection.isSelected(entry.id)}
                    onToggle={() => userSelection.toggleItem(entry.id)}
                  >
                    <Card className={`student-resource-card ${entry.isBlocked ? 'student-resource-card--blocked' : ''}`}>
                      <CardHeader className="student-resource-card__header">
                        <div className="student-resource-card__meta">
                          <RoleAvatar role={entry.role} size="sm" label={`${entry.role} icon`} />
                          <Badge>{entry.role}</Badge>
                          <Badge
                            variant={entry.isBlocked ? 'destructive' : entry.status === 'disabled' ? 'outline' : 'secondary'}
                          >
                            {entry.isBlocked ? 'Blocked' : entry.status === 'disabled' ? 'Disabled' : 'Enabled'}
                          </Badge>
                          {entry.isBlocked && entry.blockedExpiresAt ? (
                            <Badge variant="outline">Expires {formatDisplayDate(entry.blockedExpiresAt)}</Badge>
                          ) : null}
                        </div>
                        <Badge variant="outline">{authProviderLabel(entry)}</Badge>
                      </CardHeader>
                      <CardContent>
                        <CardTitle className="student-resource-card__title">{entry.displayName || getDisplayName(entry.email, 'User')}</CardTitle>
                        <p className="student-resource-card__summary">{entry.email}</p>
                      <p className="student-resource-card__updated">{entry.loginId ? `Login ID: ${entry.loginId}` : 'Google-only identity'}</p>
                    </CardContent>
                    <CardContent style={{ paddingTop: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {actionPolicy.showMenu ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" aria-label={`Open actions for ${entry.displayName || entry.email}`}>
                              <MoreVertical size={14} />
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4} className="z-50 user-actions-menu">
                            {actionPolicy.allowResetPassword ? (
                              <DropdownMenuItem
                                className="user-actions-menu__item"
                                onSelect={() => setResetModal({ user: entry, password: '', submitting: false })}
                              >
                                <KeyRound size={14} />
                                Reset Password
                              </DropdownMenuItem>
                            ) : null}

                            {actionPolicy.allowSensitiveActions ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="user-actions-menu__item"
                                  onSelect={() => {
                                    const nextStatus = entry.status === 'disabled' ? 'active' : 'disabled'
                                    if (nextStatus === 'disabled') {
                                      setStatusModalTarget({ user: entry, nextStatus })
                                      return
                                    }
                                    handleUserStatusChange(entry, nextStatus)
                                  }}
                                >
                                  {entry.status === 'disabled' ? <UserCheck size={14} /> : <UserX size={14} />}
                                  {entry.status === 'disabled' ? 'Enable User' : 'Disable User'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="user-actions-menu__item"
                                  onSelect={() => {
                                    setDeleteModalTarget(entry)
                                  }}
                                >
                                  <Trash2 size={14} />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="student-muted-text" title="This user cannot be modified.">Protected user</span>
                      )}
                    </CardContent>
                  </Card>
                  </SelectableCard>
                  )
                })}
              </div>
            )}
            <BulkActionBar 
              selectedCount={userSelection.selectedCount}
              itemType="user"
              onDelete={handleBulkDeleteUsers}
              onExport={handleBulkExportUsers}
              onClear={userSelection.clearAll}
              isLoading={userBulkLoading}
            />
          </DashboardScrollableSection>

          <DashboardScrollableSection
            id="admin-resources"
            ariaLabel="Resource audit"
            title="Resources & Publications"
            description="Audit platform publications with class and subject filters."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search resources"
                    aria-label="Search resources"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Class</span>
                  <select className="ui-input" value={resourceClassFilter} onChange={(event) => setResourceClassFilter(event.target.value)}>
                    {resourceClassOptions.map((entryClass) => (
                      <option key={entryClass} value={entryClass}>{entryClass}</option>
                    ))}
                  </select>
                </label>
                <label className="student-filter-control">
                  <span>Subject</span>
                  <select className="ui-input" value={resourceSubjectFilter} onChange={(event) => setResourceSubjectFilter(event.target.value)}>
                    {resourceSubjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </label>
                <div className="student-filter-actions">
                  <Button type="button" variant="outline" onClick={() => setSearchTerm(searchInput.trim())}>
                    <FileText size={14} />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setResourceClassFilter('All Classes')
                      setResourceSubjectFilter('All Subjects')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
                <Badge variant="outline" className="student-filter-count">{filteredResources.length} result(s)</Badge>
              </CardContent>
            </Card>
            {filteredResources.length === 0 ? (
              <Card className="student-empty-state"><CardContent><Inbox size={32} /><h3>No resources found</h3><p>Adjust search, class, or subject filters.</p></CardContent></Card>
            ) : (
              <div className="student-resource-grid">
                {filteredResources.map((entry) => (
                  <Card key={entry.id} className="student-resource-card">
                    <CardHeader className="student-resource-card__header">
                      <div className="student-resource-card__meta">
                        <Badge>{entry.subject || 'General'}</Badge>
                        <Badge variant="outline">{entry.class || 'Unassigned class'}</Badge>
                      </div>
                      <Badge variant={entry.status === 'live' ? 'secondary' : 'outline'}>{entry.status || 'unknown'}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="student-resource-card__title">{entry.title}</CardTitle>
                      <p className="student-resource-card__summary">{entry.summary || 'No summary provided.'}</p>
                      <p className="student-resource-card__updated">{formatDisplayDate(entry.createdAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DashboardScrollableSection>

          <DashboardScrollableSection
            id="admin-requests"
            ariaLabel="Resource requests"
            title="Resource Requests"
            description="Track student requests and update statuses with one click."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search requests"
                    aria-label="Search requests"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Status</span>
                  <select className="ui-input" value={requestStatusFilter} onChange={(event) => setRequestStatusFilter(event.target.value)}>
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="underreview">Under Review</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <div className="student-filter-actions">
                  <Button type="button" variant="outline" onClick={() => setSearchTerm(searchInput.trim())}>
                    <Library size={14} />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setRequestStatusFilter('all')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
                <Badge variant="outline" className="student-filter-count">{filteredRequests.length} result(s)</Badge>
              </CardContent>
            </Card>
            {filteredRequests.length === 0 ? (
              <Card className="student-empty-state"><CardContent><Inbox size={32} /><h3>No requests found</h3><p>Try a different search term or status filter.</p></CardContent></Card>
            ) : (
              <div className="student-resource-grid">
                {filteredRequests.map((entry) => (
                  <Card key={entry.id} className="student-resource-card">
                    <CardHeader className="student-resource-card__header">
                      <div className="student-resource-card__meta">
                        <Badge>{entry.courseName || 'No course'}</Badge>
                        <Badge variant="outline">{entry.preferredFormat || 'Any format'}</Badge>
                      </div>
                      <Badge variant={entry.status === 'done' ? 'secondary' : 'outline'}>{requestStatusLabel(entry.status)}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="student-resource-card__title">{entry.titleName || 'Untitled request'}</CardTitle>
                      <p className="student-resource-card__summary">{entry.studentName || entry.studentEmail}</p>
                      <p className="student-resource-card__updated">{formatDisplayDate(entry.createdAt)}</p>
                    </CardContent>
                    <CardContent style={{ paddingTop: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button type="button" variant="outline" onClick={() => handleRequestStatusChange(entry, 'pending')} disabled={entry.status === 'pending'}>Pending</Button>
                      <Button type="button" variant="outline" onClick={() => handleRequestStatusChange(entry, 'underreview')} disabled={entry.status === 'underreview'}>Review</Button>
                      <Button type="button" variant="outline" onClick={() => handleRequestStatusChange(entry, 'done')} disabled={entry.status === 'done'}>Done</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DashboardScrollableSection>

          {isProtectedAuditAdmin ? (
            <DashboardScrollableSection
              id="admin-activity"
              ariaLabel="Audit log"
              title="Audit Logs"
              description="Track who did what, when, where, and from which device."
            >
              <Card className="student-filter-card">
                <CardContent className="student-filter-card__content">
                  <label className="student-filter-control student-filter-control--search">
                    <span>Search</span>
                    <Input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search user, action, module"
                      aria-label="Search audit logs"
                    />
                  </label>
                  <label className="student-filter-control">
                    <span>Action</span>
                    <Input value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)} placeholder="e.g. LOGIN" />
                  </label>
                  <label className="student-filter-control">
                    <span>Status</span>
                    <select className="ui-input" value={auditStatusFilter} onChange={(event) => setAuditStatusFilter(event.target.value)}>
                      <option value="">All</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </label>
                  <label className="student-filter-control">
                    <span>From</span>
                    <Input type="date" value={auditFromDate} onChange={(event) => setAuditFromDate(event.target.value)} />
                  </label>
                  <label className="student-filter-control">
                    <span>To</span>
                    <Input type="date" value={auditToDate} onChange={(event) => setAuditToDate(event.target.value)} />
                  </label>
                  <div className="student-filter-actions">
                    <Button type="button" variant="outline" onClick={() => setAuditPage(1)}>Apply</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAuditActionFilter('')
                        setAuditStatusFilter('')
                        setAuditFromDate('')
                        setAuditToDate('')
                        setSearchInput('')
                        setSearchTerm('')
                        setAuditPage(1)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  {auditError ? (
                    <div className="student-inline-message student-inline-message--error" role="alert">
                      <AlertCircle size={16} />
                      <span>{auditError}</span>
                    </div>
                  ) : null}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Device</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!auditLoading && auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>No audit logs found for current filters.</TableCell>
                        </TableRow>
                      ) : null}

                      {auditLoading ? (
                        <TableRow>
                          <TableCell colSpan={7}>Loading audit logs...</TableCell>
                        </TableRow>
                      ) : null}

                      {!auditLoading
                        ? auditLogs.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <strong>{entry.userName || entry.userEmail || 'Unknown user'}</strong>
                                <p className="student-muted-text">{entry.userEmail || 'No email'}</p>
                              </TableCell>
                              <TableCell>
                                <strong>{entry.action}</strong>
                                <p className="student-muted-text">{entry.description || '-'}</p>
                              </TableCell>
                              <TableCell>{entry.module || 'General'}</TableCell>
                              <TableCell>
                                <Badge variant={entry.status === 'FAILED' ? 'outline' : 'secondary'}>
                                  {entry.status || 'SUCCESS'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDisplayDate(entry.timestamp || entry.createdAt, 'N/A')}</TableCell>
                              <TableCell>{entry.location || 'Unknown'}</TableCell>
                              <TableCell>
                                {entry.device?.browser || 'Unknown'} / {entry.device?.os || 'Unknown'} / {entry.device?.deviceType || 'desktop'}
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                    </TableBody>
                  </Table>

                  <div className="student-filter-actions" style={{ marginTop: '1rem' }}>
                    <Button type="button" variant="outline" disabled={auditPagination.page <= 1 || auditLoading} onClick={() => setAuditPage((current) => Math.max(1, current - 1))}>
                      Previous
                    </Button>
                    <Badge variant="outline">
                      Page {auditPagination.page} of {auditPagination.pages} ({auditPagination.total} logs)
                    </Badge>
                    <Button type="button" variant="outline" disabled={auditPagination.page >= auditPagination.pages || auditLoading} onClick={() => setAuditPage((current) => Math.min(auditPagination.pages, current + 1))}>
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </DashboardScrollableSection>
          ) : null}

          {isSuperAdmin(user) ? (
            <DashboardScrollableSection
              id="admin-suspicious"
              ariaLabel="Suspicious activity monitoring"
              title="Suspicious Activity"
              description="Monitor abnormal sign-ins, unauthorized attempts, unusual locations, and spam-like behavior."
            >
              <SuspiciousActivityPanel />
            </DashboardScrollableSection>
          ) : null}

          {isSuperAdmin(user) ? (
            <DashboardScrollableSection
              id="admin-timeline"
              ariaLabel="Activity timeline"
              title="Activity Timeline"
              description="User activity tracking including logins, resource operations, and user management."
            >
              <ActivityTimeline />
            </DashboardScrollableSection>
          ) : null}

            {isSuperAdmin(user) ? (
              <section id="admin-export" className="student-section" aria-label="Export reports">
                <div className="student-section__heading">
                  <h2>Export Reports</h2>
                  <p>Download users, logs, or analytics in CSV or PDF format</p>
                </div>
                <ExportReportsSection />
              </section>
            ) : null}

            {isSuperAdmin(user) ? (
              <section id="admin-backup" className="student-section" aria-label="Backup system">
                <div className="student-section__heading">
                  <h2>Backup System</h2>
                  <p>Backup users and resources data</p>
                </div>
                <BackupSystemSection />
              </section>
            ) : null}
        </main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen} labelledBy="admin-create-account-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="admin-create-account-title">Create Account</DialogTitle>
          <DialogDescription>
            Provision Google-only students or admin-issued credentials for faculty/admin roles.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className="student-request-form" onSubmit={handleCreateUser}>
            <label>
              <span>Role</span>
              <select
                className="ui-input"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
                <option value="student">Student</option>
              </select>
            </label>
            <label>
              <span>Display name</span>
              <Input
                type="text"
                value={createForm.displayName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Email</span>
              <Input
                type="email"
                required
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <div className="student-inline-message">
              <KeyRound size={16} />
              <span>Staff accounts receive temporary credentials. Students use Google OAuth.</span>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateUser} disabled={submittingCreate}>
            {submittingCreate ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={Boolean(resetModal)} onOpenChange={(open) => !open && setResetModal(null)} labelledBy="admin-reset-password-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="admin-reset-password-title">Reset User Password</DialogTitle>
          <DialogDescription>
            Set a manual password or leave empty for a generated secure password.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form
            className="student-request-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!resetModal) {
                return
              }
              setResetModal((prev) => ({ ...prev, submitting: true }))
              handleResetCredentials(resetModal.user, resetModal.password.trim() || null)
            }}
          >
            <label>
              <span>Manual password (optional)</span>
              <Input
                type="text"
                autoComplete="off"
                value={resetModal?.password || ''}
                onChange={(event) => setResetModal((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Leave blank to auto-generate"
              />
            </label>
            <div className="student-inline-message">
              <Shield size={16} />
              <span>Credentials are generated instantly and shown in this admin session.</span>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={resetModal?.submitting} onClick={() => setResetModal(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={resetModal?.submitting}
            onClick={() => {
              if (!resetModal) {
                return
              }
              setResetModal((prev) => ({ ...prev, submitting: true }))
              handleResetCredentials(resetModal.user, resetModal.password.trim() || null)
            }}
          >
            {resetModal?.submitting ? 'Processing...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={exportVerifyOpen}
        onOpenChange={(open) => {
          setExportVerifyOpen(open)
          if (!open) {
            setExportPassword('')
            setExportVerifyError('')
          }
        }}
        labelledBy="admin-export-verify-title"
        className="student-request-modal"
      >
        <DialogHeader>
          <DialogTitle id="admin-export-verify-title">Admin Verification Required</DialogTitle>
          <DialogDescription>
            Enter the super admin password to continue CSV export.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label>
            <span>Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={exportPassword}
              onChange={(event) => {
                setExportPassword(event.target.value)
                setExportVerifyError('')
              }}
              placeholder="Enter admin password"
            />
          </label>
          {exportVerifyError ? (
            <div className="student-inline-message student-inline-message--error" style={{ marginTop: '0.8rem' }}>
              <AlertCircle size={16} />
              <span>{exportVerifyError}</span>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isExportVerifying}
            onClick={() => {
              setExportVerifyOpen(false)
              setExportPassword('')
              setExportVerifyError('')
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isExportVerifying || !exportPassword.trim()}
            onClick={confirmExportVerification}
          >
            {isExportVerifying ? 'Verifying...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={saveTimeoutConfirmOpen}
        onOpenChange={setSaveTimeoutConfirmOpen}
        title="Apply session timeout changes?"
        description="This updates global session security settings for all users. Current and new sessions will adopt these limits after refresh."
        confirmLabel="Apply Changes"
        cancelLabel="Cancel"
        confirmVariant="outline"
        isConfirming={sessionTimeoutsSaving}
        confirmDisabled={!sessionTimeoutHasChanges || Boolean(parsedTimeoutForm.error) || sessionTimeoutsLoading}
        onConfirm={async () => {
          await saveSessionTimeoutSettings()
          setSaveTimeoutConfirmOpen(false)
        }}
      />

      <ConfirmDialog
        open={resetTimeoutConfirmOpen}
        onOpenChange={setResetTimeoutConfirmOpen}
        title="Reset timeout fields to defaults?"
        description="This will replace your current form values with recommended defaults. You still need to select Save Changes to apply them globally."
        confirmLabel="Reset to Default"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        confirmDisabled={sessionTimeoutsSaving || sessionTimeoutsLoading}
        onConfirm={() => {
          resetSessionTimeoutFormToDefaults()
          setResetTimeoutConfirmOpen(false)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteModalTarget)}
        onOpenChange={(open) => !open && setDeleteModalTarget(null)}
        title="Are you sure?"
        description={
          deleteModalTarget
            ? `This action cannot be undone. This will permanently delete ${deleteModalTarget.displayName || deleteModalTarget.email}.`
            : ''
        }
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isConfirming={isDeleting}
        onConfirm={confirmHardDelete}
      />

      <ConfirmDialog
        open={Boolean(statusModalTarget)}
        onOpenChange={(open) => !open && setStatusModalTarget(null)}
        title="Are you sure?"
        description={
          statusModalTarget
            ? `This will disable ${statusModalTarget.user.displayName || statusModalTarget.user.email} and block dashboard access until re-enabled.`
            : ''
        }
        confirmLabel="Disable User"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isConfirming={isUpdatingStatus}
        onConfirm={() => {
          if (!statusModalTarget) {
            return
          }
          handleUserStatusChange(statusModalTarget.user, statusModalTarget.nextStatus)
        }}
      />
    </div>
  )
}
