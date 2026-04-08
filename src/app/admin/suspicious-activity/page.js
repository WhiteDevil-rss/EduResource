'use client'

import { SuspiciousActivityPanel } from '@/components/SuspiciousActivityPanel'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'

export default function SuspiciousActivityPage() {
  return (
    <AdminPageWrapper
      title="Suspicious Activity"
      description="Monitor abnormal sign-ins, unauthorized attempts, unusual locations, and high-risk behavior."
    >
      <SuspiciousActivityPanel />
    </AdminPageWrapper>
  )
}
