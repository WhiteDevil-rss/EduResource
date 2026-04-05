'use client'

import {
  Bell,
  BookOpen,
  Download,
  HelpCircle,
  Library,
  LogOut,
  Play,
  Search,
  Settings,
  User,
} from 'lucide-react'
import { useDeferredValue, useEffect, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  formatRelativeUpdate,
  getDisplayName,
  getSubjectTone,
} from '@/lib/demo-content'

const DOWNLOADS_STORAGE_KEY = 'eduresourcehub.downloads.v1'

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
    previewUrl: entry?.previewUrl || '',
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
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const [isFiltering, startTransition] = useTransition()
  const deferredSearch = useDeferredValue(searchTerm)

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
        const params = new URLSearchParams()
        if (deferredSearch.trim()) {
          params.set('q', deferredSearch.trim())
        }
        if (selectedSubject && selectedSubject !== 'All Subjects') {
          params.set('subject', selectedSubject)
        }

        const url = `/api/student/resources${params.toString() ? `?${params.toString()}` : ''}`
        const response = await fetch(url, { cache: 'no-store' })
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

    startTransition(() => {
      loadResources()
    })

    return () => {
      isActive = false
    }
  }, [deferredSearch, selectedSubject])

  const catalog = resources
  const subjectOptions = ['All Subjects', ...new Set(catalog.map((entry) => entry.subject))]

  const leadResources = catalog.slice(0, 3)
  const additionalResources = catalog.slice(3)

  const persistDownloads = (entries) => {
    setDownloads(entries)
    try {
      window.localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(entries))
    } catch {
      toast.error('Downloads could not be saved locally on this device.')
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
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar__brand">
            <h1>Student Space</h1>
            <p className="dashboard-sidebar__eyebrow">Google OAuth Access</p>
          </div>

          <nav className="dashboard-nav">
            <a href="#student-library" className="dashboard-nav__link dashboard-nav__link--active">
              <Library size={18} />
              Library
            </a>
            <a href="#student-downloads" className="dashboard-nav__link">
              <Download size={18} />
              My Downloads
            </a>
            <a href="#student-profile" className="dashboard-nav__link">
              <User size={18} />
              Profile
            </a>
          </nav>

          <div className="dashboard-sidebar__footer">
            <a href="#student-help" className="dashboard-nav__link">
              <HelpCircle size={18} />
              Help
            </a>
            <button type="button" className="dashboard-nav__link" onClick={logout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        <div className="dashboard-content">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__brand">
              <BookOpen size={18} color="var(--primary)" />
              <strong>EduResource Hub</strong>
            </div>

            <div className="dashboard-topbar__search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search academic resources..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="dashboard-topbar__actions">
              <button type="button" className="dashboard-topbar__icon" aria-label="Notifications">
                <Bell size={18} />
              </button>
              <button type="button" className="dashboard-topbar__icon" aria-label="Settings">
                <Settings size={18} />
              </button>
              <div className="dashboard-topbar__user">
                <div className="dashboard-profile__avatar dashboard-profile__avatar--initials">
                  {getDisplayName(user?.email, 'S').charAt(0)}
                </div>
              </div>
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
              <div className="filter-row__actions">
                {subjectOptions.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    className={subject === selectedSubject ? 'button-primary' : 'button-secondary'}
                    onClick={() => startTransition(() => setSelectedSubject(subject))}
                  >
                    {subject}
                  </button>
                ))}
              </div>
              <span className="metric-card__label">
                {isFiltering ? 'Updating results...' : `${catalog.length} item(s)`}
              </span>
            </div>

            {catalog.length > 0 ? (
              <div className="resource-grid">
                {leadResources.map((entry) => {
                  const tone = getSubjectTone(entry.subject)
                  return (
                    <article key={entry.id} className="resource-card">
                      <div className="resource-card__meta">
                        <span style={{ color: tone === 'primary' ? 'var(--primary)' : 'var(--secondary)' }}>
                          {entry.subject}
                        </span>
                        <span>/</span>
                        <span style={{ color: 'var(--secondary)' }}>
                          {(entry.fileFormat || entry.format || 'FILE').toUpperCase()} / {
                            entry.fileSize 
                              ? (entry.fileSize / 1024 / 1024).toFixed(1) + ' MB'
                              : (entry.size || 'Unknown')
                          }
                        </span>
                      </div>
                      {entry.previewUrl && (
                        <div className="resource-card__preview">
                          <img src={entry.previewUrl} alt={entry.title} loading="lazy" />
                        </div>
                      )}
                      <div className="resource-card__body">
                        <h3>{entry.title}</h3>
                        <p>{entry.summary}</p>
                      </div>
                      <div className="resource-card__footer">
                        <span className="metric-card__label">{formatRelativeUpdate(entry.updatedAt || entry.createdAt)}</span>
                        <button type="button" className="resource-card__action" onClick={() => handleResourceAction(entry)}>
                          {entry.isPlayable ? <Play size={18} /> : <Download size={18} />}
                        </button>
                      </div>
                    </article>
                  )
                })}

                {additionalResources.map((entry) => (
                  <article key={entry.id} className="resource-card">
                    <div className="resource-card__meta">
                      <span>{entry.subject}</span>
                      <span>/</span>
                      <span>
                        {(entry.fileFormat || entry.format || 'FILE').toUpperCase()} / {
                          entry.fileSize 
                            ? (entry.fileSize / 1024 / 1024).toFixed(1) + ' MB'
                            : (entry.size || 'Unknown')
                        }
                      </span>
                    </div>
                    {entry.previewUrl && (
                      <div className="resource-card__preview">
                        <img src={entry.previewUrl} alt={entry.title} loading="lazy" />
                      </div>
                    )}
                    <div className="resource-card__body">
                      <h3>{entry.title}</h3>
                      <p>{entry.summary}</p>
                    </div>
                    <div className="resource-card__footer">
                      <span className="metric-card__label">{formatRelativeUpdate(entry.updatedAt || entry.createdAt)}</span>
                      <button type="button" className="resource-card__action" onClick={() => handleResourceAction(entry)}>
                        {entry.isPlayable ? <Play size={18} /> : <Download size={18} />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="support-grid">
                <article className="support-card">
                  <span className="metric-card__label">No Resources Available</span>
                  <p>The student catalog is currently empty for the selected filters.</p>
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
              <article className="downloads-card">
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

              <article className="support-card" id="student-profile">
                <span className="metric-card__label">Profile Snapshot</span>
                <div className="profile-list">
                  <div className="profile-list__item">
                    <span>Email</span>
                    <strong>{user?.email || 'student@eduresourcehub.edu'}</strong>
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
              <article className="support-card">
                <span className="metric-card__label">Resource Request</span>
                <p>Send a request with the course code, title, and preferred format so faculty can review it quickly.</p>
                <a
                  href={`mailto:library@eduresourcehub.edu?subject=${encodeURIComponent('Resource Request')}&body=${encodeURIComponent('Course code:%0ARequested resource:%0APreferred format:%0AReason for request:')}`}
                  className="button-primary"
                  style={{ marginTop: '1rem', width: 'fit-content' }}
                >
                  Email the Curator
                </a>
              </article>

              <article className="support-card">
                <span className="metric-card__label">Access Model</span>
                <p>Student access is granted only through Google sign-in, and each student session is checked server-side before the catalog is returned.</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
