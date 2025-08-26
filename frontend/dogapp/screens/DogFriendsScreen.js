import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FriendService from '../services/FriendService';
import CustomAlert, { DogImage } from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';

export default function DogFriendsScreen({ route, navigation }) {
  const { dog } = route.params;
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { alertState, hideAlert, showError, showSuccess, showInfo } = useAlerts();

  // Load friends when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFriends();
    }, [dog.id])
  );

  const loadFriends = async () => {
    try {
      setLoading(true);
      console.log('🐕 Loading friends for dog:', dog.name);
      
      const result = await FriendService.getFriends(dog.id);
      
      if (result.success) {
        console.log('✅ Friends loaded successfully:', result.friends.length, 'friends found');
        setFriends(result.friends);
      } else {
        console.error('❌ Failed to load friends:', result.error);
        showError(result.error || 'Failed to load friends');
      }
    } catch (error) {
      console.error('💥 Error loading friends:', error);
      showError('Failed to load friends. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  };

  const removeFriend = async (friendId, friendName) => {
    try {
      console.log('💔 Starting removeFriend process...');
      console.log('💔 Dog ID:', dog.id);
      console.log('💔 Friend ID:', friendId);
      console.log('💔 Dog name:', dog.name);
      console.log('💔 Friend name:', friendName);
      
      const result = await FriendService.removeFriend(dog.id, friendId);
      
      console.log('💔 API Response:', result);
      
      if (result.success) {
        console.log('✅ Successfully removed friend from API');
        showSuccess(`${dog.name} and ${friendName} are no longer friends.`);
        // Remove the friend from the local state
        setFriends(prev => {
          const newFriends = prev.filter(friend => friend.id !== friendId);
          console.log('💔 Updated friends list:', newFriends.length, 'friends remaining');
          return newFriends;
        });
      } else {
        console.error('❌ API returned error:', result.error);
        showError(result.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('💥 Exception in removeFriend:', error);
      showError('Failed to remove friend. Please try again.');
    }
  };

  const confirmRemoveFriend = (friend) => {
    console.log('💔 [DogFriendsScreen] confirmRemoveFriend called with friend:', friend);
    console.log('💔 [DogFriendsScreen] Friend ID:', friend.id);
    console.log('💔 [DogFriendsScreen] Friend name:', friend.name);
    console.log('💔 [DogFriendsScreen] Dog ID:', dog.id);
    console.log('💔 [DogFriendsScreen] Dog name:', dog.name);
    
    showInfo(
      `Are you sure you want to remove ${friend.name} from ${dog.name}'s friends list?`,
      'Remove Friend',
      () => {
        console.log('💔 [DogFriendsScreen] User confirmed removal, calling removeFriend...');
        removeFriend(friend.id, friend.name);
      },
      'Remove',
      'Cancel'
    );
  };

  const formatPlayStyle = (playStyle) => {
    if (!playStyle || !Array.isArray(playStyle) || playStyle.length === 0) {
      return 'Not specified';
    }
    return playStyle.join(', ');
  };

  const formatEnergyLevel = (energyLevel) => {
    if (!energyLevel) return 'Unknown';
    
    if (energyLevel.includes('Very High') || energyLevel.includes('very high')) {
      return 'Very High';
    } else if (energyLevel.includes('High') || energyLevel.includes('high')) {
      return 'High';
    } else if (energyLevel.includes('Moderate') || energyLevel.includes('moderate')) {
      return 'Moderate';
    } else if (energyLevel.includes('Low') || energyLevel.includes('low')) {
      return 'Low';
    } else {
      return energyLevel;
    }
  };

  const FriendCard = ({ friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendHeader}>
        <View style={styles.friendImageContainer}>
          <DogImage
            source={{ uri: friend.photo_url }}
            style={styles.friendPhoto}
            placeholder={friend.emoji || '🐕'}
          />
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendBreed}>{friend.breed}</Text>
          <Text style={styles.friendAge}>{friend.age} years old</Text>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            console.log('💔 [DogFriendsScreen] Remove button pressed for friend:', friend.name);
            console.log('💔 [DogFriendsScreen] About to call confirmRemoveFriend...');
            confirmRemoveFriend(friend);
          }}
        >
          <Text style={styles.removeButtonText}>💔</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.friendDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>⚡ Energy Level:</Text>
          <Text style={styles.detailValue}>{formatEnergyLevel(friend.energy_level)}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>🎭 Play Style:</Text>
          <Text style={styles.detailValue}>{formatPlayStyle(friend.play_style)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{dog.name}'s Friends 🐕‍🦺</Text>
        <Text style={styles.subtitle}>
          {friends.length === 0 
            ? 'No friends yet' 
            : `${friends.length} friend${friends.length === 1 ? '' : 's'}`
          }
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {friends.length > 0 ? (
            <View style={styles.friendsContainer}>
              {friends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyTitle}>No Friends Yet</Text>
              <Text style={styles.emptyText}>
                {dog.name} hasn't made any friends yet. Visit a dog park to meet other dogs and send friend requests!
              </Text>
              <TouchableOpacity
                style={styles.findParksButton}
                onPress={() => navigation.navigate('DogParks')}
              >
                <Text style={styles.findParksButtonText}>🏞️ Find Dog Parks</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        showCancel={alertState.showCancel}
        onConfirm={alertState.onConfirm}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  friendsContainer: {
    padding: 20,
  },
  friendCard: {
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
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  friendImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  friendBreed: {
    fontSize: 16,
    color: '#4A90E2',
    marginBottom: 2,
  },
  friendAge: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  removeButtonText: {
    fontSize: 20,
  },
  friendDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    minWidth: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  findParksButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  findParksButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 50,
    ...(Platform.OS === 'web' && {
      height: 100,
    }),
  },
});