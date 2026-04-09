'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'

function AuthLoadingState({ message = 'Verifying your secure session and preparing your dashboard...' }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-muted-foreground">
      <div className="space-y-4">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="max-w-md text-sm font-medium leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({
  children,
  allowedRoles,
  adminOnly = false,
  superAdminOnly = false,
  redirectTo = '/login',
  loadingMessage,
}) {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user || !role) {
      router.replace(redirectTo)
      return
    }

    if (adminOnly && !isAdminUser(user)) {
      router.replace(redirectTo)
      return
    }

    if (superAdminOnly && !isSuperAdmin(user)) {
      router.replace('/admin/dashboard')
      return
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(`${redirectTo}?reason=unauthorized`)
    }
  }, [adminOnly, allowedRoles, loading, redirectTo, role, router, superAdminOnly, user])

  if (loading) {
    return <AuthLoadingState message={loadingMessage} />
  }

  if (!user || !role) {
    return <AuthLoadingState message={loadingMessage} />
  }

  if (adminOnly && !isAdminUser(user)) {
    return <AuthLoadingState message={loadingMessage} />
  }

  if (superAdminOnly && !isSuperAdmin(user)) {
    return <AuthLoadingState message={loadingMessage} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <AuthLoadingState message={loadingMessage} />
  }

  return children
}

export default function AuthGuard(props) {
  return <ProtectedRoute {...props} />
}
