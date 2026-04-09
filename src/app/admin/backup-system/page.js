'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { Database } from 'lucide-react'
import { PageContainer, ContentSection } from '@/components/layout'
import { BackupSystemSection } from '@/components/ExportBackupSection'

export default function BackupSystemPage() {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection 
        title="System Backups" 
        subtitle="Manage system data snapshots and monitor platform redundancy"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider">
            <Database size={14} />
            Status: Protected
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <BackupSystemSection />
      </PageContainer>
    </div>
  )
}
