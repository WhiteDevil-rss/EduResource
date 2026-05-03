'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PageContainer,
  ContentSection,
} from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { SecurityBlockManagement } from '@/components/SecurityBlockManagement'
import { Terminal, RefreshCcw, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'

export default function AdminIpManagementPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const loadPageData = useCallback(async () => {
    if (!user || !isAdminUser(user) || !isSuperAdmin(user)) return
    setLoading(true)
    setError('')
    try {
      const resp = await fetch('/api/admin/users', { cache: 'no-store' })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(payload?.error || 'Could not load identity data.')
      setUsers(Array.isArray(payload?.users) ? payload.users : [])
    } catch (err) {
      setError(err.message || 'IDENTITY_LINK_FAILURE')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    loadPageData()
  }, [authLoading, user, loadPageData])

  return (
    <div className="space-y-8">
      <StandardCard className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Network enforcement
            </p>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Govern IP and identity-level access boundaries.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Manage block rules and identity restrictions with clear operational feedback.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[280px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Linked Users</p>
              <p className="mt-2 text-2xl font-semibold">{users.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Shield</p>
              <p className="mt-2 text-2xl font-semibold">Active</p>
            </div>
          </div>
        </div>
      </StandardCard>

      <ContentSection
        title="Access Restrictions"
        subtitle="Manage network-level security controls and identity access protocols"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
            <Shield size={12} />
            Network Shield Active
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <SkeletonWrapper name="admin-ip-management" loading={loading}>
          {error ? (
            <div className="max-w-2xl mx-auto p-12 rounded-2xl border border-border/40 bg-muted/5 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                <Terminal size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Sync Interrupted</h3>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <button
                onClick={loadPageData}
                className="mt-2 px-6 h-10 bg-destructive text-white font-semibold text-xs rounded-xl hover:bg-destructive/80 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={14} />
                Retry Connection
              </button>
            </div>
          ) : (
            <SecurityBlockManagement users={users} onChanged={loadPageData} />
          )}
        </SkeletonWrapper>
      </PageContainer>
    </div>
  )
}
