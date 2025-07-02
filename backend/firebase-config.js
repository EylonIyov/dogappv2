const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
let db;

try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  
  // Get Firestore database instance
  db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized successfully');
  
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}

// Export the database instance and admin for use in other files
module.exports = {
  db,
  admin,
  // Helper functions for common operations
  serverTimestamp: admin.firestore.FieldValue.serverTimestamp,
  deleteField: admin.firestore.FieldValue.delete,
  arrayUnion: admin.firestore.FieldValue.arrayUnion,
  arrayRemove: admin.firestore.FieldValue.arrayRemove,
};