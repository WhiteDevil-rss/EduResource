'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminPageWrapper, SectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { minutesToMs, msToMinutes, SESSION_SETTINGS_DEFAULTS } from '@/lib/session-settings'

function buildForm(settings) {
  return {
    inactivityMinutes: String(msToMinutes(settings.inactivityTimeout)),
    warningMinutes: String(msToMinutes(settings.warningTimeout)),
    maxSessionMinutes: String(msToMinutes(settings.maxSessionTimeout)),
  }
}

function parseForm(formState) {
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

  return {
    value: {
      inactivityTimeout: minutesToMs(inactivityMinutes),
      warningTimeout: minutesToMs(warningMinutes),
      maxSessionTimeout: minutesToMs(maxSessionMinutes),
    },
  }
}

export default function AdminSecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedSettings, setSavedSettings] = useState(SESSION_SETTINGS_DEFAULTS)
  const [formState, setFormState] = useState(buildForm(SESSION_SETTINGS_DEFAULTS))

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await fetch('/api/admin/session-settings', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load session settings.')
        }

        if (!mounted) return
        setSavedSettings(payload?.settings || SESSION_SETTINGS_DEFAULTS)
        setFormState(buildForm(payload?.settings || SESSION_SETTINGS_DEFAULTS))
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Could not load session settings.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const parsed = useMemo(() => parseForm(formState), [formState])

  const hasChanges = useMemo(() => {
    if (!parsed.value) return false
    return (
      parsed.value.inactivityTimeout !== savedSettings.inactivityTimeout ||
      parsed.value.warningTimeout !== savedSettings.warningTimeout ||
      parsed.value.maxSessionTimeout !== savedSettings.maxSessionTimeout
    )
  }, [parsed.value, savedSettings])

  const save = async () => {
    if (!parsed.value) return

    try {
      setSaving(true)
      setError('')
      const response = await fetch('/api/admin/session-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.value),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save settings.')
      }

      setSavedSettings(payload?.settings || parsed.value)
      setFormState(buildForm(payload?.settings || parsed.value))
      toast.success('Session settings updated successfully.')
    } catch (saveError) {
      setError(saveError.message || 'Could not save settings.')
      toast.error(saveError.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageWrapper
      title="Security Settings"
      description="Configure inactivity logout, warning timing, and max session duration globally."
      actions={
        <Button type="button" onClick={save} disabled={saving || !hasChanges || Boolean(parsed.error)}>
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      }
    >
      <SkeletonWrapper name="admin-security-settings" loading={loading}>
        <SectionCard title="Session Timeouts" description="Changes apply to future and refreshed sessions.">
          <div className="admin-v2-form-grid">
            <label className="student-filter-control">
              <span>Inactivity Timeout (minutes)</span>
              <Input
                type="number"
                min="2"
                value={formState.inactivityMinutes}
                onChange={(event) => setFormState((current) => ({ ...current, inactivityMinutes: event.target.value }))}
              />
            </label>
            <label className="student-filter-control">
              <span>Warning Before Logout (minutes)</span>
              <Input
                type="number"
                min="2"
                value={formState.warningMinutes}
                onChange={(event) => setFormState((current) => ({ ...current, warningMinutes: event.target.value }))}
              />
            </label>
            <label className="student-filter-control">
              <span>Max Session Duration (minutes)</span>
              <Input
                type="number"
                min="2"
                value={formState.maxSessionMinutes}
                onChange={(event) => setFormState((current) => ({ ...current, maxSessionMinutes: event.target.value }))}
              />
            </label>
          </div>

          {parsed.error ? (
            <div className="student-inline-message student-inline-message--error admin-stack-gap-top" role="alert">
              <AlertCircle size={16} />
              <span>{parsed.error}</span>
            </div>
          ) : null}

          {error ? (
            <div className="student-inline-message student-inline-message--error admin-stack-gap-top" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}
        </SectionCard>
      </SkeletonWrapper>
    </AdminPageWrapper>
  )
}
