"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext(null);
const studentGoogleProvider = new GoogleAuthProvider();
studentGoogleProvider.setCustomParameters({ prompt: "select_account" });

async function fetchSessionSnapshot() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) {
      return { user: null, role: null, status: null, authProvider: null };
    }

    const payload = await response.json().catch(() => ({}));
    return {
      user: payload?.user || null,
      role: payload?.role || null,
      status: payload?.status || null,
      authProvider: payload?.authProvider || null,
    };
  } catch {
    return { user: null, role: null, status: null, authProvider: null };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState(null);
  const [authProvider, setAuthProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  const applySession = (session) => {
    setUser(session?.user || null);
    setRole(session?.role || null);
    setStatus(session?.status || null);
    setAuthProvider(session?.authProvider || null);
  };

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      const session = await fetchSessionSnapshot();
      if (!isActive) {
        return;
      }

      applySession(session);
      setLoading(false);
    };

    loadSession();

    return () => {
      isActive = false;
    };
  }, []);

  const signInWithGoogleStudent = async () => {
    try {
      setIsAuthenticating(true);

      const credential = await signInWithPopup(auth, studentGoogleProvider);
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/auth/student-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        await signOut(auth).catch(() => {});
        throw new Error(payload?.error || "Google student sign-in failed.");
      }

      const nextSession = {
        user: payload?.user || null,
        role: payload?.role || "student",
        status: payload?.user?.status || "active",
        authProvider: "google",
      };

      applySession(nextSession);
      router.replace("/dashboard/student");
    } catch (error) {
      throw new Error(error?.message || "Google student sign-in failed.");
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const loginWithCredentials = async (email, password, googleIdToken) => {
    try {
      setIsAuthenticating(true);

      await signOut(auth).catch(() => {});

      const response = await fetch("/api/auth/credential-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(email || "").trim(),
          password: String(password || ""),
          googleIdToken: String(googleIdToken || ""),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Credential sign-in failed.");
      }

      const nextRole = payload?.role || null;
      const nextSession = {
        user: payload?.user || null,
        role: nextRole,
        status: payload?.user?.status || "active",
        authProvider: "credentials",
      };

      if (!nextRole) {
        throw new Error("Role resolution failed for this account.");
      }

      applySession(nextSession);
      router.replace(`/dashboard/${nextRole}`);
    } catch (error) {
      throw new Error(error?.message || "Credential sign-in failed.");
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/session-logout", { method: "POST" }).catch(() => {});
    await signOut(auth).catch(() => {});
    applySession({ user: null, role: null, status: null, authProvider: null });
    router.replace("/login");
  };

  const value = {
    user,
    role,
    status,
    authProvider,
    loading: loading || isAuthenticating,
    isAuthenticating,
    loginWithCredentials,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
