"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];
const PASSIVE_EVENTS = new Set(["mousemove", "scroll", "touchstart"]);

export function useAutoLogout({
  enabled,
  inactivityTimeoutMs = 300000,
  warningOffsetMs = 60000,
  maxSessionMs = 1800000,
  sessionStartedAtMs,
  onInactivityLogout,
  onSessionLogout,
}) {
  const inactivityWarningTimerRef = useRef(null);
  const inactivityLogoutTimerRef = useRef(null);
  const sessionLogoutTimerRef = useRef(null);
  const inactivityDeadlineRef = useRef(0);
  const sessionDeadlineRef = useRef(0);
  const warnedRef = useRef(false);
  const logoutTriggeredRef = useRef(false);
  const lastPassiveActivityAtRef = useRef(0);

  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsUntilInactivityLogout, setSecondsUntilInactivityLogout] = useState(
    Math.max(1, Math.ceil(warningOffsetMs / 1000))
  );

  const clearTimers = useCallback(() => {
    if (inactivityWarningTimerRef.current) {
      clearTimeout(inactivityWarningTimerRef.current);
      inactivityWarningTimerRef.current = null;
    }

    if (inactivityLogoutTimerRef.current) {
      clearTimeout(inactivityLogoutTimerRef.current);
      inactivityLogoutTimerRef.current = null;
    }

    if (sessionLogoutTimerRef.current) {
      clearTimeout(sessionLogoutTimerRef.current);
      sessionLogoutTimerRef.current = null;
    }
  }, []);

  const triggerInactivityWarning = useCallback(() => {
    if (!enabled || logoutTriggeredRef.current) {
      return;
    }

    warnedRef.current = true;
    setWarningVisible(true);
  }, [enabled]);

  const triggerInactivityLogout = useCallback(async () => {
    if (!enabled || logoutTriggeredRef.current) {
      return;
    }

    logoutTriggeredRef.current = true;
    clearTimers();
    setWarningVisible(false);
    await onInactivityLogout?.();
  }, [clearTimers, enabled, onInactivityLogout]);

  const triggerSessionLogout = useCallback(async () => {
    if (!enabled || logoutTriggeredRef.current) {
      return;
    }

    logoutTriggeredRef.current = true;
    clearTimers();
    setWarningVisible(false);
    await onSessionLogout?.();
  }, [clearTimers, enabled, onSessionLogout]);

  const scheduleInactivityTimers = useCallback(
    (fromTimestamp = Date.now()) => {
      if (!enabled || logoutTriggeredRef.current) {
        return;
      }

      if (inactivityWarningTimerRef.current) {
        clearTimeout(inactivityWarningTimerRef.current);
      }

      if (inactivityLogoutTimerRef.current) {
        clearTimeout(inactivityLogoutTimerRef.current);
      }

      inactivityDeadlineRef.current = fromTimestamp + inactivityTimeoutMs;
      const warningAt = inactivityDeadlineRef.current - warningOffsetMs;
      const now = Date.now();

      warnedRef.current = false;
      setWarningVisible(false);
      setSecondsUntilInactivityLogout(Math.max(1, Math.ceil(warningOffsetMs / 1000)));

      if (warningAt <= now) {
        triggerInactivityWarning();
      } else {
        inactivityWarningTimerRef.current = setTimeout(() => {
          triggerInactivityWarning();
        }, warningAt - now);
      }

      inactivityLogoutTimerRef.current = setTimeout(() => {
        triggerInactivityLogout();
      }, Math.max(0, inactivityDeadlineRef.current - now));
    },
    [enabled, inactivityTimeoutMs, triggerInactivityLogout, triggerInactivityWarning, warningOffsetMs]
  );

  const scheduleSessionTimer = useCallback(
    (fromTimestamp = Date.now()) => {
      if (!enabled || logoutTriggeredRef.current) {
        return;
      }

      if (sessionLogoutTimerRef.current) {
        clearTimeout(sessionLogoutTimerRef.current);
      }

      const sessionStart = Number.isFinite(sessionStartedAtMs) ? sessionStartedAtMs : fromTimestamp;
      sessionDeadlineRef.current = sessionStart + maxSessionMs;
      const remainingMs = Math.max(0, sessionDeadlineRef.current - Date.now());

      sessionLogoutTimerRef.current = setTimeout(() => {
        triggerSessionLogout();
      }, remainingMs);
    },
    [enabled, maxSessionMs, sessionStartedAtMs, triggerSessionLogout]
  );

  const evaluateDeadlines = useCallback(() => {
    if (!enabled || logoutTriggeredRef.current) {
      return;
    }

    const now = Date.now();

    if (sessionDeadlineRef.current && now >= sessionDeadlineRef.current) {
      triggerSessionLogout();
      return;
    }

    if (inactivityDeadlineRef.current && now >= inactivityDeadlineRef.current) {
      triggerInactivityLogout();
      return;
    }

    if (
      inactivityDeadlineRef.current &&
      now >= inactivityDeadlineRef.current - warningOffsetMs &&
      !warnedRef.current
    ) {
      triggerInactivityWarning();
    }
  }, [enabled, triggerInactivityLogout, triggerInactivityWarning, triggerSessionLogout, warningOffsetMs]);

  const resetInactivityTimer = useCallback(() => {
    if (!enabled || logoutTriggeredRef.current) {
      return;
    }

    scheduleInactivityTimers(Date.now());
  }, [enabled, scheduleInactivityTimers]);

  const stayLoggedIn = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      logoutTriggeredRef.current = false;
      warnedRef.current = false;
      setWarningVisible(false);
      return undefined;
    }

    logoutTriggeredRef.current = false;
    scheduleSessionTimer(Date.now());
    scheduleInactivityTimers(Date.now());

    const handleActivity = (event) => {
      if (logoutTriggeredRef.current) {
        return;
      }

      const eventType = event?.type || "";
      if (PASSIVE_EVENTS.has(eventType)) {
        const now = Date.now();
        if (now - lastPassiveActivityAtRef.current < 1000) {
          return;
        }
        lastPassiveActivityAtRef.current = now;
      }

      resetInactivityTimer();
    };

    const handleVisibilityOrFocus = () => {
      evaluateDeadlines();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
      clearTimers();
    };
  }, [clearTimers, enabled, evaluateDeadlines, resetInactivityTimer, scheduleInactivityTimers, scheduleSessionTimer]);

  useEffect(() => {
    if (!enabled || !warningVisible) {
      return undefined;
    }

    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((inactivityDeadlineRef.current - Date.now()) / 1000));
      setSecondsUntilInactivityLogout(seconds);

      if (seconds <= 0) {
        triggerInactivityLogout();
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, triggerInactivityLogout, warningVisible]);

  return {
    warningVisible,
    secondsUntilInactivityLogout,
    stayLoggedIn,
    logoutNow: triggerInactivityLogout,
    resetInactivityTimer,
  };
}
