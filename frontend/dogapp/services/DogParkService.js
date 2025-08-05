import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

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

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = await getAuthToken();
  console.log('🔑 Making authenticated request to:', url);
  console.log('🔑 Token available:', !!token);
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
};

class DogParkService {
  static async getParks() {
    try {
      console.log('🏞️ Fetching dog parks from backend...');
      const response = await fetch(`${API_BASE_URL}/dog-parks`);
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dog-parks`, {
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dog-parks/${parkId}`, {
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dog-parks/${parkId}`, {
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
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dog-parks/${parkId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ dogIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in dogs');
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
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dog-parks/${parkId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ dogIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check out dogs');
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
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dog-parks/${parkId}/dogs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get dogs in park');
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