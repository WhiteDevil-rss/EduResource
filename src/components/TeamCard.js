'use client'

import Image from 'next/image'
import { useMemo, useState, useEffect } from 'react'
import { Github, Globe, Instagram, Linkedin, Mail, MessageCircle, Youtube } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { TEAM_FALLBACK_IMAGE } from '@/lib/team'

const SOCIALS = [
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'github', label: 'GitHub', icon: Github },
  { key: 'website', label: 'Website', icon: Globe },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'email', label: 'Email', icon: Mail, isMail: true },
]

export default function TeamCard({ name, role, image, bio, socials = {} }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [imageSrc, setImageSrc] = useState(image || TEAM_FALLBACK_IMAGE)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  const socialLinks = useMemo(
    () =>
      SOCIALS.filter((entry) => socials?.[entry.key]).map((entry) => ({
        ...entry,
        href: entry.isMail ? `mailto:${socials[entry.key]}` : socials[entry.key],
      })),
    [socials]
  )

  const handleMouseEnter = () => {
    if (!isMobile) {
      setFlipped(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isMobile) {
      setFlipped(false)
    }
  }

  return (
    <Card className="team-card">
      <CardContent className="team-card__content">
        <div
          className="team-card__flip-shell"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            if (!isMobile) return
            setFlipped((current) => !current)
          }}
          tabIndex={0}
          role="button"
          aria-pressed={flipped}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setFlipped((current) => !current)
            }
          }}
        >
          <div className={cn('team-card__flip-inner', flipped && 'team-card__flip-inner--flipped')}>
            <article className="team-card__face team-card__face--front">
              <div className="team-card__media">
                {!isLoaded ? <div className="team-card__image-skeleton" aria-hidden="true" /> : null}
                <Image
                  src={imageSrc}
                  alt={name}
                  className={`team-card__image ${isLoaded ? 'team-card__image--visible' : ''}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 25vw"
                  onLoad={() => setIsLoaded(true)}
                  onError={() => {
                    setImageSrc(TEAM_FALLBACK_IMAGE)
                    setIsLoaded(true)
                  }}
                />
              </div>

              <div className="team-card__body">
                <p className="team-card__eyebrow">Core Team</p>
                <h3 className="team-card__name">{name}</h3>
                <p className="team-card__role">{role}</p>
              </div>
            </article>

            <article className="team-card__face team-card__face--back">
              <div className="team-card__back-content">
                <p className="team-card__eyebrow">About</p>
                <h3 className="team-card__name">{name}</h3>
                <p className="team-card__role">{role}</p>
                <p className="team-card__bio team-card__bio--full">{bio}</p>
              </div>
            </article>
          </div>
        </div>

        <div className="team-card__extension" aria-label={`${name} social links`}>
          <div className="team-card__socials team-card__socials--fixed">
            {socialLinks.map((entry) => {
              const Icon = entry.icon
              return (
                <a
                  key={entry.key}
                  href={entry.href}
                  target={entry.isMail ? undefined : '_blank'}
                  rel={entry.isMail ? undefined : 'noopener noreferrer'}
                  aria-label={entry.label}
                  title={entry.label}
                  className="team-card__social-link"
                >
                  <Icon size={16} />
                </a>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
