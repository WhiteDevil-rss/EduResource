let app;
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder-app-id"
};

// Initialize app only on client
if (typeof window !== 'undefined') {
  try {
    const { initializeApp, getApps } = require("firebase/app");
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  } catch (error) {
    console.error('[FIREBASE] App initialization failed:', error);
  }
}

// Function to get auth instance on demand to avoid module factory race conditions
export const getFirebaseAuth = async () => {
  if (typeof window === 'undefined') return null;
  const { getAuth } = await import('firebase/auth');
  return getAuth(app);
};

// Export app for local use
export { app };
