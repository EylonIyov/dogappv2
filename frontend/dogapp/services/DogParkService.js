import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfig } from '../config';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    console.log('🔑 Attempting to retrieve auth token from AsyncStorage...');
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      console.log('✅ Auth token found:', token.substring(0, 20) + '...');
    } else {
      console.log('❌ No auth token found in AsyncStorage');
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to make authenticated requests with retry logic
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const config = getApiConfig();
  const url = getApiUrl(endpoint);
  const token = await getAuthToken();
  
  console.log('🔑 Making authenticated request to:', url);
  console.log('🔑 Token available:', !!token);
  
  let lastError;
  
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const response = await fetch(url, {
        timeout: config.timeout,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`API request attempt ${attempt} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt === config.retries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
};

class DogParkService {
  // Store active listeners to clean them up later
  static activeListeners = new Map();

  static async getParks() {
    try {
      console.log('🏞️ Fetching dog parks from backend...');
      const response = await fetch(getApiUrl('/api/dog-parks'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch parks');
      }

      console.log('✅ Dog parks loaded successfully:', data.parks.length, 'parks found');
      return { success: true, parks: data.parks };
    } catch (error) {
      console.error('❌ Error fetching dog parks:', error);
      return { success: false, error: error.message };
    }
  }

  static async addPark(parkData) {
    try {
      console.log('🏞️ Adding new dog park via backend...');
      const response = await makeAuthenticatedRequest('/api/dog-parks', {
        method: 'POST',
        body: JSON.stringify(parkData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add park');
      }

      console.log('✅ Dog park added successfully with ID:', data.park.id);
      return { success: true, id: data.park.id };
    } catch (error) {
      console.error('❌ Error adding dog park:', error);
      return { success: false, error: error.message };
    }
  }

  static async updatePark(parkId, parkData) {
    try {
      console.log('🏞️ Updating dog park via backend...');
      const response = await makeAuthenticatedRequest(`/api/dog-parks/${parkId}`, {
        method: 'PUT',
        body: JSON.stringify(parkData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update park');
      }

      console.log('✅ Dog park updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating dog park:', error);
      return { success: false, error: error.message };
    }
  }

  static async deletePark(parkId) {
    try {
      console.log('🏞️ Deleting dog park via backend...');
      const response = await makeAuthenticatedRequest(`/api/dog-parks/${parkId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete park');
      }

      console.log('✅ Dog park deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting dog park:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkInDogs(parkId, dogIds) {
    try {
      console.log('🏞️ Checking in dogs to park via backend...');
      
      const response = await makeAuthenticatedRequest(`/api/dog-parks/${parkId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ dogIds }),
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to check in dogs';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          const textResponse = await response.text();
          if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else {
            errorMessage = `Server error (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('✅ Dogs checked in successfully');
      return { success: true, checkedInDogs: data.checkedInDogs };
    } catch (error) {
      console.error('❌ Error checking in dogs:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkOutDogs(parkId, dogIds) {
    try {
      console.log('🚪 Checking out dogs from park via backend...');
      
      const response = await makeAuthenticatedRequest(`/api/dog-parks/${parkId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ dogIds }),
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to check out dogs';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          const textResponse = await response.text();
          if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else {
            errorMessage = `Server error (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('✅ Dogs checked out successfully');
      return { success: true, checkedInDogs: data.checkedInDogs };
    } catch (error) {
      console.error('❌ Error checking out dogs:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDogsInPark(parkId) {
    try {
      console.log('🐕 Getting dogs checked into park via backend...');
      
      const response = await makeAuthenticatedRequest(`/api/dog-parks/${parkId}/dogs`);
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to get dogs in park';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, it might be an HTML error page
          const textResponse = await response.text();
          if (textResponse.includes('Cannot GET')) {
            errorMessage = 'API endpoint not found';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else {
            errorMessage = `Server error (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('✅ Dogs in park loaded successfully');
      return { success: true, dogs: data.dogs };
    } catch (error) {
      console.error('❌ Error getting dogs in park:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to real-time updates of a specific dog park's checked-in dogs
   * @param {string} parkId - The ID of the park to monitor
   * @param {function} callback - Callback function to handle updates
   * @returns {function} Unsubscribe function
   */
  static subscribeToCheckedInDogs(parkId, callback) {
    try {
      console.log(`🔔 Subscribing to real-time updates for park: ${parkId}`);
      
      const parkDocRef = doc(db, 'dogParks', parkId);
      
      const unsubscribe = onSnapshot(parkDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const parkData = docSnapshot.data();
          const checkedInDogs = parkData.checkedInDogs || [];
          
          console.log(`🔄 Real-time update for park ${parkId}:`, checkedInDogs.length, 'dogs checked in');
          
          // Call the callback with the updated dogs list
          callback({
            success: true,
            dogs: checkedInDogs,
            parkData: parkData
          });
        } else {
          console.log(`❌ Park ${parkId} not found`);
          callback({
            success: false,
            error: 'Park not found'
          });
        }
      }, (error) => {
        console.error(`❌ Error in real-time listener for park ${parkId}:`, error);
        callback({
          success: false,
          error: error.message
        });
      });

      // Store the unsubscribe function
      this.activeListeners.set(`park_${parkId}`, unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up real-time listener:', error);
      callback({
        success: false,
        error: error.message
      });
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Subscribe to real-time updates of all dog parks
   * @param {function} callback - Callback function to handle updates
   * @returns {function} Unsubscribe function
   */
  static subscribeToAllParks(callback) {
    try {
      console.log('🔔 Subscribing to real-time updates for all parks');
      
      const parksCollectionRef = collection(db, 'dogParks');
      const parksQuery = query(parksCollectionRef, orderBy('name'));
      
      const unsubscribe = onSnapshot(parksQuery, (querySnapshot) => {
        const parks = [];
        querySnapshot.forEach((doc) => {
          parks.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log('🔄 Real-time update for all parks:', parks.length, 'parks found');
        
        callback({
          success: true,
          parks: parks
        });
      }, (error) => {
        console.error('❌ Error in real-time listener for all parks:', error);
        callback({
          success: false,
          error: error.message
        });
      });

      // Store the unsubscribe function
      this.activeListeners.set('all_parks', unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up real-time listener for all parks:', error);
      callback({
        success: false,
        error: error.message
      });
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Unsubscribe from a specific listener
   * @param {string} listenerId - The ID of the listener to unsubscribe
   */
  static unsubscribeFromListener(listenerId) {
    const unsubscribe = this.activeListeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(listenerId);
      console.log(`🔕 Unsubscribed from listener: ${listenerId}`);
    }
  }

  /**
   * Clean up all active listeners
   */
  static cleanupAllListeners() {
    console.log(`🧹 Cleaning up ${this.activeListeners.size} active listeners`);
    this.activeListeners.forEach((unsubscribe, listenerId) => {
      unsubscribe();
      console.log(`🔕 Cleaned up listener: ${listenerId}`);
    });
    this.activeListeners.clear();
  }
}

export default DogParkService;