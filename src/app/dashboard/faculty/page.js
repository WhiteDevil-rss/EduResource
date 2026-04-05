'use client'

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Edit3,
  FileText,
  Filter,
  Circle,
  LogOut,
  HelpCircle,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  UserCircle2,
} from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  FACULTY_PROFILE,
  formatDisplayDate,
  formatRelativeUpdate,
  getDisplayName,
  getSafeAvatarUrl,
  getSubjectTone,
} from '@/lib/demo-content'

const EMPTY_DRAFT = {
  id: null,
  title: '',
  class: '',
  subject: '',
  fileUrl: '',
  fileType: '',
  fileSize: 0,
  fileFormat: '',
  summary: '',
  status: 'live',
  file: null, // Temporary client-side file object
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function statusClassName(status) {
  if (status === 'draft') return 'status-state status-state--draft'
  return 'status-state status-state--active'
}

export default function FacultyDashboard() {
  const { user, logout } = useAuth()
  const [resources, setResources] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [totalDownloads, setTotalDownloads] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const notificationsPanelRef = useRef(null)
  const deferredSearch = useDeferredValue(searchTerm)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const loadResources = async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch('/api/faculty/resources', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load faculty resources.')
      }

      setResources(Array.isArray(payload?.resources) ? payload.resources : [])
  setTotalDownloads(Number(payload?.totalDownloads || 0))
      setErrorMessage('')
    } catch (error) {
      console.error('Faculty resource error:', error)
      setErrorMessage(error.message || 'Could not load faculty resources.')
    } finally {
      setLoading(false)
      setRefreshing(false)
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
      console.error('Faculty notifications error:', error)
      setNotifications([])
      setNotificationsError(error.message || 'Could not load notifications.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadResources()
    loadNotifications()
  }, [user?.uid])

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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#faculty-upload') {
      setEditorOpen(true)
    }
  }, [])

  const subjectOptions = ['All Subjects', ...new Set(resources.map((entry) => entry.subject).filter(Boolean))]

  const visibleResources = resources.filter((entry) => {
    const term = deferredSearch.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [
        entry.title,
        entry.class,
        entry.subject,
        entry.status,
        entry.summary,
        entry.fileFormat,
        entry.fileType,
      ]
      .join(' ')
      .toLowerCase()
      .includes(term)

    const matchesSubject =
      !selectedSubject || selectedSubject === 'All Subjects' || entry.subject === selectedSubject

    return matchesSearch && matchesSubject
  })

  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length

  const openCreateModal = () => {
    setDraft(EMPTY_DRAFT)
    setEditorOpen(true)
  }

  const openEditModal = (entry) => {
    setDraft({
      id: entry.id,
      title: entry.title,
      class: entry.class,
      subject: entry.subject,
      fileUrl: entry.fileUrl,
      fileType: entry.fileType || '',
      fileSize: entry.fileSize || 0,
      fileFormat: entry.fileFormat || '',
      summary: entry.summary || '',
      status: entry.status || 'live',
      file: null,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setDraft(EMPTY_DRAFT)
  }

  

  const handleSave = async (event) => {
    event.preventDefault()

    const formData = new FormData()
    formData.append('title', draft.title)
    formData.append('class', draft.class)
    formData.append('subject', draft.subject)
    formData.append('summary', draft.summary)
    formData.append('status', draft.status)
    
    if (draft.file) {
      formData.append('file', draft.file)
    }

    setRefreshing(true)
    try {
      if (!draft.id && !draft.file) {
        throw new Error('Please select a file to upload.')
      }

      const response = await fetch(
        draft.id ? `/api/faculty/resources/${draft.id}` : '/api/faculty/resources',
        {
          method: draft.id ? 'PATCH' : 'POST',
          body: draft.id ? JSON.stringify(Object.fromEntries(formData)) : formData,
          // For PATCH, we might still want JSON if we're not updating the file, 
          // but for POST we definitely want FormData.
          headers: draft.id ? { 'Content-Type': 'application/json' } : undefined,
        }
      )

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save the resource.')
      }

      toast.success(draft.id ? 'Publication updated.' : 'Resource published.')
      closeEditor()
      await loadResources({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not save the resource.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async (entry) => {
    setDeleteTarget(entry)
  }

  const toggleResourceStatus = async (entry) => {
    const nextStatus = entry.status === 'draft' ? 'live' : 'draft'

    try {
      const response = await fetch(`/api/faculty/resources/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status', status: nextStatus }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the resource status.')
      }

      setResources((current) =>
        current.map((item) => (item.id === entry.id ? payload.resource : item))
      )
      toast.success(`${entry.title} is now ${nextStatus}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the resource status.')
    }
  }

  const openNotifications = () => {
    setNotificationsOpen((current) => !current)
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
      toast.success('Notification marked as read.')
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

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      const response = await fetch(`/api/faculty/resources/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete the resource.')
      }

      toast.success('Publication deleted.')
      await loadResources({ background: true })
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete the resource.')
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password.')
      }

      toast.success('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-card modal-card--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="faculty-delete-title">Delete publication?</h3>
            <p>
              Remove "{deleteTarget.title}" from the publication list. This cannot be undone.
            </p>

            <div className="modal-form__actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="button-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="button-primary" onClick={confirmDelete}>
                Delete publication
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar__brand">
            <h1 style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dim))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              EduResource Hub
            </h1>
            <p className="dashboard-sidebar__eyebrow">Faculty Dashboard</p>
          </div>

          <nav className="dashboard-nav">
            <a href="#faculty-library" className="dashboard-nav__link">
              <FileText size={18} />
              Library
            </a>
            <a href="#faculty-publications" className="dashboard-nav__link dashboard-nav__link--active">
              <Upload size={18} />
              My Publications
            </a>
            <a href="#faculty-portal" className="dashboard-nav__link">
              <UserCircle2 size={18} />
              Faculty Profile
            </a>
            <a href="#faculty-settings" className="dashboard-nav__link">
              <Settings size={18} />
              Security
            </a>
          </nav>

          <div className="dashboard-sidebar__footer">
            <button type="button" className="button-primary" onClick={openCreateModal}>
              <Upload size={16} />
              Upload Resource
            </button>

            <div className="dashboard-profile">
              <div className="dashboard-profile__avatar">
                <img src={getSafeAvatarUrl(user?.avatar, FACULTY_PROFILE.avatar)} alt="Faculty profile" />
              </div>
              <div>
                <strong>{user?.name || getDisplayName(user?.email, FACULTY_PROFILE.name)}</strong>
                <p className="dashboard-sidebar__eyebrow" style={{ marginTop: '0.15rem' }}>
                  Faculty Publisher
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="dashboard-content">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search your publications..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="dashboard-topbar__actions">
              <button
                type="button"
                className="dashboard-topbar__icon"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                onClick={openNotifications}
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 ? <span className="dashboard-topbar__badge">{unreadNotificationCount}</span> : null}
              </button>
              <button
                type="button"
                className="dashboard-topbar__icon"
                aria-label="Refresh resources"
                onClick={() => loadResources({ background: true })}
              >
                <Filter size={18} />
              </button>
              <button type="button" className="dashboard-topbar__icon" aria-label="Log out" onClick={logout}>
                <LogOut size={18} />
              </button>

              {notificationsOpen ? (
                <div className="notification-popover" ref={notificationsPanelRef} role="dialog" aria-label="Notifications">
                  <div className="notification-popover__header">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unreadNotificationCount} unread</span>
                    </div>
                    <button
                      type="button"
                      className="dashboard-topbar__icon"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <Circle size={16} />
                    </button>
                  </div>

                  <div className="notification-shell notification-shell--popover">
                    {notificationsError ? (
                      <div className="auth-alert">
                        <HelpCircle size={18} color="var(--tertiary)" />
                        <span>{notificationsError}</span>
                      </div>
                    ) : null}

                    {notificationsLoading ? (
                      <div className="empty-state">Loading notifications...</div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <article
                          key={notification.id}
                          className={`notification-card${notification.readAt ? ' notification-card--read' : ' notification-card--unread'}`}
                        >
                          <button
                            type="button"
                            className="notification-card__mark"
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            {notification.readAt ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <div className="notification-card__copy" onClick={() => markNotificationRead(notification.id)}>
                            <strong>{notification.resourceTitle || notification.message || 'New notification'}</strong>
                            <p>{notification.message || 'A new dashboard update is available.'}</p>
                            <span>
                              {notification.facultyName || notification.studentName || notification.facultyEmail || notification.studentEmail || 'System'} · {formatRelativeUpdate(notification.createdAt)}
                            </span>
                          </div>
                          {!notification.readAt ? <span className="notification-card__dot" /> : null}
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">You do not have any notifications yet.</div>
                    )}
                  </div>

                  <div className="notification-popover__footer">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={readAllNotifications}
                      disabled={notificationsSaving || unreadNotificationCount === 0}
                    >
                      <CheckCircle2 size={16} />
                      {notificationsSaving ? 'Updating...' : 'Read all at once'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          <section className="dashboard-section" id="faculty-library">
            <article className="dashboard-hero">
              <div className="dashboard-hero__content">
                <span className="auth-kicker">Faculty Workspace</span>
                <h2>Secure Publishing</h2>
                <p>
                  Publish and update course resources through faculty-only APIs.
                  Every action is tied to your signed session and audited by the
                  admin console.
                </p>
                <div className="dashboard-hero__actions">
                  <button type="button" className="button-primary" onClick={openCreateModal}>
                    Upload New Resource
                  </button>
                  <button type="button" className="button-secondary" onClick={() => loadResources({ background: true })}>
                    {refreshing ? 'Refreshing...' : 'Refresh Publications'}
                  </button>
                </div>
              </div>
            </article>
          </section>

          {errorMessage ? (
            <div className="auth-alert" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} color="var(--tertiary)" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <section className="dashboard-section" id="faculty-publications">
            <div className="metric-grid" style={{ marginBottom: '1.5rem' }}>
              <article className="metric-card">
                <span className="metric-card__label">Publications</span>
                <strong className="metric-card__value">{resources.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">Total Downloads</span>
                <strong className="metric-card__value">{formatCompactNumber(totalDownloads)}</strong>
              </article>
              <article className="status-panel">
                <span className="metric-card__label" style={{ color: 'var(--secondary)' }}>Publishing Policy</span>
                <strong className="metric-card__value" style={{ fontSize: '2rem' }}>Faculty Only</strong>
              </article>
            </div>

            <div className="filter-row" style={{ marginBottom: '1rem' }}>
              <div className="filter-row__actions">
                {subjectOptions.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    className={subject === selectedSubject ? 'button-primary' : 'button-secondary'}
                    onClick={() => setSelectedSubject(subject)}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-shell">
              <div className="table-shell__header">
                <div>
                  <h3>Your Publications</h3>
                </div>
                <div className="filter-row__actions">
                  <button type="button" className="button-secondary" onClick={openCreateModal}>
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>

              <table className="data-table data-table--responsive">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResources.length > 0 ? (
                    visibleResources.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label="Title">
                          <div className="table-entity">
                            <div className="metric-card__icon" style={{ width: '2.5rem', height: '2.5rem', background: 'rgba(182, 160, 255, 0.12)', color: 'var(--primary)' }}>
                              <FileText size={18} />
                            </div>
                            <div className="table-entity__copy">
                              <strong>{entry.title}</strong>
                              <span>{entry.summary || 'No summary provided'}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Class">{entry.class}</td>
                        <td data-label="Subject">
                          <span className={`subject-chip subject-chip--${getSubjectTone(entry.subject)}`}>
                            {entry.subject}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className={statusClassName(entry.status)}>
                            <span className="status-state__dot" />
                            {entry.status === 'draft' ? 'Draft' : 'Live'}
                          </span>
                        </td>
                        <td data-label="Date">{formatDisplayDate(entry.createdAt)}</td>
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <div className="table-action-group">
                            <button
                              type="button"
                              className={entry.status === 'draft' ? 'button-secondary' : 'button-primary'}
                              onClick={() => toggleResourceStatus(entry)}
                            >
                              {entry.status === 'draft' ? 'Publish' : 'Draft'}
                            </button>
                            <button type="button" className="dashboard-topbar__icon" aria-label={`Edit ${entry.title}`} onClick={() => openEditModal(entry)}>
                              <Edit3 size={16} />
                            </button>
                            <button type="button" className="dashboard-topbar__icon" aria-label={`Delete ${entry.title}`} onClick={() => handleDelete(entry)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td data-label="Title" colSpan={6}>
                        <div className="empty-state">No faculty publications matched the current filter.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="table-shell__footer">
                <span>{visibleResources.length} publication(s) available in your secure workspace.</span>
                <span>Only this faculty account can modify these resources.</span>
              </div>
            </div>
          </section>

          <section className="dashboard-section" id="faculty-portal">
            <div className="support-grid">
              <article className="support-card">
                <span className="metric-card__label">Faculty Profile</span>
                <div className="downloads-list">
                  <div className="profile-list__item">
                    <span>Email</span>
                    <strong>{user?.email || 'faculty@eduresourcehub.edu'}</strong>
                  </div>
                  <div className="profile-list__item">
                    <span>Login ID</span>
                    <strong>{user?.loginId || 'Issued by admin'}</strong>
                  </div>
                  <div className="profile-list__item">
                    <span>Role</span>
                    <strong>Faculty</strong>
                  </div>
                </div>
              </article>

              <article className="support-card" id="faculty-settings">
                <span className="metric-card__label">Security Controls</span>
                <form className="modal-form" style={{ marginTop: '1rem' }} onSubmit={handlePasswordChange}>
                  <div className="auth-field">
                    <label htmlFor="current-password">Current Password</label>
                    <input
                      id="current-password"
                      type="password"
                      className="auth-textarea"
                      placeholder="••••••••"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="new-password">New Password</label>
                    <input
                      id="new-password"
                      type="password"
                      className="auth-textarea"
                      placeholder="Min. 6 characters"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="auth-textarea"
                      placeholder="Confirm your new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="button-primary" 
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </article>
            </div>
          </section>
        </div>
      </div>

      <button type="button" className="floating-fab" aria-label="Upload resource" onClick={openCreateModal}>
        <Plus size={28} />
      </button>

      {editorOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{draft.id ? 'Edit Publication' : 'Upload Resource'}</h3>
            <p>Publish through the faculty API with strict ownership checks and server-side auditing.</p>

            <form className="modal-form" onSubmit={handleSave}>
              <div className="auth-field">
                <label htmlFor="faculty-title">Title</label>
                <input
                  id="faculty-title"
                  className="auth-textarea"
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="modal-form__grid">
                <div className="auth-field">
                  <label htmlFor="faculty-class">Class</label>
                  <input
                    id="faculty-class"
                    className="auth-textarea"
                    type="text"
                    value={draft.class}
                    onChange={(event) => setDraft((current) => ({ ...current, class: event.target.value }))}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="faculty-subject">Subject</label>
                  <input
                    id="faculty-subject"
                    className="auth-textarea"
                    type="text"
                    value={draft.subject}
                    onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Resource Material (PDF, DOCX, TXT, etc.)</label>
                <div 
                  className={`upload-zone ${draft.file ? 'upload-zone--has-file' : ''}`}
                  onClick={() => document.getElementById('file-upload-input').click()}
                >
                  <Upload size={24} color={draft.file ? 'var(--primary)' : 'var(--secondary)'} />
                  {draft.file ? (
                    <div className="upload-zone__file">
                      <strong>{draft.file.name}</strong>
                      <span>{(draft.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <div className="upload-zone__prompt">
                      <strong>Click to upload or drag & drop</strong>
                      <span>Max file size: 25MB</span>
                    </div>
                  )}
                  <input 
                    id="file-upload-input"
                    type="file" 
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        setDraft(curr => ({ ...curr, file }))
                      }
                    }}
                  />
                </div>
                {draft.fileUrl && !draft.file ? (
                  <p className="field-hint">Current file: <a href={draft.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>View existing</a></p>
                ) : null}
              </div>

              <div className="auth-field">
                <label htmlFor="faculty-summary">Summary</label>
                <textarea
                  id="faculty-summary"
                  className="auth-textarea"
                  rows={4}
                  value={draft.summary}
                  onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                />
              </div>

              <div className="auth-field auth-select">
                <label htmlFor="faculty-status">Publication Status</label>
                <div className="auth-select">
                  <select
                    id="faculty-status"
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="live">Live</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="modal-form__actions">
                <button type="button" className="button-secondary" onClick={closeEditor}>
                  Cancel
                </button>
                <button type="submit" className="button-primary">
                  {draft.id ? 'Save Changes' : 'Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
