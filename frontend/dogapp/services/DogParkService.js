import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfig } from '../config';
import { makeAuthenticatedRequest } from './api';
import { db } from '../firebase';
import { doc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';

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
      
      // Store current dog listeners to clean them up when the dog list changes
      let currentDogListeners = new Map();
      let currentDogData = new Map();
      let isInitialLoad = true;
      let hasFirestoreError = false;
      
      // Helper function to update callback with current data
      const notifyCallback = () => {
        const dogsArray = Array.from(currentDogData.values());
        console.log(`📢 Notifying callback with ${dogsArray.length} dogs for park ${parkId}`);
        callback({
          success: true,
          dogs: dogsArray,
          parkData: { checkedInDogs: dogsArray }
        });
      };
      
      // Helper function to clean up dog listeners
      const cleanupDogListeners = () => {
        currentDogListeners.forEach((unsubscribe, dogId) => {
          console.log(`🔕 Cleaning up dog listener: ${dogId}`);
          try {
            unsubscribe();
          } catch (error) {
            console.warn(`⚠️ Error cleaning up listener for dog ${dogId}:`, error);
          }
        });
        currentDogListeners.clear();
        currentDogData.clear();
      };
      
      // Fallback function using API polling
      const setupApiPolling = () => {
        console.log(`🔄 Setting up API polling fallback for park ${parkId}`);
        
        const pollInterval = setInterval(async () => {
          try {
            const result = await this.getDogsInPark(parkId);
            if (result.success) {
              console.log(`📊 API polling update for park ${parkId}: ${result.dogs.length} dogs`);
              callback({
                success: true,
                dogs: result.dogs,
                parkData: { checkedInDogs: result.dogs }
              });
            }
          } catch (error) {
            console.error(`❌ API polling error for park ${parkId}:`, error);
          }
        }, 10000); // Poll every 10 seconds
        
        // Return cleanup function
        return () => {
          console.log(`🔕 Cleaning up API polling for park ${parkId}`);
          clearInterval(pollInterval);
        };
      };
      
      // Set up real-time listener for park document with better error handling
      let parkUnsubscribe;
      
      try {
        parkUnsubscribe = onSnapshot(parkDocRef, async (docSnapshot) => {
          try {
            if (docSnapshot.exists()) {
              const parkData = docSnapshot.data();
              const checkedInDogIds = parkData.checkedInDogs || [];
              
              console.log(`🔄 Park update for ${parkId}: ${checkedInDogIds.length} dogs`);
              console.log(`🔄 Dog IDs in park: ${checkedInDogIds.join(', ')}`);
              
              // If no dogs checked in, clean up listeners and return empty array
              if (checkedInDogIds.length === 0) {
                cleanupDogListeners();
                callback({
                  success: true,
                  dogs: [],
                  parkData: { checkedInDogs: [] }
                });
                return;
              }
              
              // Find which dogs need new listeners and which need to be removed
              const currentDogIds = new Set(currentDogListeners.keys());
              const newDogIds = new Set(checkedInDogIds);
              
              // Remove listeners for dogs that are no longer in the park
              currentDogIds.forEach(dogId => {
                if (!newDogIds.has(dogId)) {
                  console.log(`🚪 Dog ${dogId} left the park, removing listener`);
                  const unsubscribe = currentDogListeners.get(dogId);
                  if (unsubscribe) {
                    try {
                      unsubscribe();
                    } catch (error) {
                      console.warn(`⚠️ Error unsubscribing from dog ${dogId}:`, error);
                    }
                  }
                  currentDogListeners.delete(dogId);
                  currentDogData.delete(dogId);
                }
              });
              
              // Track how many new dogs we're adding
              const newDogsToAdd = checkedInDogIds.filter(dogId => !currentDogListeners.has(dogId));
              let newDogsLoaded = 0;
              
              console.log(`🐕 Adding listeners for ${newDogsToAdd.length} new dogs`);
              
              // Add listeners for new dogs
              for (const dogId of newDogsToAdd) {
                console.log(`🐕 Setting up listener for dog: ${dogId}`);
                
                const dogDocRef = doc(db, 'dogs', dogId);
                
                // Set up listener for this specific dog with error handling
                let dogUnsubscribe;
                try {
                  dogUnsubscribe = onSnapshot(dogDocRef, (dogSnapshot) => {
                    if (dogSnapshot.exists()) {
                      const dogData = dogSnapshot.data();
                      const dogInfo = {
                        id: dogSnapshot.id,
                        name: dogData.name,
                        breed: dogData.breed,
                        age: dogData.age,
                        emoji: dogData.emoji,
                        owner_id: dogData.owner_id,
                        energy_level: dogData.energy_level,
                        photo_url: dogData.photo_url,
                        friends: dogData.friends || []
                      };
                      
                      console.log(`🔄 Dog update: ${dogInfo.name} (${dogId})`);
                      currentDogData.set(dogId, dogInfo);
                      
                      // Always notify callback when dog data updates
                      notifyCallback();
                    } else {
                      console.log(`Dog ${dogId} not found, removing from current data`);
                      currentDogData.delete(dogId);
                      notifyCallback();
                    }
                  }, (error) => {
                    console.error(`❌ Error listening to dog ${dogId}:`, error);
                    // Don't fail completely, just remove this dog's listener
                    currentDogListeners.delete(dogId);
                  });
                  
                  currentDogListeners.set(dogId, dogUnsubscribe);
                } catch (error) {
                  console.error(`❌ Failed to set up listener for dog ${dogId}:`, error);
                }
                
                // Fetch initial dog data immediately and synchronously
                try {
                  const dogSnapshot = await getDoc(dogDocRef);
                  if (dogSnapshot.exists()) {
                    const dogData = dogSnapshot.data();
                    const dogInfo = {
                      id: dogSnapshot.id,
                      name: dogData.name,
                      breed: dogData.breed,
                      age: dogData.age,
                      emoji: dogData.emoji,
                      owner_id: dogData.owner_id,
                      energy_level: dogData.energy_level,
                      photo_url: dogData.photo_url,
                      friends: dogData.friends || []
                    };
                    
                    console.log(`✅ Initial data loaded for dog: ${dogInfo.name} (${dogId})`);
                    currentDogData.set(dogId, dogInfo);
                    
                    newDogsLoaded++;
                    
                    // If this is the last new dog loaded, notify callback immediately
                    if (newDogsLoaded === newDogsToAdd.length) {
                      console.log(`🎉 All ${newDogsToAdd.length} new dogs loaded, notifying callback`);
                      notifyCallback();
                    }
                  }
                } catch (error) {
                  console.error(`❌ Error fetching initial data for dog ${dogId}:`, error);
                  newDogsLoaded++;
                  // Still notify even if there was an error, so we don't get stuck
                  if (newDogsLoaded === newDogsToAdd.length) {
                    notifyCallback();
                  }
                }
              }
              
              // If no new dogs to add, but we removed some, notify immediately
              if (newDogsToAdd.length === 0 && currentDogIds.size > newDogIds.size) {
                console.log(`🚪 Only dogs removed, notifying callback immediately`);
                notifyCallback();
              }
              
              // If this was the initial load and we have existing dogs, notify immediately
              if (isInitialLoad && checkedInDogIds.length > 0 && newDogsToAdd.length === 0) {
                console.log(`🏁 Initial load with existing dogs, notifying callback`);
                notifyCallback();
              }
              
              isInitialLoad = false;
              
            } else {
              console.log(`Park ${parkId} does not exist`);
              cleanupDogListeners();
              callback({
                success: false,
                error: 'Park not found'
              });
            }
          } catch (error) {
            console.error('Error processing park snapshot:', error);
            callback({
              success: false,
              error: error.message
            });
          }
        }, (error) => {
          console.error(`❌ Park listener error for ${parkId}:`, error);
          hasFirestoreError = true;
          
          // Clean up current listeners
          cleanupDogListeners();
          
          // Fall back to API polling if Firestore fails
          console.log(`🔄 Firestore failed for park ${parkId}, falling back to API polling`);
          const pollCleanup = setupApiPolling();
          
          // Store the polling cleanup function
          activeListeners.set(`park_${parkId}_poll`, pollCleanup);
          
          // Initial API call
          this.getDogsInPark(parkId).then(result => {
            if (result.success) {
              callback({
                success: true,
                dogs: result.dogs,
                parkData: { checkedInDogs: result.dogs }
              });
            }
          }).catch(apiError => {
            console.error(`❌ API fallback also failed for park ${parkId}:`, apiError);
            callback({
              success: false,
              error: 'Both Firestore and API failed'
            });
          });
        });
      } catch (error) {
        console.error(`❌ Failed to set up Firestore listener for park ${parkId}:`, error);
        hasFirestoreError = true;
        
        // Fall back to API polling immediately
        const pollCleanup = setupApiPolling();
        activeListeners.set(`park_${parkId}_poll`, pollCleanup);
        
        // Initial API call
        this.getDogsInPark(parkId).then(result => {
          if (result.success) {
            callback({
              success: true,
              dogs: result.dogs,
              parkData: { checkedInDogs: result.dogs }
            });
          }
        });
        
        // Return the polling cleanup function
        return () => {
          this.unsubscribeFromListener(`park_${parkId}_poll`);
        };
      }

      // Store the main unsubscribe function for cleanup
      const mainUnsubscribe = () => {
        console.log(`🔕 Unsubscribing from park ${parkId} and all dog listeners`);
        if (parkUnsubscribe) {
          try {
            parkUnsubscribe();
          } catch (error) {
            console.warn(`⚠️ Error unsubscribing from park ${parkId}:`, error);
          }
        }
        cleanupDogListeners();
      };
      
      activeListeners.set(`park_${parkId}`, mainUnsubscribe);

      // Return unsubscribe function
      return () => {
        this.unsubscribeFromListener(`park_${parkId}`);
      };

    } catch (error) {
      console.error('❌ Error setting up Firestore listener:', error);
      
      // Fall back to API polling
      console.log(`🔄 Setting up API polling fallback for park ${parkId} due to setup error`);
      const pollCleanup = setupApiPolling();
      activeListeners.set(`park_${parkId}_poll`, pollCleanup);
      
      // Initial API call
      this.getDogsInPark(parkId).then(result => {
        if (result.success) {
          callback({
            success: true,
            dogs: result.dogs,
            parkData: { checkedInDogs: result.dogs }
          });
        }
      });
      
      return () => {
        this.unsubscribeFromListener(`park_${parkId}_poll`);
      };
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