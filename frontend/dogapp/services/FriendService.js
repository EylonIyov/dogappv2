import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

class FriendService {
  // Get auth token from AsyncStorage
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Add a friend to a dog
  async addFriend(dogId, friendDogId) {
    try {
      console.log('🤝 Adding friend via API:', dogId, 'wants to befriend', friendDogId);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/dogs/${dogId}/friends/${friendDogId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Friend added successfully:', data.message);
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to add friend:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error adding friend:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Remove a friend from a dog
  async removeFriend(dogId, friendDogId) {
    try {
      console.log('💔 Removing friend via API:', dogId, 'unfriending', friendDogId);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/dogs/${dogId}/friends/${friendDogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Friend removed successfully');
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to remove friend:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error removing friend:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get friends list for a dog
  async getFriends(dogId) {
    try {
      console.log('👥 Getting friends list via API for dog:', dogId);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/dogs/${dogId}/friends`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Friends list loaded successfully:', data.friendsCount, 'friends found');
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to get friends list:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error getting friends:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
}

export default new FriendService();