'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Ban, ShieldOff, Shield, RefreshCcw } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
import { FilterLabel } from '@/components/ui/layout'

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

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
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load blocked IPs.')
      }

      setBlockedIps(Array.isArray(payload?.blockedIps) ? payload.blockedIps : [])
    } catch (error) {
      toast.error(error.message || 'Could not load blocked IPs.')
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

  const submitIpBlock = async (event) => {
    event.preventDefault()
    if (!ipInput.trim()) {
      toast.error('Enter an IP address.')
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
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not block IP.')
      }

      toast.success('IP blocked successfully.')
      setIpInput('')
      setIpReason('')
      setIpDuration('permanent')
      await loadBlockedIps()
    } catch (error) {
      toast.error(error.message || 'Could not block IP.')
    } finally {
      setSavingIp(false)
    }
  }

  const submitUserToggle = async (targetUser) => {
    if (!targetUser) {
      return
    }

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
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update user block state.')
      }

      toast.success(targetUser.isBlocked ? 'User unblocked.' : 'User blocked.')
      await onChanged?.()
      if (!targetUser.isBlocked) {
        setUserDuration('permanent')
      }
      setConfirmState(null)
    } catch (error) {
      toast.error(error.message || 'Could not update user block state.')
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
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not unblock IP.')
      }

      toast.success('IP unblocked.')
      await loadBlockedIps()
      setConfirmState(null)
    } catch (error) {
      toast.error(error.message || 'Could not unblock IP.')
    } finally {
      setSavingIp(false)
    }
  }

  const activeUsers = filteredUsers.filter((entry) => !entry.isBlocked)
  const blockedUsers = filteredUsers.filter((entry) => entry.isBlocked)

  return (
    <div className="security-block-management">
      <Card>
        <CardHeader>
          <CardTitle className="suspicious-title">
            <Shield size={18} />
            IP Management
          </CardTitle>
          <CardDescription>Block or unblock IP addresses that should not access the platform.</CardDescription>
        </CardHeader>
        <CardContent className="security-block-management__content">
          <form className="security-block-form" onSubmit={submitIpBlock}>
            <Input
              value={ipInput}
              onChange={(event) => setIpInput(event.target.value)}
              placeholder="Enter IP address"
              aria-label="IP address"
            />
            <Input
              value={ipReason}
              onChange={(event) => setIpReason(event.target.value)}
              placeholder="Reason (optional)"
              aria-label="Reason"
            />
            <FilterLabel label="Duration" className="security-block-form__select">
              <select className="ui-input" value={ipDuration} onChange={(event) => setIpDuration(event.target.value)} aria-label="Block duration">
                <option value="permanent">Permanent</option>
                <option value="15">15 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="1440">24 hours</option>
                <option value="10080">7 days</option>
              </select>
            </FilterLabel>
            <Button type="submit" disabled={savingIp}>
              <Ban size={14} />
              {savingIp ? 'Blocking...' : ipDuration === 'permanent' ? 'Block IP' : 'Block Temporarily'}
            </Button>
          </form>

          <div className="suspicious-summary">
            <Badge variant="outline">{blockedIps.length} blocked IP(s)</Badge>
            <Button type="button" variant="outline" onClick={loadBlockedIps} disabled={loadingIps}>
              <RefreshCcw size={14} />
              Refresh
            </Button>
          </div>

          <div className="security-block-scroll">
            {loadingIps ? (
              <p className="student-muted-text">Loading blocked IPs...</p>
            ) : blockedIps.length === 0 ? (
              <p className="student-muted-text">No IPs are currently blocked.</p>
            ) : (
              blockedIps.map((entry) => (
                <div key={entry.id} className="security-block-row">
                  <div>
                    <strong>{entry.ipAddress}</strong>
                    <p>{entry.reason || 'No reason provided.'}</p>
                    <span>{formatDate(entry.blockedAt)}</span>
                    {entry.expiresAt ? <span className="security-block-row__expires">Expires {formatDate(entry.expiresAt)}</span> : <span className="security-block-row__expires">Permanent block</span>}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmState({ kind: 'ip', mode: 'unblock', entry })}
                  >
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="suspicious-title">
            <ShieldOff size={18} />
            User Blocking
          </CardTitle>
          <CardDescription>Disable or re-enable specific user accounts. Protected admin accounts are hidden from blocking.</CardDescription>
        </CardHeader>
        <CardContent className="security-block-management__content">
          <FilterLabel label="Search users">
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name, email, or role"
              aria-label="Search users"
            />
          </FilterLabel>

          <div className="suspicious-summary">
            <Badge variant="outline">{blockedUsers.length} blocked</Badge>
            <Badge variant="outline">{activeUsers.length} active</Badge>
          </div>

          <FilterLabel label="User block duration" className="security-block-form__select">
            <select className="ui-input" value={userDuration} onChange={(event) => setUserDuration(event.target.value)} aria-label="User block duration">
              <option value="permanent">Permanent</option>
              <option value="15">15 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
              <option value="1440">24 hours</option>
              <option value="10080">7 days</option>
            </select>
          </FilterLabel>

          <div className="security-block-scroll">
            {filteredUsers.length === 0 ? (
              <p className="student-muted-text">No users matched your search.</p>
            ) : (
              filteredUsers.map((entry) => {
                const protectedUser = isProtectedAdminEmail(entry.email)
                const blocked = Boolean(entry.isBlocked)
                return (
                  <div key={entry.id} className={`security-block-row ${blocked ? 'security-block-row--blocked' : ''}`}>
                    <div>
                      <strong>{entry.displayName || entry.email}</strong>
                      <p>{entry.email}</p>
                      <span>{entry.role || 'user'}</span>
                      {blocked && entry.blockedExpiresAt ? <span className="security-block-row__expires">Expires {formatDate(entry.blockedExpiresAt)}</span> : null}
                    </div>
                    <div className="security-block-row__actions">
                      {protectedUser ? (
                        <Badge variant="outline">Protected</Badge>
                      ) : (
                        <>
                          <Badge className={blocked ? 'suspicious-severity suspicious-severity--high' : 'suspicious-severity suspicious-severity--low'}>
                            {blocked ? 'Blocked' : 'Active'}
                          </Badge>
                          <Button
                            type="button"
                            variant={blocked ? 'outline' : 'destructive'}
                            onClick={() => setConfirmState({ kind: 'user', mode: blocked ? 'unblock' : 'block', entry })}
                            disabled={userSavingId === entry.id}
                          >
                            {userSavingId === entry.id ? 'Updating...' : blocked ? 'Unblock' : 'Block'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={
          confirmState?.kind === 'ip'
            ? `${confirmState.mode === 'unblock' ? 'Unblock' : 'Block'} IP`
            : `${confirmState?.mode === 'unblock' ? 'Unblock' : 'Block'} User`
        }
        description={
          confirmState?.kind === 'ip'
            ? confirmState?.entry
              ? `${confirmState.mode === 'unblock' ? 'Remove the block for' : 'Confirm block for'} IP ${confirmState.entry.ipAddress}.`
              : ''
            : confirmState?.entry
              ? `${confirmState.mode === 'unblock' ? 'Remove the block for' : 'Confirm block for'} ${confirmState.entry.displayName || confirmState.entry.email}.`
              : ''
        }
        confirmLabel={confirmState?.mode === 'unblock' ? 'Unblock' : 'Block'}
        confirmVariant={confirmState?.mode === 'unblock' ? 'outline' : 'destructive'}
        isConfirming={savingIp || Boolean(userSavingId)}
        onConfirm={() => {
          if (confirmState?.kind === 'ip') {
            return submitIpToggle(confirmState.entry.ipAddress)
          }
          return submitUserToggle(confirmState.entry)
        }}
      />
    </div>
  )
}
