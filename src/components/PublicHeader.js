'use client'

import Link from 'next/link'
import { Menu, Moon, Globe, X } from 'lucide-react'
import { useState } from 'react'

export default function PublicHeader({
  brand = 'SPS EDUCATIONAM',
  links = [],
  actions = [],
  showUtilityIcons = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className={menuOpen ? 'public-nav public-nav--menu-open' : 'public-nav'}>
      <div className="public-nav__inner">
        <Link href="/" className="public-nav__brand" onClick={closeMenu}>
          {brand}
        </Link>

        <div className="public-nav__links">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              aria-current={link.current ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="public-nav__actions">
          {showUtilityIcons ? (
            <>
              <span className="public-nav__icon" aria-hidden="true">
                <Moon size={18} />
              </span>
              <span className="public-nav__icon" aria-hidden="true">
                <Globe size={18} />
              </span>
            </>
          ) : null}

          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={action.variant === 'primary' ? 'button-primary' : 'button-ghost'}
            >
              {action.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="public-nav__menu-button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen ? (
        <div className="public-nav__mobile-panel">
          <div className="public-nav__mobile-links">
            {links.map((link) => (
              <Link
                key={`mobile-${link.href}-${link.label}`}
                href={link.href}
                aria-current={link.current ? 'page' : undefined}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {showUtilityIcons ? (
            <div className="public-nav__mobile-meta">
              <span className="public-nav__icon" aria-hidden="true">
                <Moon size={18} />
              </span>
              <span className="public-nav__icon" aria-hidden="true">
                <Globe size={18} />
              </span>
            </div>
          ) : null}

          {actions.length > 0 ? (
            <div className="public-nav__mobile-actions">
              {actions.map((action) => (
                <Link
                  key={`mobile-action-${action.href}-${action.label}`}
                  href={action.href}
                  className={action.variant === 'primary' ? 'button-primary button-block' : 'button-secondary button-block'}
                  onClick={closeMenu}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  )
}
