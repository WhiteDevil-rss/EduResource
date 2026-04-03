import Link from 'next/link'

export default function PublicFooter({
  links = [],
  tagline = '(c) 2024 EduResource Hub. The Digital Curator.',
  compact = false,
}) {
  return (
    <footer className={`public-footer-shell ${compact ? 'public-footer-shell--compact' : ''}`}>
      <div className="public-footer">
        <div className="public-footer__brand">
          <span className="public-footer__logo">EduResource Hub</span>
          <span className="public-footer__tagline">{tagline}</span>
        </div>
        <div className="public-footer__links">
          {links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className="public-footer__link">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
