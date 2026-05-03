'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import {
  PageContainer,
  ContentSection,
} from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { minutesToMs, msToMinutes, SESSION_SETTINGS_DEFAULTS } from '@/lib/session-settings'
import { Shield, Clock, AlertTriangle, RefreshCcw, Lock, Zap, Construction, UserPlus, X } from 'lucide-react'

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
    return { error: 'TIMEOUT_NUMERIC_REQUIRED' }
  }

  if (inactivityMinutes <= 1 || warningMinutes <= 1 || maxSessionMinutes <= 1) {
    return { error: 'TIMEOUT_MINIMUM_BOUNDARY' }
  }

  if (warningMinutes >= inactivityMinutes) {
    return { error: 'WARNING_TIMEOUT_EXCEEDS_INACTIVITY' }
  }

  if (maxSessionMinutes < inactivityMinutes) {
    return { error: 'SESSION_DURATION_THRESHOLD_ERROR' }
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
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedSettings, setSavedSettings] = useState(SESSION_SETTINGS_DEFAULTS)
  const [formState, setFormState] = useState(buildForm(SESSION_SETTINGS_DEFAULTS))

  // Maintenance Mode State
  const [maintenanceConfig, setMaintenanceConfig] = useState({ enabled: false, whitelist: [] })
  const [originalMaintenanceConfig, setOriginalMaintenanceConfig] = useState({ enabled: false, whitelist: [] })
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('')
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdminUser(user)) {
      router.replace('/login?reason=unauthorized')
      return
    }
    if (!isSuperAdmin(user)) {
      router.replace('/admin/dashboard')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user || !isAdminUser(user) || !isSuperAdmin(user)) return
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/api/admin/session-settings', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Could not load session settings.')
        if (!mounted) return
        setSavedSettings(payload?.settings || SESSION_SETTINGS_DEFAULTS)
        setFormState(buildForm(payload?.settings || SESSION_SETTINGS_DEFAULTS))
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to sync settings.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()

    const loadMaintenance = async () => {
      try {
        const response = await fetch('/api/admin/maintenance', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (response.ok) {
          setMaintenanceConfig(payload)
          setOriginalMaintenanceConfig(payload)
        }
      } catch (err) {
        console.error('Failed to load maintenance config:', err)
      } finally {
        setMaintenanceLoading(false)
      }
    }
    loadMaintenance()

    return () => { mounted = false }
  }, [authLoading, user])

  const parsed = useMemo(() => parseForm(formState), [formState])

  const hasChanges = useMemo(() => {
    const maintenanceChanged = 
      maintenanceConfig.enabled !== originalMaintenanceConfig.enabled ||
      JSON.stringify(maintenanceConfig.whitelist) !== JSON.stringify(originalMaintenanceConfig.whitelist)

    if (!parsed.value) return maintenanceChanged
    return (
      maintenanceChanged ||
      parsed.value.inactivityTimeout !== savedSettings.inactivityTimeout ||
      parsed.value.warningTimeout !== savedSettings.warningTimeout ||
      parsed.value.maxSessionTimeout !== savedSettings.maxSessionTimeout
    )
  }, [parsed.value, savedSettings, maintenanceConfig, originalMaintenanceConfig])

  const save = async () => {
    setSaving(true)
    setError('')
    
    try {
      // 1. Save Session Settings if changed
      const sessionChanged = parsed.value && (
        parsed.value.inactivityTimeout !== savedSettings.inactivityTimeout ||
        parsed.value.warningTimeout !== savedSettings.warningTimeout ||
        parsed.value.maxSessionTimeout !== savedSettings.maxSessionTimeout
      )

      if (sessionChanged) {
        const response = await fetch('/api/admin/session-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.value),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Could not save session settings.')
        setSavedSettings(payload?.settings || parsed.value)
        setFormState(buildForm(payload?.settings || parsed.value))
      }

      // 2. Save Maintenance Settings if changed
      const maintenanceChanged = 
        maintenanceConfig.enabled !== originalMaintenanceConfig.enabled ||
        JSON.stringify(maintenanceConfig.whitelist) !== JSON.stringify(originalMaintenanceConfig.whitelist)

      if (maintenanceChanged) {
        const response = await fetch('/api/admin/maintenance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maintenanceConfig),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Could not save maintenance settings.')
        setMaintenanceConfig(payload.config)
        setOriginalMaintenanceConfig(payload.config)
      }

      toast.success('Security settings updated.')
    } catch (saveError) {
      setError(saveError.message || 'Update failed.')
      toast.error('Failed to update security settings.')
    } finally {
      setSaving(false)
    }
  }

  const addToWhitelist = () => {
    const email = newWhitelistEmail.trim().toLowerCase()
    if (!email) return
    if (maintenanceConfig.whitelist.includes(email)) {
      toast.error('Email already in whitelist.')
      return
    }
    setMaintenanceConfig(prev => ({
      ...prev,
      whitelist: [...prev.whitelist, email]
    }))
    setNewWhitelistEmail('')
  }

  const removeFromWhitelist = (email) => {
    setMaintenanceConfig(prev => ({
      ...prev,
      whitelist: prev.whitelist.filter(e => e !== email)
    }))
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <StandardCard className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Security governance
            </p>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Define secure session behavior across the entire platform.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Configure inactivity, warning, and max-session policy values with guardrails to keep all roles secure.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[260px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Inactivity</p>
              <p className="mt-2 text-2xl font-semibold">{formState.inactivityMinutes || '0'}m</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Max Session</p>
              <p className="mt-2 text-2xl font-semibold">{formState.maxSessionMinutes || '0'}m</p>
            </div>
          </div>
        </div>
      </StandardCard>

      <ContentSection
        title="Security Settings"
        subtitle="Adjust timeout policy and apply session controls globally"
        noPaddingBottom
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={save}
            disabled={saving || !hasChanges || Boolean(parsed.error)}
            className="flex items-center justify-center gap-2 px-8 h-12 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:grayscale shadow-md shadow-primary/20"
          >
            {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Shield size={14} />}
            {saving ? 'Updating...' : 'Save security settings'}
          </button>
        </div>
      </ContentSection>

      <PageContainer>
        <SkeletonWrapper name="admin-security-settings" loading={loading}>
          <div className="max-w-5xl space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <StandardCard className="p-0 overflow-hidden border-border/40 bg-card/40">
                <div className="px-6 py-5 border-b border-border/10 bg-muted/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/5 flex items-center justify-center text-primary">
                    <Clock size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Session Management</h3>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mt-0.5">Timeouts & duration</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">
                        Inactivity Timeout (Minutes)
                      </label>
                      <div className="group relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" size={16} />
                        <input
                          type="number"
                          min="2"
                          className="w-full h-11 pl-12 pr-4 rounded-lg border border-border/40 bg-background/50 text-xs font-medium transition-all focus:ring-2 focus:ring-primary/10 focus:border-primary/20 outline-none"
                          value={formState.inactivityMinutes}
                          onChange={(e) => setFormState(c => ({ ...c, inactivityMinutes: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">
                        Warning Grace Period (Minutes)
                      </label>
                      <div className="group relative">
                        <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-amber-500 transition-colors" size={16} />
                        <input
                          type="number"
                          min="2"
                          className="w-full h-11 pl-12 pr-4 rounded-lg border border-border/40 bg-background/50 text-xs font-medium transition-all focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500/20 outline-none"
                          value={formState.warningMinutes}
                          onChange={(e) => setFormState(c => ({ ...c, warningMinutes: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">
                        Max Session Duration (Minutes)
                      </label>
                      <div className="group relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-destructive transition-colors" size={16} />
                        <input
                          type="number"
                          min="2"
                          className="w-full h-11 pl-12 pr-4 rounded-lg border border-border/40 bg-background/50 text-xs font-medium transition-all focus:ring-2 focus:ring-destructive/10 focus:border-destructive/20 outline-none"
                          value={formState.maxSessionMinutes}
                          onChange={(e) => setFormState(c => ({ ...c, maxSessionMinutes: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {(parsed.error || error) && (
                    <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/10 flex items-center gap-3 text-destructive animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle size={18} />
                      <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
                        Validation error: {parsed.error || error}
                      </p>
                    </div>
                  )}
                </div>
              </StandardCard>

              {/* Maintenance Mode Card */}
              <StandardCard className="p-0 overflow-hidden border-border/40 bg-card/40">
                <div className="px-6 py-5 border-b border-border/10 bg-muted/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/5 flex items-center justify-center text-amber-500">
                      <Construction size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Maintenance Mode</h3>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mt-0.5">Platform Accessibility</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setMaintenanceConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      maintenanceConfig.enabled ? 'bg-amber-500' : 'bg-muted'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        maintenanceConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">
                        User Whitelist (Email)
                      </label>
                      <div className="flex gap-2">
                        <div className="group relative flex-1">
                          <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" size={16} />
                          <input
                            type="email"
                            placeholder="user@example.com"
                            className="w-full h-11 pl-12 pr-4 rounded-lg border border-border/40 bg-background/50 text-xs font-medium transition-all focus:ring-2 focus:ring-primary/10 focus:border-primary/20 outline-none"
                            value={newWhitelistEmail}
                            onChange={(e) => setNewWhitelistEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
                          />
                        </div>
                        <button
                          onClick={addToWhitelist}
                          className="px-4 bg-primary text-white text-[10px] font-bold uppercase rounded-lg hover:opacity-90"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                      {maintenanceConfig.whitelist.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/5 rounded-lg border border-dashed border-border/40">
                          No users whitelisted. Only Superadmin has access during maintenance.
                        </p>
                      ) : (
                        maintenanceConfig.whitelist.map((email) => (
                          <div key={email} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/10 group hover:border-primary/20 transition-all">
                            <span className="text-[11px] font-medium text-foreground">{email}</span>
                            <button 
                              onClick={() => removeFromWhitelist(email)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-600">
                    <p className="text-[9px] font-semibold uppercase tracking-wider leading-relaxed">
                      Important: When enabled, everyone except you and whitelisted users will be redirected to the maintenance page.
                    </p>
                  </div>
                </div>
              </StandardCard>

              <div className="space-y-6">
                <StandardCard className="bg-primary/5 border-primary/20 border-dashed">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                      <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-semibold text-primary">Security Notice</h4>
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed italic">
                        Session policies defined here affect global access for all users. Changes are applied in real-time and may require users to re-authenticate on their next interaction.
                      </p>
                    </div>
                  </div>
                </StandardCard>

                <div className="grid gap-4">
                  <div className="p-4 rounded-xl border border-border/10 bg-muted/10 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight">Security Protocol</p>
                    <p className="text-xs font-semibold text-foreground">Next-Gen Auth v4.2</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/10 bg-muted/10 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight">Access Status</p>
                    <p className="text-xs font-semibold text-emerald-600">Active & Enforced</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/10 bg-muted/10 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight">Last Update</p>
                    <p className="text-xs font-semibold text-foreground">April 8, 2026</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border/10 bg-muted/5 flex items-start gap-4">
              <Shield size={18} className="text-muted-foreground/40 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed">
                Security compliance: All modifications to platform session durations are logged in the audit trail. Unauthorized or excessive session durations may be flagged during regular security audits.
              </p>
            </div>
          </div>
        </SkeletonWrapper>
      </PageContainer>
    </div>
  )
}
