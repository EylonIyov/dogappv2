import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfig } from '../config';
import { makeAuthenticatedRequest } from './api';
import { db } from '../firebase';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';

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

// Store active Firestore listeners to clean them up later
const activeListeners = new Map();

class DogParkService {
  static async getParks() {
    try {
      console.log('🏞️ Fetching dog parks...');
      const response = await makeAuthenticatedRequest('/api/dog-parks');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch parks: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching parks:', error);
      throw error;
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
   * Subscribe to real-time updates of a specific dog park's checked-in dogs using Firestore listeners
   * @param {string} parkId - The ID of the park to monitor
   * @param {function} callback - Callback function to handle updates
   * @returns {function} Unsubscribe function
   */
  static subscribeToCheckedInDogs(parkId, callback) {
    try {
      console.log(`🔔 Setting up Firestore listener for park: ${parkId}`);
      
      // Reference to the specific park document
      const parkDocRef = doc(db, 'test_dogparks', parkId);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(parkDocRef, async (docSnapshot) => {
        try {
          if (docSnapshot.exists()) {
            const parkData = docSnapshot.data();
            const checkedInDogIds = parkData.checkedInDogs || [];
            
            console.log(`🔄 Firestore update for park ${parkId}: ${checkedInDogIds.length} dogs`);
            
            // If no dogs checked in, return empty array
            if (checkedInDogIds.length === 0) {
              callback({
                success: true,
                dogs: [],
                parkData: { checkedInDogs: [] }
              });
              return;
            }
            
            // Fetch detailed dog information for each checked-in dog
            const dogsCollectionRef = collection(db, 'dogs');
            const dogsSnapshot = await getDocs(dogsCollectionRef);
            
            const checkedInDogs = [];
            dogsSnapshot.forEach((dogDoc) => {
              if (checkedInDogIds.includes(dogDoc.id)) {
                const dogData = dogDoc.data();
                checkedInDogs.push({
                  id: dogDoc.id,
                  name: dogData.name,
                  breed: dogData.breed,
                  age: dogData.age,
                  emoji: dogData.emoji,
                  owner_id: dogData.owner_id,
                  energy_level: dogData.energy_level,
                  photo_url: dogData.photo_url,
                  friends: dogData.friends || []
                });
              }
            });
            
            callback({
              success: true,
              dogs: checkedInDogs,
              parkData: { checkedInDogs: checkedInDogs }
            });
            
          } else {
            console.log(`Park ${parkId} does not exist`);
            callback({
              success: false,
              error: 'Park not found'
            });
          }
        } catch (error) {
          console.error('Error processing Firestore snapshot:', error);
          callback({
            success: false,
            error: error.message
          });
        }
      }, (error) => {
        console.error(`❌ Firestore listener error for park ${parkId}:`, error);
        callback({
          success: false,
          error: 'Connection error'
        });
      });

      // Store the unsubscribe function for cleanup
      activeListeners.set(`park_${parkId}`, unsubscribe);

      // Return unsubscribe function
      return () => {
        this.unsubscribeFromListener(`park_${parkId}`);
      };

    } catch (error) {
      console.error('❌ Error setting up Firestore listener:', error);
      callback({
        success: false,
        error: error.message
      });
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Subscribe to real-time updates of all dog parks using the regular API (fallback)
   * @param {function} callback - Callback function to handle updates
   * @returns {function} Unsubscribe function
   */
  static subscribeToAllParks(callback) {
    // For all parks, we'll use the regular API call since SSE is park-specific
    // This could be enhanced later with a general SSE endpoint for all parks
    this.getParks().then(result => {
      callback(result);
    }).catch(error => {
      callback({
        success: false,
        error: error.message
      });
    });

    // Return empty unsubscribe function since this is a one-time call
    return () => {};
  }

  /**
   * Unsubscribe from a specific Firestore listener
   * @param {string} listenerId - The ID of the listener to unsubscribe
   */
  static unsubscribeFromListener(listenerId) {
    const unsubscribe = activeListeners.get(listenerId);
    if (unsubscribe) {
      console.log(`🔕 Unsubscribing from Firestore listener: ${listenerId}`);
      unsubscribe();
      activeListeners.delete(listenerId);
    }
  }

  /**
   * Clean up all active Firestore listeners
   */
  static cleanupAllListeners() {
    console.log(`🧹 Cleaning up ${activeListeners.size} Firestore listeners`);
    activeListeners.forEach((unsubscribe, listenerId) => {
      console.log(`🔕 Unsubscribing from: ${listenerId}`);
      unsubscribe();
    });
    activeListeners.clear();
  }

  // Helper function to get auth token (moved to static for SSE usage)
  static async getAuthToken() {
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
  }
}

export default DogParkService;