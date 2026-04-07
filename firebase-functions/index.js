const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// 1. Trigger: Create a user document in Firestore when a new user registers via Auth
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email } = user;
  
  // Custom logic: Initialize specific email as admin
  const role = email === "ss7051017@gmail.com" ? "admin" : "student";
  
  return db.collection("users").doc(uid).set({
    uid,
    email,
    role,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
});


// 2. Function: Validate and link PDF resource (Example for server-side logic)
exports.validateResource = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { title, class: className, fileUrl } = data;

  // Perform server-side validation here
  if (!fileUrl.endsWith(".pdf")) {
    throw new functions.https.HttpsError("invalid-argument", "Only PDF files are allowed.");
  }

  // Log the action for auditing
  console.log(`Admin/Faculty ${context.auth.uid} uploaded ${title} for ${className}`);

  return { success: true };
});
