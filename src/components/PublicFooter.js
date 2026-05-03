'use client'

import Link from 'next/link'
import { Globe, Camera, YouTube, Mail, ShieldCheck, ChevronRight, MapPin, Phone, MessageCircle as WhatsAppIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const COMPANY_SOCIALS = [
  {
    label: 'Website',
    href: 'https://www.zembaa.com',
    icon: Globe,
    external: true,
  },
  {
    label: 'WhatsApp',
    href: 'https://whatsapp.com/channel/0029VbC36593bbV5xSG6gE1W',
    icon: WhatsAppIcon,
    external: true,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/spseducationam.surat',
    icon: Camera,
    external: true,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@spseducationam',
    icon: YouTube,
    external: true,
  },
]

export default function PublicFooter({
  links = [],
  tagline = `© ${new Date().getFullYear()} SPS EDUCATIONAM. All rights reserved.`,
}) {
  return (
    <footer className="relative w-full overflow-hidden border-t border-border/40 bg-card/30 backdrop-blur-sm">
      {/* Subtle background decoration */}
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-transform group-hover:rotate-3">
                <ShieldCheck className="text-primary-foreground" size={22} />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                SPS <span className="text-primary">EDUCATIONAM</span>
              </span>
            </Link>
            <p className="text-sm leading-6 text-muted-foreground max-w-xs">
              Pioneering the next generation of academic excellence through verified resource accessibility and expert coaching.
            </p>
            <div className="flex gap-x-3">
              {COMPANY_SOCIALS.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.label}
                    variant="outline"
                    size="icon"
                    asChild
                    className="h-10 w-10 rounded-full border-border/40 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                  >
                    <a
                      href={item.href}
                      aria-label={item.label}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                    >
                      <Icon size={18} />
                    </a>
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold leading-6 text-foreground uppercase tracking-widest">Platform</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors flex items-center group">
                        <ChevronRight size={14} className="mr-1 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/#team" className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors flex items-center group">
                      <ChevronRight size={14} className="mr-1 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      About Us
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold leading-6 text-foreground uppercase tracking-widest">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="/privacy-policy" className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms-of-service" className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/academic-integrity" className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors">
                      Academic Integrity
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-1 md:gap-8">
              <div>
                <h3 className="text-sm font-bold leading-6 text-foreground uppercase tracking-widest">Contact</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li className="flex gap-x-3">
                    <MapPin className="h-5 w-5 flex-none text-primary" aria-hidden="true" />
                    <span className="text-sm leading-6 text-muted-foreground">
                      Zembaa Solution
                    </span>
                  </li>
                  <li className="flex gap-x-3">
                    <Mail className="h-5 w-5 flex-none text-primary" aria-hidden="true" />
                    <span className="text-sm leading-6 text-muted-foreground">
                      <a href="mailto:info@zembaa.com" className="hover:text-primary transition-colors">info@zembaa.com</a>
                    </span>
                  </li>
                  <li className="flex gap-x-3">
                    <Phone className="h-5 w-5 flex-none text-primary" aria-hidden="true" />
                    <span className="text-sm leading-6 text-muted-foreground">
                      Available via Support Portal
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs leading-5 text-muted-foreground">
            {tagline} Designed & Developed by <a href="https://www.zembaa.com" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold hover:text-primary transition-colors">Zembaa Solution</a>.
          </p>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-primary/5 text-[10px] uppercase tracking-tighter text-primary border-primary/20">
              v0.2.8.23
            </Badge>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
              Enterprise Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Badge({ children, className, variant }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      variant === "outline" ? "ring-border" : "bg-primary/10 text-primary ring-primary/20",
      className
    )}>
      {children}
    </span>
  )
}
