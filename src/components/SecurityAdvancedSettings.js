'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const DEFAULTS = {
  enable2FA: false,
  twoFAMethod: 'email',
  maxLoginAttempts: 5,
  lockDurationMinutes: 15,
  enableAlerts: true,
}

export function SecurityAdvancedSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const weakConfigWarning = useMemo(() => {
    if (settings.maxLoginAttempts > 8) {
      return 'High login attempt threshold may weaken brute-force protection.'
    }

    if (!settings.enable2FA) {
      return '2FA is disabled. Consider enabling it for stronger account protection.'
    }

    return ''
  }, [settings.enable2FA, settings.maxLoginAttempts])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await fetch('/api/admin/security-controls', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load advanced security settings.')
        }

        if (!mounted) return
        setSettings((current) => ({ ...current, ...(payload?.settings || {}) }))
      } catch (error) {
        toast.error(error.message || 'Could not load advanced security settings.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/security-controls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save advanced security settings.')
      }

      setSettings((current) => ({ ...current, ...(payload?.settings || {}) }))
      toast.success('Advanced security settings saved.')
    } catch (error) {
      toast.error(error.message || 'Could not save advanced security settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Security Controls</CardTitle>
        <CardDescription>
          Configure global 2FA, brute-force protection, and suspicious activity alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="student-request-form" style={{ gap: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(settings.enable2FA)}
              onChange={(event) => setSettings((current) => ({ ...current, enable2FA: event.target.checked }))}
              disabled={loading || saving}
            />
            <span>Enable Global 2FA</span>
          </label>

          <label>
            <span>2FA Method</span>
            <select
              className="ui-input"
              value={settings.twoFAMethod}
              onChange={(event) => setSettings((current) => ({ ...current, twoFAMethod: event.target.value }))}
              disabled={loading || saving || !settings.enable2FA}
            >
              <option value="email">OTP via Email</option>
              <option value="authenticator">Authenticator App</option>
            </select>
          </label>

          <label>
            <span>Max Login Attempts</span>
            <Input
              type="number"
              min="3"
              max="12"
              value={settings.maxLoginAttempts}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  maxLoginAttempts: Number(event.target.value || 0),
                }))
              }
              disabled={loading || saving}
            />
          </label>

          <label>
            <span>Lock Duration (minutes)</span>
            <Input
              type="number"
              min="5"
              max="120"
              value={settings.lockDurationMinutes}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  lockDurationMinutes: Number(event.target.value || 0),
                }))
              }
              disabled={loading || saving}
            />
          </label>

          <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(settings.enableAlerts)}
              onChange={(event) => setSettings((current) => ({ ...current, enableAlerts: event.target.checked }))}
              disabled={loading || saving}
            />
            <span>Enable Suspicious Activity Alerts</span>
          </label>
        </div>

        {weakConfigWarning ? (
          <div className="student-inline-message" style={{ marginTop: '1rem' }}>
            <AlertCircle size={16} />
            <span>{weakConfigWarning}</span>
          </div>
        ) : null}

        <div className="student-filter-actions" style={{ marginTop: '1rem' }}>
          <Button type="button" onClick={save} disabled={loading || saving}>
            <Shield size={14} />
            {saving ? 'Saving...' : 'Save Security Controls'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
