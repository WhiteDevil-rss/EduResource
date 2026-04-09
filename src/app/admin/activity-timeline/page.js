'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { PageContainer, ContentSection } from '@/components/layout'
import { History } from 'lucide-react'

export default function ActivityTimelinePage() {
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
        title="Activity Timeline" 
        subtitle="Review and track platform activity, user interactions, and system events"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
            <History size={12} />
            Live Feed
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <ActivityTimeline />
      </PageContainer>
    </div>
  )
}
