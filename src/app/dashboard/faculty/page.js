'use client'

import {
  AlertCircle,
  Bell,
  Edit3,
  FileText,
  Filter,
  LogOut,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  UserCircle2,
} from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  FACULTY_PROFILE,
  formatDisplayDate,
  getDisplayName,
  getSubjectTone,
} from '@/lib/demo-content'

const EMPTY_DRAFT = {
  id: null,
  title: '',
  class: '',
  subject: '',
  fileUrl: '',
  summary: '',
  status: 'live',
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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const deferredSearch = useDeferredValue(searchTerm)

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
      setErrorMessage('')
    } catch (error) {
      console.error('Faculty resource error:', error)
      setErrorMessage(error.message || 'Could not load faculty resources.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadResources()
  }, [user?.uid])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#faculty-upload') {
      setEditorOpen(true)
    }
  }, [])

  const visibleResources = resources.filter((entry) => {
    const term = deferredSearch.trim().toLowerCase()
    if (!term) {
      return true
    }

    return [entry.title, entry.class, entry.subject, entry.status, entry.summary]
      .join(' ')
      .toLowerCase()
      .includes(term)
  })

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
      summary: entry.summary || '',
      status: entry.status || 'live',
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setDraft(EMPTY_DRAFT)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(
        draft.id ? `/api/faculty/resources/${draft.id}` : '/api/faculty/resources',
        {
          method: draft.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
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
    }
  }

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(`Delete "${entry.title}" from the publication list?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/faculty/resources/${entry.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete the resource.')
      }

      toast.success('Publication deleted.')
      await loadResources({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not delete the resource.')
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
                <img src={FACULTY_PROFILE.avatar} alt="Faculty profile" />
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
              <button type="button" className="dashboard-topbar__icon" aria-label="Notifications">
                <Bell size={18} />
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
                <strong className="metric-card__value">{formatCompactNumber(Math.max(resources.length, 1) * 48)}</strong>
              </article>
              <article className="status-panel">
                <span className="metric-card__label" style={{ color: 'var(--secondary)' }}>Publishing Policy</span>
                <strong className="metric-card__value" style={{ fontSize: '2rem' }}>Faculty Only</strong>
              </article>
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
                <p>Faculty access is created and maintained only by the admin panel. Password resets, activation changes, and privilege adjustments are handled centrally.</p>
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
                <label htmlFor="faculty-file">File URL</label>
                <input
                  id="faculty-file"
                  className="auth-textarea"
                  type="url"
                  value={draft.fileUrl}
                  onChange={(event) => setDraft((current) => ({ ...current, fileUrl: event.target.value }))}
                />
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
