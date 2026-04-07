'use client'

import {
  CheckCircle2,
  Bell,
  BookOpen,
  Circle,
  Download,
  HelpCircle,
  Library,
  LogOut,
  Play,
  Search,
  Settings,
  User,
} from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  formatRelativeUpdate,
  getDisplayName,
  getSubjectTone,
} from '@/lib/demo-content'
import { StudentDashboardSkeleton } from '@/components/LoadingStates'

const DOWNLOADS_STORAGE_KEY = 'sps.educationam.downloads.v1'

function inferResourceFormat(fileUrl) {
  const value = String(fileUrl || '').toLowerCase()
  if (value.endsWith('.mp4') || value.endsWith('.mov')) {
    return { format: 'Video', size: '45m', isPlayable: true }
  }
  if (value.endsWith('.zip')) {
    return { format: 'ZIP', size: '256MB', isPlayable: false }
  }
  if (value.endsWith('.pdf')) {
    return { format: 'PDF', size: '12MB', isPlayable: false }
  }

  return { format: 'PDF', size: '12MB', isPlayable: false }
}

function normalizeStudentResource(entry) {
  const inferred = inferResourceFormat(entry?.fileUrl)
  return {
    id: entry?.id,
    title: entry?.title || 'Untitled Resource',
    subject: entry?.subject || 'General',
    class: entry?.class || 'CORE 101',
    summary: entry?.summary || 'No description available yet.',
    fileUrl: entry?.fileUrl || '',
    facultyName: entry?.facultyName || entry?.facultyEmail || 'Faculty member',
    facultyEmail: entry?.facultyEmail || '',
    createdAt: entry?.createdAt || null,
    updatedAt: entry?.updatedAt || null,
    ...inferred,
  }
}

function loadDownloadsFromStorage() {
  try {
    const raw = window.localStorage.getItem(DOWNLOADS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const [resources, setResources] = useState([])
  const [downloads, setDownloads] = useState([])
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [resourceRequest, setResourceRequest] = useState({
    courseName: '',
    titleName: '',
    preferredFormat: '',
    details: '',
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsError, setNotificationsError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('All Classes')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const deferredSearch = useDeferredValue(searchTerm)
  const notificationsPanelRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDownloads(loadDownloadsFromStorage())
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadResources = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/student/resources', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load the student catalog.')
        }

        if (!isActive) {
          return
        }

        setResources(
          Array.isArray(payload?.resources)
            ? payload.resources.map(normalizeStudentResource)
            : []
        )
        setErrorMessage('')
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error('Student catalog error:', error)
        setResources([])
        setErrorMessage(error.message || 'Could not load the student catalog.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadResources()

    return () => {
      isActive = false
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    let isActive = true

    const loadNotifications = async () => {
      setNotificationsLoading(true)
      try {
        const response = await fetch('/api/student/notifications', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load notifications.')
        }

        if (!isActive) {
          return
        }

        setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
        setNotificationsError('')
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error('Student notifications error:', error)
        setNotifications([])
        setNotificationsError(error.message || 'Could not load notifications.')
      } finally {
        if (isActive) {
          setNotificationsLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      isActive = false
    }
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

  const catalog = resources
  const classOptions = ['All Classes', ...new Set(catalog.map((entry) => entry.class))]
  const subjectOptions = ['All Subjects', ...new Set(catalog.map((entry) => entry.subject))]
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length

  const filteredResources = catalog.filter((entry) => {
    const term = deferredSearch.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.title, entry.subject, entry.class, entry.summary, entry.facultyName, entry.facultyEmail]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesSubject =
      !selectedSubject || selectedSubject === 'All Subjects' || entry.subject === selectedSubject

    const matchesClass =
      !selectedClass || selectedClass === 'All Classes' || entry.class === selectedClass

    return matchesSearch && matchesSubject && matchesClass
  })

  const persistDownloads = (entries) => {
    setDownloads(entries)
    try {
      window.localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(entries))
    } catch {
      toast.error('Downloads could not be saved locally on this device.')
    }
  }

  const openNotifications = () => {
    setNotificationsOpen((current) => !current)
  }

  const openRequestModal = () => {
    setResourceRequest({
      courseName: '',
      titleName: '',
      preferredFormat: '',
      details: '',
    })
    setRequestModalOpen(true)
  }

  const closeRequestModal = () => {
    setRequestModalOpen(false)
  }

  const handleRequestSubmit = async (event) => {
    event.preventDefault()
    setRequestSubmitting(true)

    try {
      const response = await fetch('/api/student/resource-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceRequest),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not submit the request.')
      }

      toast.success('Resource request sent.')
      setRequestModalOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not submit the request.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const markNotificationRead = async (notificationId) => {
    setNotificationsSaving(true)
    try {
      const response = await fetch('/api/student/notifications', {
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
      const response = await fetch('/api/student/notifications', {
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

  const handleResourceAction = (entry) => {
    const nextDownloads = [
      {
        id: entry.id,
        title: entry.title,
        subject: entry.subject,
        fileUrl: entry.fileUrl,
        fileType: entry.fileType || entry.type || '',
        fileSize: entry.fileSize || entry.size || 0,
        fileFormat: entry.fileFormat || entry.format || '',
        downloadedAt: new Date().toISOString(),
      },
      ...downloads.filter((download) => download.id !== entry.id),
    ].slice(0, 6)

    persistDownloads(nextDownloads)
    toast.success(`${entry.title} added to your downloads.`)

    if (typeof window !== 'undefined') {
      window.open(`/api/student/resources/${entry.id}/download`, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return <StudentDashboardSkeleton />
  }

  return (
    <div className="dashboard-page">
      {requestModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeRequestModal}>
          <div
            className="modal-card modal-card--compact glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-request-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon">
              <Library size={24} color="var(--primary)" />
            </div>
            <h3 id="resource-request-title">Academic Support Request</h3>
            <p>Our academic teams will review your request and attempt to provision the resources within 48-72 business hours.</p>

            <form className="modal-form" onSubmit={handleRequestSubmit}>
              <div className="auth-field">
                <label>Authorized Account</label>
                <div className="auth-textarea" style={{ opacity: 0.6, background: 'rgba(255,255,255,0.03)' }}>
                   {user?.email || 'Authenticated student'}
                </div>
              </div>

              <div className="modal-form__grid">
                <div className="auth-field">
                  <label htmlFor="request-course">Reference Code / Course</label>
                  <input
                    id="request-course"
                    className="auth-textarea"
                    type="text"
                    value={resourceRequest.courseName}
                    onChange={(event) => setResourceRequest((current) => ({ ...current, courseName: event.target.value }))}
                    placeholder="e.g. CS-402"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="request-title">Topic / Title</label>
                  <input
                    id="request-title"
                    className="auth-textarea"
                    type="text"
                    value={resourceRequest.titleName}
                    onChange={(event) => setResourceRequest((current) => ({ ...current, titleName: event.target.value }))}
                    placeholder="e.g. Memory Management"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="request-format">Target Format</label>
                <input
                  id="request-format"
                  className="auth-textarea"
                  type="text"
                  value={resourceRequest.preferredFormat}
                  onChange={(event) => setResourceRequest((current) => ({ ...current, preferredFormat: event.target.value }))}
                  placeholder="PDF, Video, PPTX"
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="request-details">Specific Requirements</label>
                <textarea
                  id="request-details"
                  className="auth-textarea"
                  rows={3}
                  value={resourceRequest.details}
                  onChange={(event) => setResourceRequest((current) => ({ ...current, details: event.target.value }))}
                  placeholder="Mention specific chapters or page ranges"
                />
              </div>

              <div className="modal-form__actions">
                <button type="button" className="button-secondary" onClick={closeRequestModal}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={requestSubmitting}>
                  {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar glass">
          <div className="dashboard-sidebar__brand">
            <div className="dashboard-sidebar__logo">
              <BookOpen size={24} color="var(--primary)" />
            </div>
            <div>
              <h1 className="premium-gradient-text" style={{ fontSize: '2.4rem' }}>SPS EDUCATIONAM</h1>
              <p className="dashboard-sidebar__eyebrow">Academic Library</p>
            </div>
          </div>

          <nav className="dashboard-nav">
            <a href="#student-library" className="dashboard-nav__link dashboard-nav__link--active">
              <Library size={18} />
              Library Catalog
            </a>
            <a href="#student-downloads" className="dashboard-nav__link">
              <Download size={18} />
              My Downloads
            </a>
            <a href="#student-profile" className="dashboard-nav__link">
              <User size={18} />
              Student Profile
            </a>
          </nav>

          <div className="dashboard-sidebar__footer">
            <div className="status-indicator">
              <div className="status-indicator__dot status-indicator__dot--active" />
              <span>System Online</span>
            </div>
            <button type="button" className="dashboard-nav__link" onClick={logout}>
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="dashboard-content">
          <header className="dashboard-topbar glass">
            <div className="dashboard-topbar__brand">
              <BookOpen size={18} color="var(--primary)" />
              <strong className="premium-gradient-text" style={{ fontSize: '1.2rem' }}>SPS EDUCATIONAM</strong>
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
              <button type="button" className="dashboard-topbar__icon" aria-label="Settings">
                <Settings size={18} />
              </button>
              <div className="dashboard-topbar__user" onClick={() => setSelectedSubject('All Subjects')} style={{ cursor: 'pointer' }}>
                <div className="dashboard-profile__avatar dashboard-profile__avatar--initials">
                  {getDisplayName(user?.email, 'S').charAt(0)}
                </div>
              </div>
              {notificationsOpen ? (
                <div className="notification-popover glass" ref={notificationsPanelRef} role="dialog" aria-label="Notifications">
                  <div className="notification-popover__header">
                    <div>
                      <strong>Notifications Center</strong>
                      <span>{unreadNotificationCount} unread update(s)</span>
                    </div>
                  </div>

                  <div className="notification-shell notification-shell--popover">
                    {notificationsError ? (
                      <div className="auth-alert">
                        <HelpCircle size={18} color="var(--tertiary)" />
                        <span>{notificationsError}</span>
                      </div>
                    ) : null}

                    {notificationsLoading ? (
                      <div className="empty-state">Syncing updates...</div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <article
                          key={notification.id}
                          className={`notification-card${notification.readAt ? ' notification-card--read' : ' notification-card--unread'}`}
                        >
                          <button type="button" className="notification-card__mark" onClick={() => markNotificationRead(notification.id)}>
                            {notification.readAt ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <div className="notification-card__copy" onClick={() => markNotificationRead(notification.id)}>
                            <strong>{notification.resourceTitle || 'New resource uploaded'}</strong>
                            <p>{notification.message || 'A faculty member uploaded a new learning resource.'}</p>
                            <span>
                              {notification.facultyName || notification.facultyEmail || 'Faculty'} · {formatRelativeUpdate(notification.createdAt)}
                            </span>
                          </div>
                   {!notification.readAt ? <span className="notification-card__dot" /> : null}
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">Your inbox is currently clear.</div>
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
                      {notificationsSaving ? 'Updating...' : 'Clear All Notifications'}
                    </button>
                    <button type="button" className="button-secondary" onClick={() => setNotificationsOpen(false)}>
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          {errorMessage ? (
            <div className="auth-alert" style={{ marginBottom: '1rem' }}>
              <HelpCircle size={18} color="var(--tertiary)" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <section className="dashboard-section" id="student-library">
            <div className="section-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span className="pill-label">Dashboard</span>
                  <span style={{ color: 'rgba(240,240,253,0.4)' }}>/</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Student Library</span>
                </div>
                <h2>Curated Resources</h2>
                <p>
                  Browse faculty-published learning materials through the student-only
                  catalog. Access remains restricted to Google-authenticated student accounts.
                </p>
              </div>
            </div>

            <div className="filter-row" style={{ marginBottom: '1.5rem' }}>
              <div className="filter-row__actions catalog-controls">
                <label className="catalog-control">
                  <span>Class</span>
                  <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
                    {classOptions.map((courseClass) => (
                      <option key={courseClass} value={courseClass}>
                        {courseClass}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="catalog-control">
                  <span>Subject</span>
                  <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="catalog-control catalog-control--search">
                  <span>Search title</span>
                  <div className="dashboard-topbar__search catalog-search-field">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search by resource title"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </label>
              </div>
              <span className="metric-card__label">
                {filteredResources.length} item(s)
              </span>
            </div>
            {filteredResources.length > 0 ? (
              <div className="resource-grid">
                {filteredResources.map((entry) => {
                  const tone = getSubjectTone(entry.subject)
                  return (
                    <article key={entry.id} className="resource-card glass">
                      <div className="resource-card__meta">
                        <span className="pill-label pill-label--sm" style={{ 
                          background: tone === 'primary' ? 'rgba(182,160,255,0.1)' : 'rgba(0,175,254,0.1)',
                          color: tone === 'primary' ? 'var(--primary)' : 'var(--secondary)'
                        }}>
                          {entry.subject}
                        </span>
                        <span className="pill-label pill-label--sm">{entry.class}</span>
                        <span className="resource-card__type">
                          {(entry.fileFormat || entry.format || 'FILE').toUpperCase()} · {
                            entry.fileSize 
                              ? (entry.fileSize / 1024 / 1024).toFixed(1) + ' MB'
                              : (entry.size || 'Unknown')
                          }
                        </span>
                      </div>
                      <div className="resource-card__body">
                        <h3>{entry.title}</h3>
                        <p>{entry.summary}</p>
                        <div className="resource-card__uploader">
                          <div className="dashboard-profile__avatar dashboard-profile__avatar--initials" style={{ width: 22, height: 22, fontSize: 10 }}>
                            {(entry.facultyName || 'F').charAt(0)}
                          </div>
                          <span>{entry.facultyName || entry.facultyEmail || 'Faculty'}</span>
                        </div>
                      </div>
                      <div className="resource-card__footer">
                        <span className="metric-card__label">{formatRelativeUpdate(entry.updatedAt || entry.createdAt)}</span>
                        <button type="button" className="resource-card__action" onClick={() => handleResourceAction(entry)}>
                          {entry.isPlayable ? <Play size={18} fill="currentColor" /> : <Download size={18} />}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="support-grid">
                <article className="support-card glass">
                  <span className="metric-card__label">No results found</span>
                  <p>Try another search term or reset class and subject filters to view all resources.</p>
                  <button
                    type="button"
                    className="button-secondary"
                    style={{ width: 'fit-content', marginTop: '0.9rem' }}
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedSubject('All Subjects')
                      setSelectedClass('All Classes')
                    }}
                  >
                    Reset filters
                  </button>
                </article>
              </div>
            )}
          </section>

          <section className="dashboard-section" id="student-downloads">
            <div className="section-header">
              <div>
                <h3>My Downloads</h3>
                <p>Recent downloads are stored locally so you can return quickly to the materials you opened most recently.</p>
              </div>
            </div>

            <div className="downloads-grid">
              <article className="downloads-card glass">
                <span className="metric-card__label">Downloaded Resources</span>
                <div className="downloads-list">
                  {downloads.length > 0 ? (
                    downloads.map((entry) => (
                      <div key={entry.id} className="downloads-item">
                        <div className="downloads-item__copy">
                          <strong>{entry.title}</strong>
                          <span>{entry.subject}</span>
                        </div>
                        <a href={`/api/student/resources/${entry.id}/download`} className="button-secondary" target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Your downloads will appear here after you open a resource.</div>
                  )}
                </div>
              </article>

              <article className="support-card glass" id="student-profile">
                <span className="metric-card__label">Profile Snapshot</span>
                <div className="profile-list">
                  <div className="profile-list__item">
                    <span>Email</span>
                    <strong>{user?.email || 'student@spseducationam.edu'}</strong>
                  </div>
                  <div className="profile-list__item">
                    <span>Role</span>
                    <strong>Student</strong>
                  </div>
                  <div className="profile-list__item">
                    <span>Authentication</span>
                    <strong>Google OAuth</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-section" id="student-help">
            <div className="section-header">
              <div>
                <h3>Help & Requests</h3>
                <p>Need a specific paper or module? Contact your faculty member or the academic curator.</p>
              </div>
            </div>

            <div className="support-grid">
              <article className="support-card glass">
                <span className="metric-card__label">Resource Request</span>
                <p>Send a request with the course code, title, and preferred format so faculty can review it quickly.</p>
                <button
                  type="button"
                  className="button-primary"
                  style={{ marginTop: '1rem', width: 'fit-content' }}
                  onClick={openRequestModal}
                >
                  Request Resource
                </button>
              </article>

              <article className="support-card glass">
                <span className="metric-card__label">Request Status</span>
                <p>Submitted requests are sent to the admin queue so the team can mark them pending, under review, or done.</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
