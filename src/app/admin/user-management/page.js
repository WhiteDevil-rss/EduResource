'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Download, Inbox, ShieldCheck, Users, RefreshCw, Key, UserPlus, UserCheck, Settings2, Copy, History, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  PageContainer,
  ContentSection,
  GridContainer,
  ResponsiveFilterBar,
} from '@/components/layout'
import { StandardCard, UserCard, StatCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { useAuth } from '@/hooks/useAuth'
import { getUserManagementActionPolicy } from '@/lib/admin-protection'
import { formatDisplayDate } from '@/lib/demo-content'
import { cn } from '@/lib/utils'

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
  const [tab, setTab] = useState('active')

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch('/api/admin/users?page=1&limit=500', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Registry sync failure.')
      setUsers(Array.isArray(payload?.users) ? payload.users : [])
    } catch (error) {
      setUsers([])
      toast.error(error.message || 'Registry sync failed.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((entry) => {
      if (roleFilter !== 'all' && entry.role !== roleFilter) return false
      if (!term) return true
      return [entry.email, entry.displayName, entry.loginId, entry.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [roleFilter, search, users])

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status !== 'disabled').length,
    admins: users.filter(u => u.role === 'admin').length,
    faculty: users.filter(u => u.role === 'faculty').length,
  }), [users])

  const createUser = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Provisioning failure.')

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
      toast.success('Identity protocols synchronized.')
      await loadUsers({ silent: true })
    } catch (error) {
      toast.error(error.message || 'Provisioning failed.')
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
      if (!response.ok) throw new Error(payload?.error || 'Lifecycle update failure.')

      setUsers((current) => current.map((item) => (item.id === entry.id ? payload.user : item)))
      toast.success(`Access ${nextStatus === 'active' ? 'restored' : 'suspended'}.`)
    } catch (error) {
      toast.error(error.message || 'Lifecycle update failed.')
    } finally {
      setProcessing(false)
    }
  }

  const resetCredentials = async () => {
    if (!resetModal?.user?.id) return
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
      if (!response.ok) throw new Error(payload?.error || 'Secret reset failure.')

      setPendingCredentials({
        ...payload.credentials,
        role: resetModal.user.role,
        email: resetModal.user.email,
      })
      setResetModal(null)
      toast.success('Security secrets rotated.')
      await loadUsers({ silent: true })
    } catch (error) {
      toast.error(error.message || 'Secret rotation failed.')
    } finally {
      setProcessing(false)
    }
  }

  const deleteUser = async () => {
    if (!deleteTarget?.id) return
    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Identity purge failure.')

      setUsers((current) => current.filter((entry) => entry.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Identity purged from registry.')
    } catch (error) {
      toast.error(error.message || 'Purge failed.')
    } finally {
      setProcessing(false)
    }
  }

  const exportUsersCsv = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/admin/users/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: search, roleFilter }),
      })
      if (!response.ok) throw new Error('Data extraction failure.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `directory_audit_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Data extraction complete.')
    } catch (error) {
      toast.error(error.message || 'Extraction failed.')
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value || ''))
      toast.success(`Copied: ${label}`)
    } catch {
      toast.error(`Copy failure.`)
    }
  }

  const filterConfig = useMemo(() => [
    {
      id: 'search',
      type: 'search',
      label: 'Search Directory',
      placeholder: 'Search name, email, or ID...',
      value: search,
    },
    {
      id: 'role',
      type: 'select',
      label: 'Role',
      value: roleFilter,
      options: [
        { label: 'All Roles', value: 'all' },
        { label: 'Student', value: 'student' },
        { label: 'Faculty', value: 'faculty' },
        { label: 'Admin', value: 'admin' },
      ],
    },
  ], [search, roleFilter])

  const handleFilterChange = (id, value) => {
    if (id === 'search') setSearch(value)
    if (id === 'role') setRoleFilter(value)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection
        title="User Management"
        subtitle="Manage academic accounts, account security, and permissions"
        noPaddingBottom
      >
        <ResponsiveFilterBar
          filters={filterConfig}
          onFilterChange={handleFilterChange}
          onReset={() => { setSearch(''); setRoleFilter('all'); }}
        >
          <div className="flex gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
              <ShieldCheck size={14} />
              Database: Connected
            </div>
            <Button
              variant="outline"
              onClick={exportUsersCsv}
              disabled={processing}
              className="h-10 px-4 rounded-lg border-border/40 font-semibold text-xs hover:bg-muted/10 transition-colors"
            >
              <Download size={14} className="mr-2" /> Export
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={processing}
              className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs shadow-sm shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <UserPlus size={14} className="mr-2" /> Add User
            </Button>
          </div>
        </ResponsiveFilterBar>
      </ContentSection>

      <PageContainer>
        <div className="space-y-8">
          {/* Summary Indicators */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Users" value={stats.total} icon={Users} color="primary" description="Registered accounts" />
            <StatCard label="Active Users" value={stats.active} icon={UserCheck} color="success" description="Verified accounts" />
            <StatCard label="Admins" value={stats.admins} icon={Settings2} color="warning" description="Administrative access" />
            <StatCard label="Faculty" value={stats.faculty} icon={ShieldCheck} color="info" description="Academic staff" />
          </div>

          <SkeletonWrapper name="admin-user-management-list" loading={loading}>
            {filteredUsers.length === 0 ? (
              <div className="py-32 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/30">
                  <Inbox size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">No users found</h3>
                  <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                    Try adjusting your search or role filters to find what you're looking for.
                  </p>
                </div>
              </div>
            ) : (
              <GridContainer columns={3}>
                {filteredUsers.map((entry) => {
                  const actionPolicy = getUserManagementActionPolicy(user, entry)
                  return (
                    <UserCard
                      key={entry.id}
                      name={entry.displayName || entry.email || 'Anonymous'}
                      email={entry.email}
                      role={entry.role}
                      status={entry.status || 'active'}
                      lastActive={formatDisplayDate(entry.updatedAt || entry.createdAt, 'Never')}
                      authProvider={entry.authProvider}
                      onToggleStatus={actionPolicy.allowSensitiveActions ? () => {
                        const nextStatus = entry.status === 'disabled' ? 'active' : 'disabled'
                        if (nextStatus === 'disabled') {
                          setStatusTarget({ user: entry, nextStatus })
                          return
                        }
                        updateUserStatus(entry, nextStatus)
                      } : null}
                      onResetPassword={actionPolicy.allowResetPassword ? () => setResetModal({ user: entry, password: '' }) : null}
                      onDelete={actionPolicy.allowSensitiveActions ? () => setDeleteTarget(entry) : null}
                    />
                  )
                })}
              </GridContainer>
            )}
          </SkeletonWrapper>

          {pendingCredentials && (
            <div className="animate-in zoom-in-95 duration-500">
              <ContentSection
                title="Credentials Generated"
                subtitle="Provide these login details to the user for their first time sign-in"
              >
                <StandardCard className="border-primary/10 bg-primary/5 p-6 max-w-2xl mx-auto shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <Key size={18} className="text-primary" />
                      <span className="text-xs font-semibold text-primary">Success: User Credentials</span>
                    </div>
                    {[
                      { label: 'Role', value: pendingCredentials.role },
                      { label: 'Email', value: pendingCredentials.email },
                      { label: 'Login ID', value: pendingCredentials.loginId },
                      { label: 'Temporary Password', value: pendingCredentials.temporaryPassword, isSecret: true },
                    ].filter(i => i.value).map(i => (
                      <div key={i.label} className="group flex items-center justify-between p-4 rounded-lg bg-background border border-border/40 hover:border-primary/20 transition-all">
                        <div className="space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground/60">{i.label}</span>
                          <p className={cn("font-mono font-bold text-sm tracking-tight", i.isSecret && "text-primary")}>{i.value}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(i.value, i.label)}
                          className="h-8 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary"
                        >
                          <Copy size={12} className="mr-2" /> Copy
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-border/10">
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed text-center italic">
                      Security Notice: These credentials will not be displayed again after you leave this page.
                    </p>
                  </div>
                </StandardCard>
              </ContentSection>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Modals */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogHeader className="p-6 border-b border-border/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <UserPlus size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Add New User</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create a new user account with specific permissions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="p-6 space-y-5">
          <div className="grid gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground ml-1">Account Role</label>
              <div className="relative">
                <select
                  className="w-full h-11 px-4 rounded-lg border border-border/40 bg-muted/5 font-medium text-xs appearance-none outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                >
                  <option value="faculty">Faculty Member</option>
                  <option value="admin">Administrator</option>
                  <option value="student">Student</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 rotate-90" size={14} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground ml-1">Full Name</label>
              <Input
                value={createForm.displayName}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                placeholder="John Doe"
                className="h-11 rounded-lg border-border/40 bg-muted/5 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground ml-1">Email Address</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="name@university.edu"
                className="h-11 rounded-lg border-border/40 bg-muted/5 text-xs"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="p-6 border-t border-border/10 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCreateOpen(false)} className="h-10 px-4 rounded-lg font-medium text-xs text-muted-foreground hover:bg-muted/10">
            Cancel
          </Button>
          <Button onClick={createUser} disabled={processing} className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs shadow-sm shadow-primary/20">
            {processing ? <RefreshCw size={14} className="animate-spin mr-2" /> : <ShieldCheck size={14} className="mr-2" />}
            {processing ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={Boolean(resetModal)} onOpenChange={(open) => !open && setResetModal(null)}>
        <DialogHeader className="p-6 border-b border-border/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
              <History size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Reset Password</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Rotate security secrets for this user account
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground ml-1">Custom Password (optional)</label>
            <Input
              value={resetModal?.password || ''}
              onChange={(e) => setResetModal({ ...resetModal, password: e.target.value })}
              placeholder="Leave blank for auto-generation"
              className="h-11 rounded-lg border-border/40 bg-muted/5 text-xs"
            />
          </div>
        </DialogBody>
        <DialogFooter className="p-6 border-t border-border/10 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setResetModal(null)} className="h-10 px-4 rounded-lg font-medium text-xs text-muted-foreground">
            Cancel
          </Button>
          <Button onClick={resetCredentials} disabled={processing} className="h-10 px-6 rounded-lg bg-amber-500 text-white font-semibold text-xs shadow-sm shadow-amber-500/20">
            {processing ? <RefreshCw size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
            {processing ? 'Updating...' : 'Set Password'}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete User Account"
        description={`Are you sure you want to delete ${deleteTarget?.displayName || deleteTarget?.email}? This action will permanently remove their access and all associated data.`}
        confirmLabel="Confirm Delete"
        confirmVariant="destructive"
        isConfirming={processing}
        onConfirm={deleteUser}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title="Suspend User Access"
        description={`This will immediately block all access for ${statusTarget?.user.displayName || statusTarget?.user.email}. They will no longer be able to log in.`}
        confirmLabel="Confirm Suspension"
        confirmVariant="destructive"
        isConfirming={processing}
        onConfirm={async () => {
          if (!statusTarget?.user) return
          await updateUserStatus(statusTarget.user, statusTarget.nextStatus)
          setStatusTarget(null)
        }}
      />
    </div>
  )
}
