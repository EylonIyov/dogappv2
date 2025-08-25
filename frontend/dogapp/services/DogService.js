import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfig } from '../config';

class DogService {
  // Get auth token from storage
  async getAuthToken() {
    return await AsyncStorage.getItem('authToken');
  }

  // Helper method to make API requests with retry logic
  async makeApiRequest(endpoint, options = {}) {
    const config = getApiConfig();
    const url = getApiUrl(endpoint);
    
    let lastError;
    
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        const response = await fetch(url, {
          timeout: config.timeout,
          ...options,
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
  }

  // Get all dogs for the current user
  async getDogs() {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await this.makeApiRequest('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dogs: data.dogs };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Get dogs error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Add a new dog
  async addDog(dogData) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await this.makeApiRequest('/api/dogs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dogData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dog: data.dog };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Add dog error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Update an existing dog
  async updateDog(dogId, dogData) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dogData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dog: data.dog };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Update dog error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Delete a dog
  async deleteDog(dogId) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Delete dog error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get a specific dog
  async getDog(dogId) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dog: data.dog };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Get dog error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Upload a dog photo
  async uploadDogPhoto(dogId, photoUri) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'dog-photo.jpg',
      });

      const response = await this.makeApiRequest(`/api/dogs/${dogId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, photoUrl: data.photoUrl };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
}

export default new DogService();