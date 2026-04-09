'use client'

import Image from 'next/image'
import { useMemo, useState, useEffect } from 'react'
import { Github, Globe, Instagram, Linkedin, Mail, MessageCircle, Youtube, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  const [canHover, setCanHover] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const syncHoverCapability = () => {
      setCanHover(media.matches)
    }

    syncHoverCapability()
    media.addEventListener('change', syncHoverCapability)

    return () => {
      media.removeEventListener('change', syncHoverCapability)
    }
  }, [])

  useEffect(() => {
    setImageSrc(image || TEAM_FALLBACK_IMAGE)
    setIsLoaded(false)
  }, [image])

  const socialLinks = useMemo(
    () =>
      SOCIALS.filter((entry) => socials?.[entry.key]).map((entry) => ({
        ...entry,
        href: entry.isMail ? `mailto:${socials[entry.key]}` : socials[entry.key],
      })),
    [socials]
  )

  const handleMouseEnter = () => {
    if (canHover) setFlipped(true)
  }

  const handleMouseLeave = () => {
    if (canHover) setFlipped(false)
  }

  return (
    <Card className="group relative h-full bg-card border-border/40 overflow-hidden rounded-[2rem] hover:shadow-2xl hover:shadow-primary/10 transition-shadow">
      <CardContent className="p-0 h-full flex flex-col">
        <div
          className="relative h-[380px] w-full [perspective:1000px] cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            if (canHover) return
            setFlipped((current) => !current)
          }}
          tabIndex={0}
          role="button"
          aria-pressed={flipped}
          aria-label={`Flip card for ${name} details`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setFlipped((current) => !current)
            }
          }}
        >
          {/* Flip Container */}
          <div 
            className={cn(
              "relative w-full h-full transition-all duration-700 [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]"
            )}
          >
            {/* Front Face */}
            <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
              <div className="relative w-full h-full overflow-hidden">
                {!isLoaded && (
                  <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                <Image
                  src={imageSrc}
                  alt={name}
                  className={cn(
                    "object-cover transition-all duration-500 scale-100 group-hover:scale-105",
                    isLoaded ? "opacity-100" : "opacity-0"
                  )}
                  fill
                  sizes="(max-width: 900px) 95vw, 25vw"
                  onLoad={() => setIsLoaded(true)}
                  onError={() => {
                    setImageSrc(TEAM_FALLBACK_IMAGE)
                    setIsLoaded(true)
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Core Team</p>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{role}</p>
                </div>
              </div>
            </div>

            {/* Back Face */}
            <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-muted/30">
              <div className="p-8 h-full flex flex-col justify-center space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">About</p>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{role}</p>
                </div>
                <div className="h-px w-12 bg-primary/30" />
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-8">
                  {bio}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Bar (Always visible at bottom) */}
        <div className="p-4 border-t border-border/20 bg-muted/20 mt-auto">
          <div className="flex items-center justify-center gap-2 flex-nowrap overflow-hidden">
            {socialLinks.map((entry) => {
              const Icon = entry.icon
              return (
                <Button
                  key={entry.key}
                  variant="secondary"
                  size="icon"
                  asChild
                  className="w-8 h-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all"
                >
                  <a
                    href={entry.href}
                    target={entry.isMail ? undefined : '_blank'}
                    rel={entry.isMail ? undefined : 'noopener noreferrer'}
                    aria-label={entry.label}
                    title={entry.label}
                  >
                    <Icon size={14} />
                  </a>
                </Button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
