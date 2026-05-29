import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

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
} else {
  const serviceAccountPath = './eduresourcehub-73f9b-firebase-adminsdk-fbsvc-ce5cd52668.json';
  firebaseConfig = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(firebaseConfig),
  });
}

const db = getFirestore();

async function check() {
  console.log('--- DIAGNOSTIC DATABASE CHECK ---');
  
  // 1. Check blocked_ips
  console.log('\n--- BLOCKED IPs ---');
  const blockedIpsSnap = await db.collection('blocked_ips').get();
  if (blockedIpsSnap.empty) {
    console.log('No blocked IPs found in the database.');
  } else {
    blockedIpsSnap.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  }

  // 2. Check users
  console.log('\n--- SEEDED USERS ---');
  const usersSnap = await db.collection('users').get();
  if (usersSnap.empty) {
    console.log('No users found in the database.');
  } else {
    usersSnap.forEach(doc => {
      console.log(`User ID: ${doc.id}`);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  }

  console.log('\n--- CHECK COMPLETE ---');
}

check().catch(console.error);
