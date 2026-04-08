'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Inbox, KeyRound, MoreVertical, Plus, UserCheck, UserX, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { useAuth } from '@/hooks/useAuth'
import { getUserManagementActionPolicy } from '@/lib/admin-protection'
import { formatDisplayDate } from '@/lib/demo-content'

const EMPTY_CREATE_FORM = {
  role: 'faculty',
  displayName: '',
  email: '',
}

export default function UserManagementPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [pendingCredentials, setPendingCredentials] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [resetModal, setResetModal] = useState(null)

  const loadUsers = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      const response = await fetch('/api/admin/users?page=1&limit=500', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load users.')
      }
      setUsers(Array.isArray(payload?.users) ? payload.users : [])
    } catch (error) {
      setUsers([])
      toast.error(error.message || 'Could not load users.')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((entry) => {
      if (roleFilter !== 'all' && entry.role !== roleFilter) {
        return false
      }

      if (!term) {
        return true
      }

      return [entry.email, entry.displayName, entry.loginId, entry.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [roleFilter, search, users])

  const filteredUsersCount = filteredUsers.length

  const exportUsersCsv = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/admin/users/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: search,
          roleFilter,
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
      link.download = 'admin-users.csv'
      link.click()
      URL.revokeObjectURL(url)
      toast.success('CSV export downloaded successfully.')
    } catch (error) {
      toast.error(error.message || 'Could not export CSV.')
    } finally {
      setProcessing(false)
    }
  }

  const createUser = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not create user.')
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
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE_FORM)
      toast.success('User account created successfully.')
      await loadUsers({ silent: true })
    } catch (error) {
      toast.error(error.message || 'Could not create user.')
    } finally {
      setProcessing(false)
    }
  }

  const updateUserStatus = async (entry, nextStatus) => {
    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/users/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-status', status: nextStatus }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update status.')
      }

      setUsers((current) => current.map((item) => (item.id === entry.id ? payload.user : item)))
      toast.success(`User ${nextStatus === 'active' ? 'enabled' : 'disabled'} successfully.`)
    } catch (error) {
      toast.error(error.message || 'Could not update status.')
    } finally {
      setProcessing(false)
    }
  }

  const resetCredentials = async () => {
    if (!resetModal?.user?.id) {
      return
    }

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/users/${resetModal.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetCredentials',
          password: resetModal.password?.trim() ? resetModal.password : undefined,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not reset credentials.')
      }

      setPendingCredentials({
        ...payload.credentials,
        role: resetModal.user.role,
        email: resetModal.user.email,
      })
      setResetModal(null)
      toast.success('Credentials reset successfully.')
      await loadUsers({ silent: true })
    } catch (error) {
      toast.error(error.message || 'Could not reset credentials.')
    } finally {
      setProcessing(false)
    }
  }

  const deleteUser = async () => {
    if (!deleteTarget?.id) {
      return
    }

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete user.')
      }

      setUsers((current) => current.filter((entry) => entry.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('User deleted successfully.')
    } catch (error) {
      toast.error(error.message || 'Could not delete user.')
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value || ''))
      toast.success(`${label} copied to clipboard.`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`)
    }
  }

  const filters = (
    <>
      <label className="student-filter-control student-filter-control--search">
        <span>Search</span>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users by email, name, role"
          aria-label="Search users"
        />
      </label>
      <label className="student-filter-control">
        <span>Role</span>
        <select className="ui-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div className="student-filter-actions">
        <Button type="button" variant="outline" onClick={exportUsersCsv} disabled={processing}>
          <Download size={14} />
          Export CSV
        </Button>
        <Button type="button" onClick={() => setCreateOpen(true)} disabled={processing}>
          <Plus size={14} />
          Create Account
        </Button>
      </div>
      <Badge variant="outline" className="student-filter-count">{filteredUsersCount} result(s)</Badge>
    </>
  )

  return (
    <>
      <AdminPageWrapper
        title="User Management"
        description="Create, audit, and control account access with role-aware safety checks."
        filters={filters}
      >
      <SkeletonWrapper name="admin-user-management-list" loading={loading}>
        {filteredUsers.length === 0 ? (
          <Card className="student-empty-state">
            <CardContent>
              <Inbox size={30} />
              <h3>No users found</h3>
              <p>Try a different search term or role filter.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="student-resource-grid">
            {filteredUsers.map((entry) => {
              const actionPolicy = getUserManagementActionPolicy(user, entry)

              return (
                <Card key={entry.id} className="student-resource-card">
                  <CardHeader className="student-resource-card__header">
                    <div className="student-resource-card__meta">
                      <Badge>{entry.role}</Badge>
                      <Badge variant={entry.status === 'disabled' ? 'outline' : 'secondary'}>
                        {entry.status || 'active'}
                      </Badge>
                    </div>
                    <Badge variant="outline">{entry.authProvider || 'credentials'}</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="student-resource-card__title">{entry.displayName || entry.email}</CardTitle>
                    <p className="student-resource-card__summary">{entry.email}</p>
                    <p className="student-resource-card__updated">Last updated: {formatDisplayDate(entry.updatedAt || entry.createdAt, 'N/A')}</p>
                  </CardContent>
                  <CardContent className="student-resource-card__actions">
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
                              onSelect={() => setResetModal({ user: entry, password: '' })}
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
                                    setStatusTarget({ user: entry, nextStatus })
                                    return
                                  }
                                  updateUserStatus(entry, nextStatus)
                                }}
                              >
                                {entry.status === 'disabled' ? <UserCheck size={14} /> : <UserX size={14} />}
                                {entry.status === 'disabled' ? 'Enable User' : 'Disable User'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="user-actions-menu__item"
                                onSelect={() => setDeleteTarget(entry)}
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
              )
            })}
          </div>
        )}
      </SkeletonWrapper>
      </AdminPageWrapper>

      {pendingCredentials ? (
        <section className="admin-v2-page">
          <Card className="admin-v2-card">
            <CardHeader>
              <CardTitle>One-Time Credentials</CardTitle>
            </CardHeader>
            <CardContent className="student-download-list">
              <div className="student-download-item">
                <div>
                  <strong>Role</strong>
                  <p>{pendingCredentials.role}</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => copyToClipboard(pendingCredentials.role, 'Role')}>
                  Copy
                </Button>
              </div>
              <div className="student-download-item">
                <div>
                  <strong>Email</strong>
                  <p>{pendingCredentials.email}</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => copyToClipboard(pendingCredentials.email, 'Email')}>
                  Copy
                </Button>
              </div>
              {pendingCredentials.loginId ? (
                <div className="student-download-item">
                  <div>
                    <strong>Login ID</strong>
                    <p>{pendingCredentials.loginId}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => copyToClipboard(pendingCredentials.loginId, 'Login ID')}>
                    Copy
                  </Button>
                </div>
              ) : null}
              {pendingCredentials.temporaryPassword ? (
                <div className="student-download-item">
                  <div>
                    <strong>Temporary Password</strong>
                    <p>{pendingCredentials.temporaryPassword}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => copyToClipboard(pendingCredentials.temporaryPassword, 'Temporary password')}>
                    Copy
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen} labelledBy="admin-create-account-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="admin-create-account-title">Create Account</DialogTitle>
          <DialogDescription>
            Provision Google-only students or admin-issued credentials for faculty/admin roles.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className="student-request-form" onSubmit={(event) => event.preventDefault()}>
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
              <span>Display Name</span>
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
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={createUser} disabled={processing}>
            {processing ? 'Creating...' : 'Create Account'}
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
          <form className="student-request-form" onSubmit={(event) => event.preventDefault()}>
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
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={processing} onClick={() => setResetModal(null)}>
            Cancel
          </Button>
          <Button type="button" disabled={processing} onClick={resetCredentials}>
            {processing ? 'Processing...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this user account?"
        description={deleteTarget ? `This action cannot be undone. This will permanently delete ${deleteTarget.displayName || deleteTarget.email}.` : ''}
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isConfirming={processing}
        onConfirm={deleteUser}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title="Disable user account?"
        description={statusTarget ? `This will disable ${statusTarget.user.displayName || statusTarget.user.email} and block dashboard access until re-enabled.` : ''}
        confirmLabel="Disable User"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isConfirming={processing}
        onConfirm={async () => {
          if (!statusTarget?.user) return
          await updateUserStatus(statusTarget.user, statusTarget.nextStatus)
          setStatusTarget(null)
        }}
      />
    </>
  )
}
