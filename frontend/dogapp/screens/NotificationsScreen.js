import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FriendService from '../services/FriendService';
import CustomAlert, { DogImage } from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequest, setProcessingRequest] = useState({});
  const { alertState, hideAlert, showError, showSuccess } = useAlerts();

  // Load notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      loadPendingRequests();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      const result = await FriendService.getNotifications();
      
      if (result.success) {
        console.log('✅ Notifications loaded:', result.notifications.length);
        setNotifications(result.notifications);
      } else {
        console.error('❌ Failed to load notifications:', result.error);
        showError(result.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('💥 Error loading notifications:', error);
      showError('Failed to load notifications. Please try again.');
    }
  };

  const loadPendingRequests = async () => {
    try {
      const result = await FriendService.getPendingFriendRequests();
      
      if (result.success) {
        console.log('✅ Pending requests loaded:', result.requests.length);
        setPendingRequests(result.requests);
      } else {
        console.error('❌ Failed to load pending requests:', result.error);
      }
    } catch (error) {
      console.error('💥 Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadPendingRequests()]);
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requestId, fromDogName, toDogName) => {
    try {
      setProcessingRequest(prev => ({ ...prev, [requestId]: 'accepting' }));
      
      const result = await FriendService.acceptFriendRequest(requestId);
      
      if (result.success) {
        showSuccess(`${fromDogName} and ${toDogName} are now friends! 🐕❤️🐕`);
        // Remove the request from pending list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        // Reload notifications to get the acceptance confirmation
        loadNotifications();
      } else {
        showError(result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showError('Failed to accept friend request. Please try again.');
    } finally {
      setProcessingRequest(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleDeclineRequest = async (requestId, fromDogName) => {
    try {
      setProcessingRequest(prev => ({ ...prev, [requestId]: 'declining' }));
      
      const result = await FriendService.declineFriendRequest(requestId);
      
      if (result.success) {
        showSuccess(`Friend request from ${fromDogName} declined`);
        // Remove the request from pending list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        showError(result.error || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      showError('Failed to decline friend request. Please try again.');
    } finally {
      setProcessingRequest(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await FriendService.markNotificationAsRead(notificationId);
      // Update the notification in the local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMs = now - time;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
  };

  const FriendRequestCard = ({ request }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <DogImage
          source={{ uri: request.from_dog.photo_url }}
          style={styles.requestDogPhoto}
          placeholder={request.from_dog.emoji || '🐕'}
        />
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>Friend Request</Text>
          <Text style={styles.requestMessage}>
            <Text style={styles.dogName}>{request.from_dog.name}</Text> wants to be friends with{' '}
            <Text style={styles.dogName}>{request.to_dog.name}</Text>
          </Text>
          <Text style={styles.requestPark}>at {request.park_name}</Text>
          <Text style={styles.requestTime}>
            {formatTimeAgo(request.created_at)}
          </Text>
        </View>
      </View>
      
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.declineButton, processingRequest[request.id] && styles.buttonDisabled]}
          onPress={() => handleDeclineRequest(request.id, request.from_dog.name)}
          disabled={!!processingRequest[request.id]}
        >
          <Text style={styles.declineButtonText}>
            {processingRequest[request.id] === 'declining' ? 'Declining...' : 'Decline'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.acceptButton, processingRequest[request.id] && styles.buttonDisabled]}
          onPress={() => handleAcceptRequest(request.id, request.from_dog.name, request.to_dog.name)}
          disabled={!!processingRequest[request.id]}
        >
          <Text style={styles.acceptButtonText}>
            {processingRequest[request.id] === 'accepting' ? 'Accepting...' : 'Accept'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const NotificationCard = ({ notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !notification.read && styles.unreadNotification]}
      onPress={() => {
        if (!notification.read) {
          markNotificationAsRead(notification.id);
        }
      }}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationTime}>
          {formatTimeAgo(notification.created_at)}
        </Text>
      </View>
      <Text style={styles.notificationMessage}>{notification.message}</Text>
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications 📱</Text>
        <Text style={styles.subtitle}>Friend requests and updates</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <>
            {/* Pending Friend Requests Section */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🤝 Pending Friend Requests ({pendingRequests.length})
                </Text>
                {pendingRequests.map((request) => (
                  <FriendRequestCard key={request.id} request={request} />
                ))}
              </View>
            )}

            {/* All Notifications Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                📋 All Notifications ({notifications.length})
              </Text>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🔔</Text>
                  <Text style={styles.emptyTitle}>No Notifications</Text>
                  <Text style={styles.emptyText}>
                    You're all caught up! Check back later for updates.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4FD',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  requestDogPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  requestMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    lineHeight: 20,
  },
  dogName: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  requestPark: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomPadding: {
    height: 50,
    ...(Platform.OS === 'web' && {
      height: 100,
    }),
  },
});