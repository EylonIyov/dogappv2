import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

class DogService {
  // Get auth token from storage
  async getAuthToken() {
    return await AsyncStorage.getItem('authToken');
  }

  // Get all dogs for the current user
  async getDogs() {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/dogs`, {
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

      const response = await fetch(`${API_BASE_URL}/dogs`, {
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

      const response = await fetch(`${API_BASE_URL}/dogs/${dogId}`, {
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

      const response = await fetch(`${API_BASE_URL}/dogs/${dogId}`, {
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

      const response = await fetch(`${API_BASE_URL}/dogs/${dogId}`, {
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
}

export default new DogService();