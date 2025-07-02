const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
let db;

try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    // Try to parse the service account key first
    let serviceAccount;
    try {
      serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json');
      console.log('✅ Service account key loaded successfully');
    } catch (keyError) {
      console.error('❌ Error loading service account key:', keyError.message);
      throw new Error('Invalid service account key file');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
  
  // Get Firestore database instance
  db = admin.firestore();
  console.log('✅ Firestore database connection established');
  
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  
  // More specific error messages
  if (error.message.includes('private key')) {
    console.error('🔑 The private key in your service account file appears to be invalid.');
    console.error('📝 Please check that you downloaded the correct service account key from Firebase Console.');
  }
  
  if (error.message.includes('project_id')) {
    console.error('🏷️ Project ID mismatch. Please verify your Firebase project configuration.');
  }
  
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