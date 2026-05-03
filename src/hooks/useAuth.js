"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { getPostLoginRedirectPath } from '@/lib/admin-protection'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { areSessionSettingsEqual, normalizeSessionSettings, SESSION_SETTINGS_DEFAULTS } from "@/lib/session-settings";

// Lazy Auth utilities that will be loaded on demand within the provider
const getAuthUtils = async () => {
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } = await import("firebase/auth");
  return { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut };
};

const AuthContext = createContext(null);
const SESSION_START_KEY = "sps_auth_session_started_at";

function mapFirebaseAuthError(error, fallbackMessage) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "");

  if (code === "auth/unauthorized-domain" || message.includes("auth/unauthorized-domain")) {
    const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Google sign-in is not enabled for ${host}. Add this domain to Firebase Authentication -> Settings -> Authorized domains, then retry.`;
  }

  return message || fallbackMessage;
}

async function fetchSessionSnapshot() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) {
      return {
        user: null,
        role: null,
        status: null,
        authProvider: null,
        sessionSettings: SESSION_SETTINGS_DEFAULTS,
      };
    }

    const payload = await response.json().catch(() => ({}));
    console.log('[AUTH] API session snapshot:', {
      uid: payload?.user?.uid || payload?.user?.id,
      role: payload?.role,
      status: payload?.status
    });
    return {
      user: payload?.user || null,
      role: payload?.role || null,
      status: payload?.status || null,
      authProvider: payload?.authProvider || null,
      sessionSettings: normalizeSessionSettings(payload?.sessionSettings),
    };
  } catch {
    return {
      user: null,
      role: null,
      status: null,
      authProvider: null,
      sessionSettings: SESSION_SETTINGS_DEFAULTS,
    };
  }
}

async function fetchLiveSessionSettings() {
  try {
    const response = await fetch("/api/session-settings", { cache: "no-store" });
    if (!response.ok) {
      return SESSION_SETTINGS_DEFAULTS;
    }

    const payload = await response.json().catch(() => ({}));
    return normalizeSessionSettings(payload?.settings);
  } catch {
    return SESSION_SETTINGS_DEFAULTS;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState(null);
  const [authProvider, setAuthProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sessionSettings, setSessionSettings] = useState(SESSION_SETTINGS_DEFAULTS);
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);
  const logoutInProgressRef = useRef(false);
  const router = useRouter();

  const readSessionStart = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const rawValue = window.localStorage.getItem(SESSION_START_KEY);
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  };

  const writeSessionStart = (timestamp) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SESSION_START_KEY, String(timestamp));
    setSessionStartedAtMs(timestamp);
  };

  const clearSessionStart = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(SESSION_START_KEY);
    setSessionStartedAtMs(null);
  };

  const applySession = (session) => {
    const normalizedRole = session?.role || session?.user?.role || null;
    const normalizedStatus = session?.status || session?.user?.status || null;

    const nextUser = session?.user
      ? {
          ...session.user,
          uid: session.user.uid || session.user.id || null,
          id: session.user.id || session.user.uid || null,
          ...(normalizedRole ? { role: normalizedRole } : {}),
          ...(normalizedStatus ? { status: normalizedStatus } : {}),
        }
      : null;

    console.log('[AUTH] Applying session:', {
      hasUser: !!nextUser,
      role: normalizedRole,
      status: normalizedStatus
    });

    setUser(nextUser);
    setRole(normalizedRole);
    setStatus(normalizedStatus);
    setAuthProvider(session?.authProvider || null);
    setIsSessionConfirmed(!!nextUser);

    const nextSettings = normalizeSessionSettings(session?.sessionSettings);
    setSessionSettings((current) =>
      areSessionSettingsEqual(current, nextSettings) ? current : nextSettings
    );
  };

  const refreshSessionSettings = useCallback(async () => {
    const nextSettings = await fetchLiveSessionSettings();
    setSessionSettings((current) =>
      areSessionSettingsEqual(current, nextSettings) ? current : nextSettings
    );
    return nextSettings;
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      try {
        const session = await fetchSessionSnapshot();
        if (!isActive) {
          return;
        }

        applySession(session);
        if (session?.user && (session?.role || session?.user?.role)) {
          const existingSessionStart = readSessionStart();
          if (existingSessionStart) {
            setSessionStartedAtMs(existingSessionStart);
          } else {
            writeSessionStart(Date.now());
          }
        } else {
          clearSessionStart();
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isActive = false;
    };
  }, []);

  const loginWithGoogle = async (idToken) => {
    try {
      setIsAuthenticating(true);
      const response = await fetch("/api/auth/student-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Google sign-in failed.");
      }

      const nextRole = payload?.role || null;
      const allowedRoles = ['admin', 'faculty', 'student'];

      if (!nextRole || !allowedRoles.includes(nextRole)) {
        throw new Error("Unauthorized dashboard role resolution.");
      }

      const nextSession = {
        user: payload?.user || null,
        role: nextRole,
        status: payload?.user?.status || "active",
        authProvider: "google",
      };

      applySession(nextSession);
      writeSessionStart(Date.now());
      setIsNavigating(true);

      if (typeof window !== "undefined") {
        window.location.replace(getPostLoginRedirectPath(nextSession.user, nextRole));
        return;
      }
      router.replace(getPostLoginRedirectPath(nextSession.user, nextRole));
    } catch (error) {
      throw new Error(error?.message || "Google sign-in failed.");
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const signInWithGoogleStudent = async () => {
    try {
      setIsAuthenticating(true);
      const authInstance = await getFirebaseAuth();
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await getAuthUtils();
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      
      try {
        const result = await signInWithPopup(authInstance, provider);
        const idToken = await result.user.getIdToken();
        await loginWithGoogle(idToken);
      } catch (error) {
        if (
          error?.code === "auth/unauthorized-domain" ||
          String(error?.message || "").includes("auth/unauthorized-domain")
        ) {
          throw new Error(mapFirebaseAuthError(error, "Google student sign-in failed."));
        }

        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(authInstance, provider);
        } else {
          throw error;
        }
      }
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        throw new Error(mapFirebaseAuthError(error, "Google student sign-in failed."));
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithCredentials = useCallback(async (email, password) => {
    try {
      setIsAuthenticating(true);

      const response = await fetch("/api/auth/credential-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(email || "").trim(),
          password: String(password || ""),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 202 && payload?.requiresTwoFactor) {
        return payload;
      }

      if (!response.ok) {
        throw new Error(payload?.error || "Credential sign-in failed.");
      }

      const nextRole = payload?.role || null;
      const allowedRoles = ['admin', 'faculty', 'student'];

      if (!nextRole || !allowedRoles.includes(nextRole)) {
        throw new Error("Account role resolution failed or access denied.");
      }

      const nextSession = {
        user: payload?.user || null,
        role: nextRole,
        status: payload?.user?.status || "active",
        authProvider: "credentials",
      };

      applySession(nextSession);
      writeSessionStart(Date.now());
      setIsNavigating(true);

      if (typeof window !== "undefined") {
        window.location.replace(getPostLoginRedirectPath(nextSession.user, nextRole));
        return null;
      }

      router.replace(getPostLoginRedirectPath(nextSession.user, nextRole));
      return null;
    } catch (error) {
      throw new Error(error?.message || "Credential sign-in failed.");
    } finally {
      setIsAuthenticating(false);
      // loading remains true if isNavigating is true to prevent UI flash
    }
  }, [router]);

  const verifyTwoFactorCode = useCallback(async (challengeId, otp) => {
    try {
      setIsAuthenticating(true);

      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: String(challengeId || "").trim(),
          otp: String(otp || "").trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "2FA verification failed.");
      }

      const nextRole = payload?.role || null;
      const allowedRoles = ["admin", "faculty", "student"];

      if (!nextRole || !allowedRoles.includes(nextRole)) {
        throw new Error("Account role resolution failed or access denied.");
      }

      const nextSession = {
        user: payload?.user || null,
        role: nextRole,
        status: payload?.user?.status || "active",
        authProvider: "credentials",
      };

      applySession(nextSession);
      writeSessionStart(Date.now());
      setIsNavigating(true);

      if (typeof window !== "undefined") {
        window.location.replace(getPostLoginRedirectPath(nextSession.user, nextRole));
        return;
      }

      router.replace(getPostLoginRedirectPath(nextSession.user, nextRole));
    } catch (error) {
      throw new Error(error?.message || "2FA verification failed.");
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  }, [router]);

  const resendTwoFactorCode = useCallback(async (challengeId) => {
    const response = await fetch("/api/auth/resend-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId: String(challengeId || "").trim(),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Could not resend verification code.");
    }

    return payload;
  }, []);

  const clearBrowserAuthArtifacts = () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.clear();
    } catch (error) {
      console.warn("Session storage cleanup failed during logout.", error);
    }

    try {
      window.localStorage.removeItem(SESSION_START_KEY);
      const keysToRemove = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key) {
          continue;
        }

        if (/firebase:|token|auth|session/i.test(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      console.warn("Local storage cleanup failed during logout.", error);
    }

    try {
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0]?.trim();
        if (!name) {
          return;
        }
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch (error) {
      console.warn("Cookie cleanup failed during logout.", error);
    }
  };

  const logout = useCallback(async ({ reason = "manual" } = {}) => {
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;

    try {
      clearBrowserAuthArtifacts();
      await fetch("/api/session-logout", { method: "POST" }).catch(() => {});
      
      const authInstance = await getFirebaseAuth();
      if (authInstance) {
        const { signOut } = await getAuthUtils();
        await signOut(authInstance).catch(() => {});
      }
    } catch (err) {
      console.warn('[AUTH] Handled safe logout:', err);
    } finally {
      applySession({ user: null, role: null, status: null, authProvider: null });
      clearSessionStart();
      setIsAuthenticating(false);
      setLoading(false);

      const target = reason === "manual" ? "/login" : "/login?reason=session-expired";
      router.replace(target);
      logoutInProgressRef.current = false;
    }
  }, [router]);

  // Stable references for useAutoLogout and other hooks that need stable callbacks
  const onInactivityLogoutRef = useRef(null);
  const onSessionLogoutRef = useRef(null);

  useEffect(() => {
    onInactivityLogoutRef.current = () => logout({ reason: "inactivity-timeout" });
    onSessionLogoutRef.current = () => logout({ reason: "session-absolute-timeout" });
  }, [logout]);

  const autoLogout = useAutoLogout({
    enabled: Boolean(user && role && !loading && !isAuthenticating),
    inactivityTimeoutMs: sessionSettings.inactivityTimeout,
    warningOffsetMs: sessionSettings.inactivityTimeout - sessionSettings.warningTimeout,
    maxSessionMs: sessionSettings.maxSessionTimeout,
    sessionStartedAtMs,
    onInactivityLogout: useCallback(() => onInactivityLogoutRef.current?.(), []),
    onSessionLogout: useCallback(() => onSessionLogoutRef.current?.(), []),
  });

  useEffect(() => {
    if (!user?.uid || !role) {
      return undefined;
    }

    let mounted = true;
    const refresh = async () => {
      const nextSettings = await fetchLiveSessionSettings();
      if (!mounted) {
        return;
      }

      setSessionSettings((current) =>
        areSessionSettingsEqual(current, nextSettings) ? current : nextSettings
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const intervalId = window.setInterval(refresh, 300000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [role, user?.uid]);

  const value = {
    user,
    role,
    status,
    authProvider,
    loading: loading || isAuthenticating,
    isAuthenticating,
    isNavigating,
    isSessionConfirmed,
    loginWithCredentials,
    verifyTwoFactorCode,
    resendTwoFactorCode,
    loginWithGoogle,
    signInWithGoogleStudent,
    logout,
    stayLoggedIn: autoLogout.stayLoggedIn,
    sessionSettings,
    refreshSessionSettings,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(user && role) && autoLogout.warningVisible}
        onOpenChange={(open) => {
          if (!open) {
            autoLogout.stayLoggedIn();
          }
        }}
        labelledBy="session-timeout-warning-title"
      >
        <DialogHeader>
          <DialogTitle id="session-timeout-warning-title">Session Inactivity Warning</DialogTitle>
          <DialogDescription>
            You will be logged out due to inactivity in 1 minute.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-[0.95rem] text-muted-foreground">
            Time remaining: {autoLogout.secondsUntilInactivityLogout} seconds.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => autoLogout.logoutNow()}>
            Logout Now
          </Button>
          <Button type="button" onClick={() => autoLogout.stayLoggedIn()}>
            Stay Logged In
          </Button>
        </DialogFooter>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
