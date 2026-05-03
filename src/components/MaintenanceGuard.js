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
    // Don't guard the maintenance page, API routes, or SEO files
    const isExcluded = 
      pathname === '/maintenance' || 
      pathname.startsWith('/api/') ||
      pathname === '/sitemap.xml' ||
      pathname === '/robots.txt' ||
      pathname === '/favicon.ico'

    if (isExcluded) {
      setLoading(false)
      return
    }

    let mounted = true
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/system/maintenance', { cache: 'no-store' })
        
        // Handle non-JSON or error responses gracefully
        if (!response.ok) {
          // If we're in dev, log the failure to help debugging
          if (process.env.NODE_ENV === 'development') {
            console.error(`[MaintenanceGuard] API returned ${response.status} for /api/system/maintenance`);
          }
          if (mounted) setLoading(false);
          return;
        }

        const data = await response.json().catch(() => ({}));
        
        if (mounted) {
          setMaintenance(data)
          
          // If maintenance is enabled and user is NOT allowed, redirect to /maintenance
          if (data?.enabled && !data?.isAllowed) {
            router.push('/maintenance')
          }
        }
      } catch (error) {
        // Log error in development for diagnosis
        if (process.env.NODE_ENV === 'development') {
          console.error('[MaintenanceGuard] Failed to check maintenance status:', error);
        }
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
