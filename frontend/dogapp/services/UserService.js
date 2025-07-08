import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// User Schema Structure
/*
test_users/{userId} = {
  uid: string,                    // Firebase Auth UID
  email: string,                  // User's email
  fullName: string,              // Full name
  dateOfBirth: timestamp,        // Date of birth
  age: number,                   // Calculated age
  gender: string,                // Gender (optional)
  profileImageUrl: string,       // Profile photo URL (optional)
  createdAt: timestamp,          // Account creation date
  updatedAt: timestamp,          // Last update date
  lastLoginAt: timestamp,        // Last login timestamp
  isActive: boolean,             // Account status
  preferences: {                 // User preferences
    notifications: boolean,
    theme: string,
    language: string
  }
}
*/

class UserService {
  // Create a new user document in Firestore
  async createUserProfile(uid, userData) {
    try {
      const userRef = doc(db, 'test_users', uid);
      const userProfile = {
        uid,
        email: userData.email,
        fullName: userData.fullName,
        dateOfBirth: userData.dateOfBirth,
        age: userData.age,
        gender: userData.gender || null,
        profileImageUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        preferences: {
          notifications: true,
          theme: 'light',
          language: 'en'
        }
      };

      await setDoc(userRef, userProfile);
      return { success: true, user: userProfile };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile by UID
  async getUserProfile(uid) {
    try {
      const userRef = doc(db, 'test_users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return { success: true, user: userSnap.data() };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user exists by email
  async checkUserExists(email) {
    try {
      const usersRef = collection(db, 'test_users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      return { success: true, exists: !querySnapshot.empty };
    } catch (error) {
      console.error('Error checking user existence:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user profile
  async updateUserProfile(uid, updates) {
    try {
      const userRef = doc(db, 'test_users', uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Update last login timestamp
  async updateLastLogin(uid) {
    try {
      const userRef = doc(db, 'test_users', uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating last login:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user by email (for verification)
  async getUserByEmail(email) {
    try {
      const usersRef = collection(db, 'test_users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { success: true, user: userDoc.data() };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user by email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new UserService();