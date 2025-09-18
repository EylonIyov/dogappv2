import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyCbG5iuZ-eIQ9mA0rLQngr9ykzxjW0YN7g",
  authDomain: "dog-app-39718.firebaseapp.com",
  projectId: "dog-app-39718",
  storageBucket: "dog-app-39718.firebasestorage.app",
  messagingSenderId: "599801819669",
  appId: "1:599801819669:web:090272a8756afd576a141c",
  measurementId: "G-K3EMESTEHC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
