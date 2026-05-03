import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder-app-id"
};

// Initialize Firebase App instance eagerly on the client to prevent "No Firebase App" errors
let app;
if (typeof window !== "undefined") {
  const existingApps = getApps();
  app = existingApps.length === 0 ? initializeApp(firebaseConfig) : existingApps[0];
}

/**
 * getFirebaseAuth - Returns the Firebase Auth instance.
 * Safe for both client-side and build-time.
 */
export const getFirebaseAuth = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { initializeApp: initApp, getApps: getAppsList } = await import("firebase/app");
    const apps = getAppsList();
    
    if (apps.length === 0) {
      app = initApp(firebaseConfig);
    } else {
      app = apps[0];
    }
    
    if (!app) {
      throw new Error("Failed to initialize Firebase app instance.");
    }
    
    const { getAuth } = await import('firebase/auth');
    return getAuth(app);
  } catch (error) {
    console.error('[FIREBASE] Auth initialization failed:', error);
    // If it fails, try to return the default auth instance as a last resort
    try {
      const { getAuth } = await import('firebase/auth');
      return getAuth();
    } catch (innerError) {
      return null;
    }
  }
};

export { app };
