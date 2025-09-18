const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
let db;

try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    let serviceAccount;
    
    // Try to load from service account key file first (simpler and more reliable)
    try {
      console.log('📄 Loading Firebase credentials from service account key file...');
      serviceAccount = require('./serviceAccountKey.json');
      console.log('✅ Service account key file loaded successfully');
      
    } catch (keyError) {
      // Fallback to environment variables if file doesn't exist
      console.log('🔐 Service account file not found, trying environment variables...');
      
      if (process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
          universe_domain: "googleapis.com"
        };
        
        // Validate required environment variables
        const requiredVars = [
          'FIREBASE_PROJECT_ID',
          'FIREBASE_PRIVATE_KEY_ID', 
          'FIREBASE_PRIVATE_KEY',
          'FIREBASE_CLIENT_EMAIL',
          'FIREBASE_CLIENT_ID',
          'FIREBASE_CLIENT_X509_CERT_URL'
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
          throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
        }
        
        console.log('✅ Firebase credentials loaded from environment variables');
        
      } else {
        console.error('❌ Error loading service account key file:', keyError.message);
        console.error('❌ Make sure either:');
        console.error('   1. Place serviceAccountKey.json in the backend directory, OR');
        console.error('   2. Set Firebase environment variables in .env file');
        throw new Error('Firebase credentials not found');
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log('🚀 Firebase Admin SDK initialized successfully');
  }
  
  // Get Firestore database instance
  db = admin.firestore();
  console.log('🔥 Firestore database connection established');
  
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  
  // More specific error messages
  if (error.message.includes('private key')) {
    console.error('❌ The private key appears to be invalid.');
    console.error('❌ Please check your Firebase configuration.');
  }
  
  if (error.message.includes('project_id')) {
    console.error('❌ Project ID mismatch. Please verify your Firebase project configuration.');
  }
  
  if (error.message.includes('Missing required Firebase')) {
    console.error('❌ Please run the setup script to configure Firebase environment variables.');
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