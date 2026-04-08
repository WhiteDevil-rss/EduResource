'use client'

import Link from 'next/link'
import { Globe, Instagram, Linkedin, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

const COMPANY_SOCIALS = [
  {
    label: 'Website',
    href: 'https://www.zembaa.com',
    icon: Globe,
    external: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/zembaa-solution',
    icon: Linkedin,
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:info@zembaa.com',
    icon: Mail,
    external: false,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/zembaa_com/',
    icon: Instagram,
    external: true,
  },
]

export default function PublicFooter({
  links = [],
  tagline = `© ${new Date().getFullYear()} SPS EDUCATIONAM. Zembaa Solution.`,
}) {
  return (
    <footer className="w-full bg-card border-t border-border/40">
      <div className="max-w-[1400px] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="text-xl font-black tracking-tighter text-primary">
              SPS EDUCATIONAM
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Empowering academic communities through high-fidelity resource management and governance.
            </p>
            <div className="flex items-center gap-2">
              {COMPANY_SOCIALS.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.label}
                    variant="ghost"
                    size="icon"
                    asChild
                    className="w-9 h-9 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <a
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
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

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/70">Platform</h4>
            <nav className="flex flex-col gap-3">
              {links.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal / Meta */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/70">Partnership</h4>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Zembaa Solution Private Limited
              </p>
              <a
                href="mailto:info@zembaa.com"
                className="text-sm text-primary font-medium hover:underline"
              >
                info@zembaa.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 md:mt-16 pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground font-medium">
            {tagline}
          </p>
          <p className="text-xs text-muted-foreground/60">
            Precision engineered for faster learning outcomes.
          </p>
        </div>
      </div>
    </footer>
  )
}
