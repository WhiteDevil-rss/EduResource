'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  CheckCircle2,
  FileText,
  Layers3,
  Shield,
  Sparkles,
  Users,
  Zap,
  TrendingUp,
  Globe,
} from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import TeamCard from '@/components/TeamCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPublicHeaderContent } from '@/lib/public-nav'
import { TEAM_MEMBERS } from '@/lib/team'
import { cn } from '@/lib/cn'

/* ─────────────────────── Static data ─────────────────────── */

const FEATURE_CARDS = [
  {
    title: 'Search-first discovery',
    description:
      'Students move from course code to the exact note, handout, or guide in a few taps. No hunting, no friction.',
    icon: BookOpen,
    accent: 'primary',
  },
  {
    title: 'Faculty publishing flows',
    description:
      'Upload, organise, and maintain resources without wrestling the interface. Upload queues, editing, and analytics in one place.',
    icon: FileText,
    accent: 'secondary',
  },
  {
    title: 'Operational governance',
    description:
      'Admins manage requests, logs, security, and moderation from one calm, role-aware control surface.',
    icon: Shield,
    accent: 'success',
  },
]

const PLATFORM_STEPS = [
  {
    step: '01',
    eyebrow: 'Discover',
    title: 'Students get a cleaner path to learning materials',
    copy: 'Search, filters, bookmarking, and guided collections reduce the time spent hunting for resources.',
    icon: BookOpen,
  },
  {
    step: '02',
    eyebrow: 'Publish',
    title: 'Faculty gets a focused publishing workspace',
    copy: 'Upload queues, editing flows, and analytics surfaces make content management straightforward.',
    icon: TrendingUp,
  },
  {
    step: '03',
    eyebrow: 'Govern',
    title: 'Admins get visibility without clutter',
    copy: 'Security, user control, auditability, and analytics live inside a consistent admin system.',
    icon: Shield,
  },
]

const TRUST_BADGES = [
  { label: 'Role-based access', icon: Shield },
  { label: 'Real-time analytics', icon: ChartNoAxesCombined },
  { label: 'Multi-campus ready', icon: Globe },
  { label: 'Production grade', icon: Zap },
]

/* ─────────────────────── Animated counter hook ─────────────── */

function useAnimatedCounter(target, duration = 1200, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start || target === null || target === 0) return
    const startTime = window.performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }, [target, duration, start])
  return value
}

/* ─────────────────────── Intersection observer hook ─────────── */

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new window.IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ─────────────────────── Metric card ─────────────────────── */

function MetricCard({ label, value, icon: Icon, animatedValue, inView }) {
  const displayValue = typeof value === 'number'
    ? (inView ? new Intl.NumberFormat('en-US').format(animatedValue) : '0')
    : value

  return (
    <div className="rounded-2xl border border-border/60 bg-background/55 p-5 space-y-3 hover:border-primary/20 hover:bg-background/80 transition-all duration-300">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tabular-nums">{displayValue}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/* ─────────────────────── Main component ─────────────────────── */

export default function LandingPage() {
  const pathname = usePathname()
  const teamSectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [resourceCount, setResourceCount] = useState(null)
  const [teamSectionActive, setTeamSectionActive] = useState(false)

  const [heroRef] = useInView(0.1)
  const [metricsRef, metricsInView] = useInView(0.1)
  const [featuresRef, featuresInView] = useInView(0.1)
  const [stepsRef, stepsInView] = useInView(0.1)
  const [ctaRef, ctaInView] = useInView(0.15)

  const animatedCount = useAnimatedCounter(
    typeof resourceCount === 'number' ? resourceCount : 0,
    1400,
    metricsInView && resourceCount !== null
  )

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    let active = true
    const loadResourceCount = async () => {
      try {
        const response = await fetch('/api/public/resource-count', {
          cache: 'force-cache',
          next: { revalidate: 120 },
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Could not load resource count.')
        if (active) setResourceCount(Number(payload?.publishedResourceCount || 0))
      } catch {
        if (active) setResourceCount(0)
      }
    }
    loadResourceCount()
    return () => { active = false }
  }, [])

  const handleMeetTeamScroll = useCallback(() => {
    if (!teamSectionRef.current) return
    teamSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTeamSectionActive(true)
    window.setTimeout(() => setTeamSectionActive(false), 1000)
  }, [])

  const { links: navLinks, actions: navActions } = getPublicHeaderContent(pathname)

  const metrics = [
    {
      label: 'Published resources',
      value: resourceCount,
      icon: Layers3,
    },
    { label: 'Protected roles', value: '3', icon: Shield },
    { label: 'Core workflows', value: 'Student · Faculty · Admin', icon: Users },
    { label: 'Platform view', value: 'Realtime ops', icon: ChartNoAxesCombined },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-foreground">
      <PublicHeader brand="SPS EDUCATIONAM" links={navLinks} actions={navActions} showUtilityIcons />

      <main className="overflow-x-hidden">

        {/* ── HERO ─────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-20 pt-10 md:pb-28 md:pt-14" ref={heroRef}>
          {/* Multi-layer background mesh */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.22),transparent_32%),radial-gradient(ellipse_at_80%_15%,rgba(45,212,191,0.16),transparent_28%),radial-gradient(ellipse_at_50%_85%,rgba(168,85,247,0.14),transparent_32%)] dark:bg-[radial-gradient(ellipse_at_20%_20%,rgba(129,140,248,0.26),transparent_30%),radial-gradient(ellipse_at_80%_15%,rgba(45,212,191,0.18),transparent_26%),radial-gradient(ellipse_at_50%_85%,rgba(168,85,247,0.2),transparent_30%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.6),transparent_60%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.2),transparent_60%)]" />
          </div>

          <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-center">
            {/* Left: Hero copy */}
            <div
              className={cn(
                'space-y-8 transition-all duration-700',
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-primary/25 bg-card/75 text-accent-foreground gap-1.5 rounded-full px-3 py-1">
                  <Sparkles size={13} />
                  Resource operations for modern campuses
                </Badge>
                {TRUST_BADGES.map((b) => {
                  const Icon = b.icon
                  return (
                    <span key={b.label} className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                      <Icon size={11} />
                      {b.label}
                    </span>
                  )
                })}
              </div>

              <div className="max-w-3xl space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  SPS EDUCATIONAM
                </p>
                <h1 className="text-balance text-4xl font-semibold leading-[1.12] md:text-6xl">
                  One cohesive academic platform for{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    discovery, publishing, and governance.
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  The interface is designed like a product workspace, not a collection of screens:
                  cleaner hierarchy, softer surfaces, faster navigation, and role-based control that
                  feels production-ready.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full px-7 text-sm font-semibold shadow-lg shadow-primary/20">
                  <Link href="/register">
                    Create account
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full px-7 text-sm font-semibold border-border/70 hover:border-primary/30">
                  <Link href="/login">Open workspace</Link>
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 rounded-full px-7 text-sm font-semibold"
                  onClick={handleMeetTeamScroll}
                >
                  Meet the team
                </Button>
              </div>
            </div>

            {/* Right: Product snapshot panel */}
            <div
              className={cn(
                'surface-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8 transition-all duration-700 delay-150',
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              )}
              ref={metricsRef}
            >
              {/* Decorative top line */}
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Product Snapshot
                  </p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Designed for the three workflows that matter most
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {metrics.map((metric, i) => (
                    <MetricCard
                      key={metric.label}
                      {...metric}
                      animatedValue={i === 0 ? animatedCount : 0}
                      inView={metricsInView}
                    />
                  ))}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold">Latest redesign system</h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Shared shell components, semantic tokens, accessible controls, mobile-first
                        layouts, and Boneyard-powered loading states now drive the experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────── */}
        <section id="features" className="px-4 py-20 md:py-28" ref={featuresRef}>
          <div className="mx-auto max-w-[1400px] space-y-12">
            <div
              className={cn(
                'max-w-2xl space-y-4 transition-all duration-700',
                featuresInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              )}
            >
              <Badge variant="outline" className="border-primary/20 text-accent-foreground rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
                Feature system
              </Badge>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                A cleaner product language across every role.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                The redesign uses standardised cards, colour semantics, compact typography, and
                stronger spacing so every dashboard feels like part of the same application.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {FEATURE_CARDS.map((feature, index) => {
                const Icon = feature.icon
                const accentClasses = {
                  primary: 'border-primary/15 bg-primary/8 text-primary',
                  secondary: 'border-secondary/15 bg-secondary/8 text-secondary',
                  success: 'border-success/15 bg-success/8 text-success',
                }
                const topAccent = {
                  primary: 'via-primary/40',
                  secondary: 'via-secondary/40',
                  success: 'via-success/40',
                }
                return (
                  <article
                    key={feature.title}
                    className={cn(
                      'surface-panel group relative overflow-hidden rounded-[1.75rem] p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl',
                      featuresInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                    )}
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    {/* Top accent line */}
                    <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', topAccent[feature.accent])} />

                    <div className={cn('mb-6 flex size-13 items-center justify-center rounded-2xl border', accentClasses[feature.accent])}>
                      <Icon size={22} />
                    </div>
                    <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-200">{feature.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── PLATFORM FLOW ──────────────────────────── */}
        <section className="px-4 py-20 md:py-28" ref={stepsRef}>
          <div className="mx-auto max-w-[1400px]">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              {/* Left sticky header */}
              <div
                className={cn(
                  'surface-panel rounded-[2rem] p-8 lg:sticky lg:top-28 transition-all duration-700',
                  stepsInView ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'
                )}
              >
                <Badge variant="outline" className="border-primary/20 text-accent-foreground rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase mb-4">
                  Platform flow
                </Badge>
                <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                  Each panel now has one job and a clearer working surface.
                </h2>
                <p className="mt-5 text-base leading-7 text-muted-foreground">
                  Student, faculty, and admin experiences all share the same visual grammar: sticky
                  topbar, responsive sidebar, standardised cards, and more legible search and filter
                  controls.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {['Student', 'Faculty', 'Admin'].map((role) => (
                    <div key={role} className="rounded-xl bg-muted/50 border border-border/40 px-3 py-2.5 text-center">
                      <p className="text-xs font-semibold text-foreground">{role}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">panel</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: numbered steps */}
              <div className="space-y-5">
                {PLATFORM_STEPS.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className={cn(
                        'surface-panel group relative overflow-hidden rounded-[1.75rem] p-7 transition-all duration-700 hover:-translate-y-1',
                        stepsInView ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                      )}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-5">
                        <div className="shrink-0 mt-0.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/60">
                            {item.step}
                          </span>
                          <div className="mt-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15 transition-transform group-hover:scale-105">
                            <Icon size={20} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {item.eyebrow}
                          </p>
                          <h3 className="mt-1.5 text-xl font-semibold group-hover:text-primary transition-colors duration-200">
                            {item.title}
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.copy}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── TEAM ──────────────────────────────────── */}
        <section
          ref={teamSectionRef}
          className={cn(
            'px-4 py-20 transition-colors duration-700 md:py-28',
            teamSectionActive && 'bg-primary/5'
          )}
        >
          <div className="mx-auto max-w-[1400px] space-y-12">
            <div className="max-w-2xl space-y-4">
              <Badge variant="outline" className="border-primary/20 text-accent-foreground rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
                Team
              </Badge>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                The people shaping the platform experience.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Flip-card profiles give you more context on the builders behind each feature.
                Hover or tap to reveal bio and contact.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TEAM_MEMBERS.map((member, index) => (
                <div
                  key={member.name}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
                >
                  <TeamCard {...member} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────── */}
        <section className="px-4 pb-24 pt-12" ref={ctaRef}>
          <div className="mx-auto max-w-[1400px]">
            <div
              className={cn(
                'surface-panel relative overflow-hidden rounded-[2.5rem] p-8 text-center md:p-16 transition-all duration-700',
                ctaInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              )}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/12 via-transparent to-secondary/12" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
              {/* Glow orbs */}
              <div className="absolute left-1/4 top-1/4 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute right-1/4 bottom-1/4 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />

              <div className="relative">
                <Badge variant="outline" className="border-primary/25 bg-card/60 text-accent-foreground rounded-full px-4 py-1.5 text-[11px] tracking-[0.18em] uppercase">
                  Ready to launch
                </Badge>
                <h2 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
                  Start with a faster, calmer interface across the entire academic workflow.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                  The redesign brings modern SaaS UI patterns to landing, student, faculty, and admin
                  experiences — without changing the app&apos;s core workflows.
                </p>
                <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild className="h-13 rounded-full px-8 text-sm font-semibold shadow-lg shadow-primary/25">
                    <Link href="/register">Create account</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-13 rounded-full px-8 text-sm font-semibold border-border/70 hover:border-primary/30">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter links={navLinks} />
    </div>
  )
}
