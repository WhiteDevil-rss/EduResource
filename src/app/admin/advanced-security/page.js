'use client'

import { SecurityAdvancedSettings } from '@/components/SecurityAdvancedSettings'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'

export default function AdvancedSecurityPage() {
  return (
    <AdminPageWrapper
      title="Advanced Security Controls"
      description="Configure global 2FA, brute-force protection, and suspicious activity alerts."
    >
      <SecurityAdvancedSettings />
    </AdminPageWrapper>
  )
}
