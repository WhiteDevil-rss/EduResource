import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder-app-id"
};

const existingApp = getApps()[0];
const app = existingApp || initializeApp(firebaseConfig);
const auth = getAuth(app);

// Only configure Firestore transport once. Auto-detect long-polling is less brittle
// than forcing it on every client environment.
const db = existingApp
  ? getFirestore(app)
  : initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });

export { auth, db };
