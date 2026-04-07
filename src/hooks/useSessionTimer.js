'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/admin-protection'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

function pad2(value) {
  return String(Math.max(0, value)).padStart(2, '0')
}

export function useSessionTimer() {
  const { user, sessionSettings, stayLoggedIn } = useAuth()
  const inactivityTimeoutSeconds = Math.max(
    1,
    Math.floor(Number(sessionSettings?.inactivityTimeout || 300000) / 1000)
  )
  const [secondsRemaining, setSecondsRemaining] = useState(inactivityTimeoutSeconds)
  const superAdminVisible = isSuperAdmin(user)

  useEffect(() => {
    setSecondsRemaining(inactivityTimeoutSeconds)
  }, [inactivityTimeoutSeconds])

  useEffect(() => {
    if (!superAdminVisible || !user?.uid) {
      return undefined
    }

    const resetTimer = () => {
      setSecondsRemaining(inactivityTimeoutSeconds)
    }

    const tick = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true })
    })

    return () => {
      window.clearInterval(tick)
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer)
      })
    }
  }, [inactivityTimeoutSeconds, superAdminVisible, user?.uid])

  const formatted = useMemo(() => {
    const minutes = Math.floor(secondsRemaining / 60)
    const seconds = secondsRemaining % 60
    return `${pad2(minutes)}:${pad2(seconds)}`
  }, [secondsRemaining])

  return {
    isVisible: Boolean(superAdminVisible && user?.uid),
    secondsRemaining,
    formatted,
    isWarning: secondsRemaining <= 60,
    onExtendSession: () => stayLoggedIn?.(),
  }
}
