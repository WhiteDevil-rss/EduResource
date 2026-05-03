const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder-app-id"
};

let app;

/**
 * getFirebaseAuth - Returns the Firebase Auth instance.
 * Initializes the Firebase app on demand if not already initialized.
 * Safe for both client-side and build-time (returns null if window is undefined).
 */
export const getFirebaseAuth = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    
    // Initialize app if no apps currently exist
    if (!app) {
      const apps = getApps();
      app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    }
    
    const { getAuth } = await import('firebase/auth');
    return getAuth(app);
  } catch (error) {
    console.error('[FIREBASE] Auth initialization failed:', error);
    return null;
  }
};

export { app };
