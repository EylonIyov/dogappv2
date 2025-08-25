import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfig } from '../config';

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
}

export default DogParkService;