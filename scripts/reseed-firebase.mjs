import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load service account from environment or file
// Load credentials
let firebaseConfig = null;

if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };
  console.log('Using credentials from environment variables.');
} else {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './eduresourcehub-73f9b-firebase-adminsdk-fbsvc-ce5cd52668.json';
  firebaseConfig = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  console.log(`Using credentials from file: ${serviceAccountPath}`);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(firebaseConfig),
  });
}

const auth = getAuth();
const db = getFirestore();
const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || process.env.VITE_SUPER_ADMIN_EMAIL || '').trim().toLowerCase();

if (!superAdminEmail) {
  throw new Error('SUPER_ADMIN_EMAIL must be configured before reseeding Firebase data.')
}

const USERS_TO_SEED = [
  {
    email: superAdminEmail,
    password: 'password123',
    displayName: 'Admin User',
    role: 'admin',
  },
  {
    email: 'faculty@gmail.com',
    password: 'password123',
    displayName: 'Faculty User',
    role: 'faculty',
  },
];

async function reseed() {
  console.log('Starting Firebase Re-seed...');

  for (const userData of USERS_TO_SEED) {
    try {
      // 1. Delete existing user from Auth if exists
      try {
        const existingUser = await auth.getUserByEmail(userData.email);
        await auth.deleteUser(existingUser.uid);
        console.log(`Deleted existing Auth user: ${userData.email}`);
        
        // 2. Delete existing document from Firestore if exists
        await db.collection('users').doc(existingUser.uid).delete();
        console.log(`Deleted existing Firestore doc: ${existingUser.uid}`);
      } catch (err) {
        if (err.code !== 'auth/user-not-found') {
          console.warn(`Warning deleting ${userData.email}:`, err.message);
        }
      }

      // 3. Create new user in Auth
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
      });
      console.log(`Created new Auth user: ${userData.email} (UID: ${userRecord.uid})`);

      // 4. Create new document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userData.email,
        name: userData.displayName,
        role: userData.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`Created Firestore doc for: ${userData.email}`);

    } catch (error) {
      console.error(`Error processing ${userData.email}:`, error);
    }
  }

  console.log('Re-seed complete.');
}

reseed().catch(console.error);
