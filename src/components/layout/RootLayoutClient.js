'use client'

import { usePathname } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { getPublicHeaderContent } from '@/lib/public-nav'
import MaintenanceGuard from '@/components/MaintenanceGuard'

export default function RootLayoutClient({ children }) {
  const pathname = usePathname()
  
  // Define which paths should NOT have the public header/footer
  const isAppRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')
  
  const showPublicLayout = !isAppRoute

  if (!showPublicLayout) {
    return (
      <MaintenanceGuard>
        {children}
      </MaintenanceGuard>
    )
  }

  const { links, actions } = getPublicHeaderContent(pathname)

  return (
    <MaintenanceGuard>
      <div className="flex min-h-screen flex-col">
        <PublicHeader brand="SPS EDUCATIONAM" links={links} actions={actions} showUtilityIcons />
        <div className="flex-1 pt-20">
          {children}
        </div>
        <PublicFooter links={links} />
      </div>
    </MaintenanceGuard>
  )
}
