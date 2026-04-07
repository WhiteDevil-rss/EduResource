"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
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

const AuthContext = createContext(null);
const SESSION_START_KEY = "sps_auth_session_started_at";
const studentGoogleProvider = new GoogleAuthProvider();
studentGoogleProvider.setCustomParameters({ prompt: "select_account" });

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
    setUser(session?.user || null);
    setRole(session?.role || null);
    setStatus(session?.status || null);
    setAuthProvider(session?.authProvider || null);

    const nextSettings = normalizeSessionSettings(session?.sessionSettings);
    setSessionSettings((current) =>
      areSessionSettingsEqual(current, nextSettings) ? current : nextSettings
    );
  };

  const refreshSessionSettings = async () => {
    const nextSettings = await fetchLiveSessionSettings();
    setSessionSettings((current) =>
      areSessionSettingsEqual(current, nextSettings) ? current : nextSettings
    );
    return nextSettings;
  };

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      const session = await fetchSessionSnapshot();
      if (!isActive) {
        return;
      }

      applySession(session);
      if (session?.user && session?.role) {
        const existingSessionStart = readSessionStart();
        if (existingSessionStart) {
          setSessionStartedAtMs(existingSessionStart);
        } else {
          writeSessionStart(Date.now());
        }
      } else {
        clearSessionStart();
      }
      setLoading(false);
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
      if (typeof window !== "undefined") {
        window.location.replace(`/dashboard/${nextRole}`);
        return;
      }
      router.replace(`/dashboard/${nextRole}`);
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
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      
      // Try popup first, if blocked or fails, use redirect
      try {
        const result = await signInWithPopup(auth, provider);
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
          await signInWithRedirect(auth, provider);
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

  const loginWithCredentials = async (email, password) => {
    try {
      setIsAuthenticating(true);

      await signOut(auth).catch(() => {});

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
      if (typeof window !== "undefined") {
        window.location.replace(`/dashboard/${nextRole}`);
        return null;
      }

      router.replace(`/dashboard/${nextRole}`);
      return null;
    } catch (error) {
      throw new Error(error?.message || "Credential sign-in failed.");
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const verifyTwoFactorCode = async (challengeId, otp) => {
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
      if (typeof window !== "undefined") {
        window.location.replace(`/dashboard/${nextRole}`);
        return;
      }

      router.replace(`/dashboard/${nextRole}`);
    } catch (error) {
      throw new Error(error?.message || "2FA verification failed.");
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const resendTwoFactorCode = async (challengeId) => {
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
  };

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

  const logout = async ({ reason = "manual" } = {}) => {
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;

    try {
      clearBrowserAuthArtifacts();
      await fetch("/api/session-logout", { method: "POST" }).catch(() => {});
      await signOut(auth).catch(() => {});
    } finally {
      applySession({ user: null, role: null, status: null, authProvider: null });
      clearSessionStart();
      setIsAuthenticating(false);
      setLoading(false);

      const target = reason === "manual" ? "/login" : "/login?reason=session-expired";
      router.replace(target);
      logoutInProgressRef.current = false;
    }
  };

  const autoLogout = useAutoLogout({
    enabled: Boolean(user && role && !loading && !isAuthenticating),
    inactivityTimeoutMs: sessionSettings.inactivityTimeout,
    warningOffsetMs: sessionSettings.inactivityTimeout - sessionSettings.warningTimeout,
    maxSessionMs: sessionSettings.maxSessionTimeout,
    sessionStartedAtMs,
    onInactivityLogout: () => logout({ reason: "inactivity-timeout" }),
    onSessionLogout: () => logout({ reason: "session-absolute-timeout" }),
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

    const intervalId = window.setInterval(refresh, 60000);

    return () => {
      mounted = false;
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
          <p style={{ color: "rgba(240, 240, 253, 0.75)", fontSize: "0.95rem" }}>
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
