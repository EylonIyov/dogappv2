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

  // Send a friend request (replaces direct friend adding)
  async sendFriendRequest(dogId, friendDogId) {
    try {
      console.log('🤝 Sending friend request via API:', dogId, 'wants to befriend', friendDogId);
      
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
        console.log('✅ Friend request sent successfully:', data.message);
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to send friend request:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error sending friend request:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Accept a friend request
  async acceptFriendRequest(requestId) {
    try {
      console.log('✅ Accepting friend request via API:', requestId);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Friend request accepted successfully:', data.message);
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to accept friend request:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error accepting friend request:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Decline a friend request
  async declineFriendRequest(requestId) {
    try {
      console.log('❌ Declining friend request via API:', requestId);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/friend-requests/${requestId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Friend request declined successfully');
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to decline friend request:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error declining friend request:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get pending friend requests for the current user
  async getPendingFriendRequests() {
    try {
      console.log('📋 Getting pending friend requests via API');
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/friend-requests/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Pending friend requests loaded successfully:', data.count, 'requests found');
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to get pending friend requests:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error getting pending friend requests:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get notifications for the current user
  async getNotifications() {
    try {
      console.log('📱 Getting notifications via API');
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Notifications loaded successfully:', data.notifications.length, 'notifications found');
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to get notifications:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error getting notifications:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Mark a notification as read
  async markNotificationAsRead(notificationId) {
    try {
      console.log('📖 Marking notification as read via API:', notificationId);
      
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Notification marked as read successfully');
        return { success: true, ...data };
      } else {
        console.error('❌ Failed to mark notification as read:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Network error marking notification as read:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Legacy method kept for backward compatibility - now sends a friend request instead
  async addFriend(dogId, friendDogId) {
    return this.sendFriendRequest(dogId, friendDogId);
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