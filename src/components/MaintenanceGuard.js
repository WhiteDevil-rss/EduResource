'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

/**
 * MaintenanceGuard
 * Client-side component that checks if the site is in maintenance mode.
 * Superadmin and whitelisted users can bypass.
 */
export default function MaintenanceGuard({ children }) {
  const { loading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [maintenance, setMaintenance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Don't guard the maintenance page or API routes
    if (pathname === '/maintenance' || pathname.startsWith('/api/')) {
      setLoading(false)
      return
    }

    let mounted = true
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/system/maintenance', { cache: 'no-store' })
        const data = await response.json()
        
        if (mounted) {
          setMaintenance(data)
          
          // If maintenance is enabled and user is NOT allowed, redirect to /maintenance
          if (data.enabled && !data.isAllowed) {
            router.push('/maintenance')
          }
        }
      } catch (error) {
        console.error('Failed to check maintenance status:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkMaintenance()
    return () => { mounted = false }
  }, [pathname, router])

  // While checking maintenance status, we can show a minimal loader or just render nothing
  if (loading || authLoading) {
    // Check if we're on a public page, maybe allow rendering? 
    // No, for security we wait.
    return null 
  }

  // If maintenance is enabled and NOT allowed, don't render children (redirect is happening)
  if (maintenance?.enabled && !maintenance?.isAllowed && pathname !== '/maintenance') {
    return null
  }

  return <>{children}</>
}
