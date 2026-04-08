'use client'

import { ActivityTimeline } from '@/components/ActivityTimeline'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'

export default function ActivityTimelinePage() {
  return (
    <AdminPageWrapper
      title="Activity Timeline"
      description="Track user activities, logins, resource operations, and administrative actions."
    >
      <ActivityTimeline />
    </AdminPageWrapper>
  )
}
