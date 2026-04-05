"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, provider);
        } else {
          throw error;
        }
      }
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        throw new Error(error?.message || "Google student sign-in failed.");
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
      if (typeof window !== "undefined") {
        window.location.replace(`/dashboard/${nextRole}`);
        return;
      }

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
    loginWithGoogle,
    signInWithGoogleStudent,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
