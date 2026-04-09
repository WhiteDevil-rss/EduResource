'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { SuspiciousActivityPanel } from '@/components/SuspiciousActivityPanel'
import { PageContainer, ContentSection } from '@/components/layout'
import { Activity } from 'lucide-react'

export default function SuspiciousActivityPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

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

  return (
    <div className="space-y-8">
      <ContentSection 
        title="Security Monitoring" 
        subtitle="Monitor real-time security events, authentication anomalies, and access trends"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <Activity size={12} />
            Live Monitoring
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <SuspiciousActivityPanel />
      </PageContainer>
    </div>
  )
}
