'use client'

import Link from 'next/link'
import { Menu, Moon, Globe, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function PublicHeader({
  brand = 'SPS EDUCATIONAM',
  links = [],
  actions = [],
  showUtilityIcons = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <nav
      className={menuOpen ? 'public-nav public-nav--menu-open' : 'public-nav'}
      aria-label="Primary navigation"
    >
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
              aria-current={action.current ? 'page' : undefined}
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
        <div className="public-nav__mobile-panel" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
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
                  aria-current={action.current ? 'page' : undefined}
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
