"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore/lite";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const profile = await loadUserProfile(firebaseUser.uid);
          setRole(profile?.role || null);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.warn("Auth sync warning:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) {
        throw new Error("User profile is missing.");
      }

      const data = userDoc.data() || {};
      if (!data?.role) {
        throw new Error("Role data is missing.");
      }

      return data;
    } catch (error) {
      if (error?.code === "unavailable" || error?.message?.toLowerCase().includes("offline")) {
        throw new Error("We could not load your profile because Firestore appears offline. Check your connection and try again.");
      }

      throw error;
    }
  };

  const getFriendlyAuthMessage = (error, fallbackMessage) => {
    if (!error) {
      return fallbackMessage;
    }

    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      return "Invalid email or password.";
    }

    if (error.code === "auth/too-many-requests") {
      return "Too many login attempts. Please wait a moment and try again.";
    }

    return error.message || fallbackMessage;
  };

  const login = async (email, password) => {
    try {
      setIsAuthenticating(true);
      setLoading(true);
      const sanitizedEmail = String(email || "").trim();
      const sanitizedPassword = String(password || "");

      if (!sanitizedEmail || !sanitizedPassword) {
        throw new Error("Email and password are required.");
      }

      const cred = await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      let requestedRole = null;
      let profileLookupError = null;

      try {
        const profile = await loadUserProfile(cred.user.uid);
        requestedRole = profile.role;
      } catch (error) {
        profileLookupError = error;
        console.warn("Proceeding without client profile lookup:", error);
      }

      const idToken = await cred.user.getIdToken(true);

      const response = await fetch("/api/session-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: requestedRole }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (profileLookupError) {
          throw profileLookupError;
        }
        throw new Error(payload?.error || "Session login failed. The server could not validate your role.");
      }

      const payload = await response.json();
      const userRole = payload?.role;

      if (!userRole) {
        throw new Error("Role missing. Access denied.");
      }

      setUser(cred.user);
      setRole(userRole);
      router.push(`/dashboard/${userRole}`);
    } catch (error) {
      console.error("Login error:", error);
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      throw new Error(getFriendlyAuthMessage(error, "Failed to sign in."));
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const register = async (email, password, selectedRole = "student") => {
    try {
      setIsAuthenticating(true);
      setLoading(true);
      const sanitizedEmail = String(email || "").trim();
      const sanitizedPassword = String(password || "");

      if (!sanitizedEmail || !sanitizedPassword) {
        throw new Error("Email and password are required.");
      }

      const allowedRoles = ["student", "faculty"];
      const finalRole = allowedRoles.includes(selectedRole) ? selectedRole : "student";

      const cred = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: sanitizedEmail,
        role: finalRole,
        status: "active",
        createdAt: serverTimestamp(),
      });
      const idToken = await cred.user.getIdToken(true);

      const response = await fetch("/api/session-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: finalRole }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Session login failed. The server could not validate your role.");
      }

      const payload = await response.json();
      const userRole = payload?.role || finalRole;

      if (!userRole) {
        throw new Error("Role missing. Access denied.");
      }

      setUser(cred.user);
      setRole(userRole);
      router.push(`/dashboard/${userRole}`);
    } catch (error) {
      console.error("Registration error:", error);
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      throw new Error(getFriendlyAuthMessage(error, "Failed to register."));
    } finally {
      setIsAuthenticating(false);
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/session-logout", { method: "POST" });
    await signOut(auth);
    setUser(null);
    setRole(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, role, loading: loading || isAuthenticating, isAuthenticating, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
