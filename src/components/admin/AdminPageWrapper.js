'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ADMIN_NAV_ITEM_MAP } from '@/components/admin/adminNav'

function buildBreadcrumbs(pathname) {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean)

  if (segments.length === 0 || segments[0] !== 'admin') {
    return []
  }

  const breadcrumbs = [{ href: '/admin/security-settings', label: 'Admin' }]
  if (segments.length === 1) {
    return breadcrumbs
  }

  const fullPath = `/${segments.join('/')}`
  const currentLabel = ADMIN_NAV_ITEM_MAP[fullPath] || segments[segments.length - 1].replace(/-/g, ' ')
  breadcrumbs.push({ href: fullPath, label: currentLabel })
  return breadcrumbs
}

export function AdminPageWrapper({ title, description, filters, children, actions }) {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumbs(pathname)

  return (
    <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      {breadcrumbs.length > 0 ? (
        <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-2">
              {index < breadcrumbs.length - 1 ? (
                <Link className="transition-colors hover:text-foreground" href={crumb.href}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 ? <span className="text-muted-foreground">/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}

      <header className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground md:text-xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      {filters ? <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">{filters}</div> : null}

      <div className="min-h-0 w-full">{children}</div>
    </section>
  )
}

export function SectionCard({ title, description, children, actions }) {
  return (
    <Card className="rounded-xl border border-border/70 bg-card shadow-sm">
      {(title || description || actions) ? (
        <CardHeader className="space-y-2 p-4 pb-0 md:p-5 md:pb-0">
          {title ? <CardTitle className="text-lg">{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className="p-4 md:p-5">{children}</CardContent>
    </Card>
  )
}
