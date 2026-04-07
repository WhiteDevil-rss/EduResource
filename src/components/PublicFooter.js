import Link from 'next/link'
import { Globe, Instagram, Linkedin, Mail } from 'lucide-react'

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
  tagline = `© ${new Date().getFullYear()} SPS EDUCATIONAM | Zembaa Solution`,
  compact = false,
}) {
  return (
    <footer className={`public-footer-shell ${compact ? 'public-footer-shell--compact' : ''}`}>
      <div className="public-footer">
        <div className="public-footer__brand">
          <span className="public-footer__logo">SPS EDUCATIONAM</span>
          <p className="public-footer__tagline">{tagline}</p>
          <p className="public-footer__powered">
            Powered by{' '}
            <a href="https://www.zembaa.com" target="_blank" rel="noopener noreferrer">
              Zembaa Solution
            </a>
          </p>
        </div>
        <div className="public-footer__meta">
          <div className="public-footer__links">
            {links.map((link) => (
              <Link key={`${link.href}-${link.label}`} href={link.href} className="public-footer__link">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="public-footer__socials" aria-label="Company Socials">
            {COMPANY_SOCIALS.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="public-footer__social"
                  aria-label={item.label}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
