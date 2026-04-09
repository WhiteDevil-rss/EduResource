'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Ban, ShieldOff, Shield, RefreshCcw, Search, Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/cn'
import { isProtectedAdminEmail } from '@/lib/admin-protection'

export function SecurityBlockManagement({ users = [], onChanged }) {
  const [blockedIps, setBlockedIps] = useState([])
  const [loadingIps, setLoadingIps] = useState(true)
  const [savingIp, setSavingIp] = useState(false)
  const [ipInput, setIpInput] = useState('')
  const [ipReason, setIpReason] = useState('')
  const [ipDuration, setIpDuration] = useState('permanent')
  const [userSearch, setUserSearch] = useState('')
  const [userDuration, setUserDuration] = useState('permanent')
  const [confirmState, setConfirmState] = useState(null)
  const [userSavingId, setUserSavingId] = useState('')

  const loadBlockedIps = async () => {
    setLoadingIps(true)
    try {
      const response = await fetch('/api/admin/blocked-ips', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not load blocked IPs.')
      setBlockedIps(Array.isArray(payload?.blockedIps) ? payload.blockedIps : [])
    } catch (error) {
      toast.error(error.message || 'IP retrieval failed.')
      setBlockedIps([])
    } finally {
      setLoadingIps(false)
    }
  }

  useEffect(() => {
    loadBlockedIps()
  }, [])

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    return [...users]
      .filter((entry) => {
        if (!term) return true
        return [entry.displayName, entry.email, entry.role, entry.loginId]
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
      .sort((left, right) => {
        const leftBlocked = Boolean(left.isBlocked)
        const rightBlocked = Boolean(right.isBlocked)
        if (leftBlocked !== rightBlocked) return leftBlocked ? -1 : 1
        return String(left.displayName || left.email || '').localeCompare(String(right.displayName || right.email || ''))
      })
  }, [users, userSearch])

  const submitIpBlock = async (e) => {
    e.preventDefault()
    if (!ipInput.trim()) {
      toast.error('IP address is required.')
      return
    }

    setSavingIp(true)
    try {
      const parsedDuration = ipDuration === 'permanent' ? null : Number(ipDuration)
      const response = await fetch('/api/admin/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ipInput.trim(),
          reason: ipReason.trim(),
          durationMinutes: parsedDuration,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to block IP.')

      toast.success('IP address blocked.')
      setIpInput('')
      setIpReason('')
      setIpDuration('permanent')
      await loadBlockedIps()
    } catch (error) {
      toast.error(error.message || 'Block failed.')
    } finally {
      setSavingIp(false)
    }
  }

  const submitUserToggle = async (targetUser) => {
    if (!targetUser) return
    setUserSavingId(targetUser.id)
    try {
      const endpoint = targetUser.isBlocked ? '/api/admin/unblock-user' : '/api/admin/block-user'
      const parsedDuration = userDuration === 'permanent' ? null : Number(userDuration)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          durationMinutes: targetUser.isBlocked ? null : parsedDuration,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Identity update failed.')

      toast.success(targetUser.isBlocked ? 'Access restored.' : 'Access revoked.')
      await onChanged?.()
      if (!targetUser.isBlocked) setUserDuration('permanent')
      setConfirmState(null)
    } catch (error) {
      toast.error(error.message || 'Update failed.')
    } finally {
      setUserSavingId('')
    }
  }

  const submitIpToggle = async (targetIp) => {
    if (!targetIp) return
    setSavingIp(true)
    try {
      const response = await fetch(`/api/admin/unblock-ip/${encodeURIComponent(targetIp)}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to unblock IP.')

      toast.success('IP address unblocked.')
      await loadBlockedIps()
      setConfirmState(null)
    } catch (error) {
      toast.error(error.message || 'Unblock failed.')
    } finally {
      setSavingIp(false)
    }
  }

  const blockedUsersCount = users.filter(u => u.isBlocked).length
  const activeUsersCount = users.length - blockedUsersCount

  return (
    <div className="space-y-12">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active IP Blocks"
          value={blockedIps.length}
          description="Network layer security"
          icon={Shield}
          color="primary"
        />
        <StatCard
          label="Revoked Access"
          value={blockedUsersCount}
          description="User account restrictions"
          icon={ShieldOff}
          color="destructive"
        />
        <StatCard
          label="Active Users"
          value={activeUsersCount}
          description="Authorized accounts"
          icon={ShieldCheck}
          color="success"
        />
        <StatCard
          label="Unique IPs"
          value={Array.from(new Set(users.map(u => u.lastIp))).filter(Boolean).length}
          description="Distinct access points"
          icon={Fingerprint}
          color="secondary"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <StandardCard className="p-0 overflow-hidden border-border/40 bg-background/50 backdrop-blur-sm">
          <div className="p-6 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">IP Restrictions</h3>
              <p className="text-[10px] font-medium text-muted-foreground">Manage network level access</p>
            </div>
            <button
              onClick={loadBlockedIps}
              disabled={loadingIps}
              className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCcw size={14} className={cn(loadingIps && "animate-spin")} />
            </button>
          </div>

          <div className="p-6 border-b border-border/40">
            <form className="grid gap-4" onSubmit={submitIpBlock}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground ml-1">IP Address</label>
                  <input
                    className="w-full h-10 px-4 rounded-xl border border-border/40 bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    placeholder="e.g. 192.168.1.1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground ml-1">Duration</label>
                  <select
                    className="w-full h-10 px-4 rounded-xl border border-border/40 bg-background font-medium text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                    value={ipDuration}
                    onChange={(e) => setIpDuration(e.target.value)}
                  >
                    <option value="permanent">Permanent Block</option>
                    <option value="15">15 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="240">4 Hours</option>
                    <option value="1440">24 Hours</option>
                    <option value="10080">7 Days</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground ml-1">Reason for block</label>
                <input
                  className="w-full h-10 px-4 rounded-xl border border-border/40 bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={ipReason}
                  onChange={(e) => setIpReason(e.target.value)}
                  placeholder="Reason for restriction..."
                />
              </div>
              <button
                type="submit"
                disabled={savingIp}
                className="w-full h-10 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary-strong transition-all flex items-center justify-center gap-2"
              >
                <Ban size={14} />
                {savingIp ? 'Blocking...' : 'Block IP Address'}
              </button>
            </form>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border">
            {loadingIps ? (
              <div className="py-20 text-center text-xs font-medium text-muted-foreground/40 italic">Syncing IP logs...</div>
            ) : blockedIps.length === 0 ? (
              <div className="py-20 text-center text-xs font-medium text-muted-foreground/40 italic">No blocked IP addresses</div>
            ) : (
              <div className="space-y-2">
                {blockedIps.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-xl border border-border/40 bg-muted/5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{entry.ipAddress}</span>
                        {entry.expiresAt ? (
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Temporary</span>
                        ) : (
                          <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Permanent</span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground/60 truncate">{entry.reason || 'No reason provided'}</p>
                    </div>
                    <button
                      onClick={() => setConfirmState({ kind: 'ip', mode: 'unblock', entry })}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-border/40 hover:bg-primary hover:text-white transition-all"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StandardCard>

        <StandardCard className="p-0 overflow-hidden border-border/40 bg-background/50 backdrop-blur-sm">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <h3 className="text-sm font-semibold">User Restrictions</h3>
            <p className="text-[10px] font-medium text-muted-foreground">Manage account-level access</p>
          </div>

          <div className="p-6 border-b border-border/40 space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors h-4 w-4" size={16} />
              <input
                className="w-full h-10 pl-11 pr-4 rounded-xl border border-border/40 bg-background font-medium text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name or email..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground ml-1">Default Suspension Duration</label>
              <select
                className="w-full h-10 px-4 rounded-xl border border-border/40 bg-background font-medium text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                value={userDuration}
                onChange={(e) => setUserDuration(e.target.value)}
              >
                <option value="permanent">Permanent Lock</option>
                <option value="15">15 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="240">4 Hours</option>
                <option value="1440">24 Hours</option>
                <option value="10080">7 Days</option>
              </select>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border">
            {filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-xs font-medium text-muted-foreground/40 italic">No users found</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((entry) => {
                  const protectedUser = isProtectedAdminEmail(entry.email)
                  const blocked = Boolean(entry.isBlocked)
                  return (
                    <div key={entry.id} className={cn("p-3 rounded-xl border border-border/40 transition-all flex items-center justify-between", blocked ? "bg-destructive/5" : "bg-muted/5")}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold truncate">{entry.displayName || entry.email}</span>
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight px-2 rounded border border-border/40">{entry.role || 'USER'}</span>
                        </div>
                        <p className={cn("text-[9px] font-bold", blocked ? "text-destructive" : "text-emerald-500")}>
                          {blocked ? 'Access Revoked' : 'Active Account'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {protectedUser ? (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5">
                            <ShieldCheck size={12} />
                            Protected
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmState({ kind: 'user', mode: blocked ? 'unblock' : 'block', entry })}
                            className={cn(
                              "text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all",
                              blocked ? "border-border/40 hover:bg-emerald-500 hover:text-white" : "border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                            )}
                            disabled={userSavingId === entry.id}
                          >
                            {userSavingId === entry.id ? 'Saving...' : blocked ? 'Unblock' : 'Block'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </StandardCard>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(confirmState?.mode === 'block' ? "text-destructive" : "text-primary")} size={18} />
            <span className="text-sm font-semibold">
              {confirmState?.kind === 'ip' ? 'Network Security' : 'User Access Control'}
            </span>
          </div>
        }
        description={
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to {confirmState?.mode === 'unblock' ? 'restore' : 'revoke'} access for:
            </p>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-sm font-semibold">
                {confirmState?.kind === 'ip' ? confirmState?.entry?.ipAddress : (confirmState?.entry?.displayName || confirmState?.entry?.email)}
              </span>
            </div>
            {confirmState?.mode === 'block' && (
              <p className="text-xs text-destructive/80 font-medium">
                Warning: This action will immediately terminate all active sessions for this {confirmState?.kind === 'ip' ? 'IP address' : 'user account'}.
              </p>
            )}
          </div>
        }
        confirmLabel={confirmState?.mode === 'unblock' ? 'Restore Access' : 'Revoke Access'}
        confirmVariant={confirmState?.mode === 'unblock' ? 'outline' : 'destructive'}
        isConfirming={savingIp || Boolean(userSavingId)}
        onConfirm={() => {
          if (confirmState?.kind === 'ip') return submitIpToggle(confirmState.entry.ipAddress)
          return submitUserToggle(confirmState.entry)
        }}
      />
    </div>
  )
}
