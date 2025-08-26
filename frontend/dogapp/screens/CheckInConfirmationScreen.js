import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import DogParkService from '../services/DogParkService';
import FriendService from '../services/FriendService';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import CustomAlert, { DogImage } from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';
import config from '../config';

export default function CheckInConfirmationScreen({ route, navigation }) {
  const { park, checkedInDogs } = route.params;
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otherDogs, setOtherDogs] = useState([]);
  const [loadingOtherDogs, setLoadingOtherDogs] = useState(true);
  const [socket, setSocket] = useState(null);
  const [friendRequests, setFriendRequests] = useState({}); // Track friend request states: { "dogId-friendDogId": "pending" | "sent" | false }
  const { alertState, hideAlert, showError, showSuccess, showInfo } = useAlerts();
  const [friendSelectModalVisible, setFriendSelectModalVisible] = useState(false);
  const [selectedFriendDog, setSelectedFriendDog] = useState(null);
  const [checkoutConfirmVisible, setCheckoutConfirmVisible] = useState(false);

  useEffect(() => {
    setupLiveUpdates();
    
    // Set navigation options to hide the back button
    navigation.setOptions({
      headerLeft: () => null,
      gestureEnabled: false,
    });

    // Cleanup WebSocket when component unmounts
    return () => {
      if (socket) {
        console.log('📡 Cleaning up WebSocket connection on unmount');
        socket.emit('leavePark', park.id);
        socket.disconnect();
      }
    };
  }, [navigation]);

  const setupLiveUpdates = async () => {
    try {
      setLoadingOtherDogs(true);
      console.log('📡 Setting up live updates (WebSocket) for park:', park.id);
      
      // Load initial data
      await loadOtherDogs();
      
      // Create WebSocket connection
      const newSocket = io(config.api.baseUrl);
      
      newSocket.on('connect', () => {
        console.log('🟢 WebSocket connected:', newSocket.id);
        // Join the specific park room
        newSocket.emit('joinPark', park.id);
      });

      newSocket.on('parkUpdate', (data) => {
        if (data.parkId === park.id) {
          console.log('📡 Received real-time park update:', data);
          
          // Filter out current user's dogs
          const myDogIds = checkedInDogs.map(dog => dog.id);
          const otherDogsInPark = data.dogs.filter(dog => 
            dog.owner_id !== currentUser?.id && !myDogIds.includes(dog.id)
          );

          console.log('📡 Updating other dogs list with', otherDogsInPark.length, 'dogs');
          setOtherDogs(otherDogsInPark);
          setLoadingOtherDogs(false);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('🔴 WebSocket disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('📡 WebSocket connection error:', error);
        // Fallback to manual loading if WebSocket fails
        loadOtherDogs();
      });

      setSocket(newSocket);
      console.log('📡 Live WebSocket setup complete');

    } catch (error) {
      console.error('Error setting up live updates:', error);
      loadOtherDogs();
    }
  };

  const loadOtherDogs = async () => {
    try {
      setLoadingOtherDogs(true);
      console.log('🐕 Loading other dogs in park...');
      
      const result = await DogParkService.getDogsInPark(park.id);
      
      if (result.success) {
        // Filter out the current user's dogs
        const myDogIds = checkedInDogs.map(dog => dog.id);
        const otherDogsInPark = result.dogs.filter(dog => 
          dog.owner_id !== currentUser?.id && !myDogIds.includes(dog.id)
        );
        
        console.log('✅ Found', otherDogsInPark.length, 'other dogs in park');
        
        // Debug: Log photo URLs for each dog
        otherDogsInPark.forEach((dog, index) => {
          console.log(`🐕 Other Dog ${index + 1}: ${dog.name}`);
          console.log(`   - Photo URL: ${dog.photo_url || 'No photo'}`);
          console.log(`   - Photo URL type: ${typeof dog.photo_url}`);
          console.log(`   - Photo URL length: ${dog.photo_url ? dog.photo_url.length : 0}`);
          console.log(`   - Energy level: ${dog.energy_level || 'Unknown'}`);
        });
        
        setOtherDogs(otherDogsInPark);
      } else {
        console.error('❌ Failed to load other dogs:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading other dogs:', error);
    } finally {
      setLoadingOtherDogs(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckoutConfirmVisible(true);
  };

  const confirmCheckOut = async () => {
    setCheckoutConfirmVisible(false);
    console.log('🚪 Frontend: handleCheckOut called');
    try {
      setLoading(true);
      const dogNames = checkedInDogs.map(dog => dog.name).join(', ');
      const dogIds = checkedInDogs.map(dog => dog.id);
      
      console.log('🚪 Frontend: Dog names:', dogNames);
      console.log('🚪 Frontend: Dog IDs:', dogIds);
      console.log('🚪 Frontend: Park ID:', park.id);

      console.log('🚪 Frontend: User confirmed checkout, calling API...');
      // Call the backend to check out the dogs
      const result = await DogParkService.checkOutDogs(park.id, dogIds);
      
      console.log('🚪 Frontend: API response:', result);
      if (result.success) {
        const successMessage = `Successfully checked out ${dogNames} from ${park.name}! 🐾`;
        showSuccess(successMessage, 'Success! 🐾');
        
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        const errorMessage = result.error || 'Failed to check out. Please try again.';
        showError(errorMessage);
      }
    } catch (error) {
      console.error('🚪 Frontend: Error during check-out:', error);
      showError('Failed to check out. Please try again.');
    } finally {
      console.log('🚪 Frontend: Setting loading to false');
      setLoading(false);
    }
  };

  // Handle adding a friend
  const handleAddFriend = async (myDogId, friendDogId, friendDogName) => {
    try {
      // Set to pending state (processing)
      setFriendRequests(prev => ({ ...prev, [`${myDogId}-${friendDogId}`]: 'pending' }));
      
      console.log('🤝 Attempting to send friend request:', myDogId, 'wants to befriend', friendDogId);
      
      const result = await FriendService.sendFriendRequest(myDogId, friendDogId);
      
      if (result.success) {
        const successMessage = result.message || `Friend request sent to ${friendDogName}'s owner! 🐕💌`;
        showSuccess(successMessage, 'Friend Request Sent! 🐕💌');
        
        // Set to sent state (permanently disabled with different text)
        setFriendRequests(prev => ({ ...prev, [`${myDogId}-${friendDogId}`]: 'sent' }));
      } else {
        const errorMessage = result.error || 'Failed to send friend request. Please try again.';
        showError(errorMessage);
        
        // Reset to allow retry
        setFriendRequests(prev => ({ ...prev, [`${myDogId}-${friendDogId}`]: false }));
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showError('Failed to send friend request. Please try again.');
      
      // Reset to allow retry
      setFriendRequests(prev => ({ ...prev, [`${myDogId}-${friendDogId}`]: false }));
    }
  };

  // Show friend request modal for selecting which dog to use for the friend request
  const showFriendRequestOptions = (friendDog) => {
    if (checkedInDogs.length === 1) {
      // If only one dog, directly add friend
      handleAddFriend(checkedInDogs[0].id, friendDog.id, friendDog.name);
      return;
    }

    // If multiple dogs, show selection modal
    setSelectedFriendDog(friendDog);
    setFriendSelectModalVisible(true);
  };

  // Helper function to check if two dogs are already friends
  const areDogsAlreadyFriends = (myDogId, otherDogId, otherDog) => {
    // Check if otherDog's friends array includes any of my dog IDs
    const otherDogFriends = otherDog.friends || [];
    return otherDogFriends.includes(myDogId);
  };

  // Helper function to check if any of my dogs are friends with the other dog
  const isAnyOfMyDogsFriendsWith = (otherDog) => {
    return checkedInDogs.some(myDog => areDogsAlreadyFriends(myDog.id, otherDog.id, otherDog));
  };

  // Prevent back navigation on this screen (mobile only)
  useFocusEffect(
    React.useCallback(() => {
      // Only handle back button on mobile platforms where BackHandler exists
      if (Platform.OS === 'android') {
        let BackHandler;
        try {
          BackHandler = require('react-native').BackHandler;
        } catch (e) {
          // BackHandler not available, skip
          return () => {};
        }

        const onBackPress = () => {
          // Do nothing on back press
          return true;
        };

        BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => {
          BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        };
      }
      
      // No cleanup needed for web or iOS (iOS uses gestureEnabled: false)
      return () => {};
    }, [])
  );

  const getSimpleEnergyLevel = (energyLevel) => {
    if (!energyLevel) return 'Unknown';
    
    const level = energyLevel.toLowerCase();
    
    if (level.includes('high') || level.includes('very high')) {
      return 'High';
    } else if (level.includes('moderate') || level.includes('medium')) {
      return 'Medium';
    } else if (level.includes('low') || level.includes('calm')) {
      return 'Low';
    } else {
      return 'Unknown';
    }
  };

  // Helper function to get button text based on request state
  const getFriendButtonText = (requestState) => {
    switch (requestState) {
      case 'pending':
        return 'Sending...';
      case 'sent':
        return 'Request Sent';
      default:
        return 'Add Friend';
    }
  };

  // Helper function to check if button should be disabled
  const isFriendButtonDisabled = (requestState) => {
    return requestState === 'pending' || requestState === 'sent';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>✅ Successfully Checked In!</Text>
          <Text style={styles.subtitle}>You're all set at {park.name}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.parkInfo}>
            <Text style={styles.parkName}>📍 {park.name}</Text>
            <Text style={styles.parkAddress}>{park.address}</Text>
          </View>

          <View style={styles.dogsSection}>
            <Text style={styles.sectionTitle}>Your Dogs Checked In:</Text>
            {checkedInDogs.map((dog, index) => (
              <View key={dog.id} style={styles.dogItem}>
                <DogImage
                  source={{ uri: dog.photo_url }}
                  style={styles.dogPhoto}
                  placeholder={dog.emoji || '🐕'}
                />
                <View style={styles.dogInfo}>
                  <Text style={styles.dogName}>{dog.name}</Text>
                  <Text style={styles.dogBreed}>{dog.breed}</Text>
                </View>
                <Text style={styles.checkInStatus}>✅ Checked In</Text>
              </View>
            ))}
          </View>

          {/* Other Dogs Section */}
          <View style={styles.otherDogsSection}>
            <Text style={styles.sectionTitle}>🐕 Other Dogs at the Park:</Text>
            {loadingOtherDogs ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading other dogs...</Text>
              </View>
            ) : otherDogs.length > 0 ? (
              <View style={styles.otherDogsContainer}>
                {otherDogs.map((dog) => (
                  <View key={dog.id} style={styles.otherDogItem}>
                    {/* Dog Image/Emoji on the left */}
                    <View style={styles.otherDogImageContainer}>
                      <DogImage
                        source={{ uri: dog.photo_url }}
                        style={styles.otherDogPhoto}
                        placeholder={dog.emoji || '🐕'}
                      />
                    </View>
                    
                    {/* Dog Info in the middle */}
                    <View style={styles.otherDogInfo}>
                      <View style={styles.dogNameContainer}>
                        <Text style={styles.otherDogName} numberOfLines={1} ellipsizeMode="tail">
                          {dog.name || 'Unknown Dog'}
                        </Text>
                        {isAnyOfMyDogsFriendsWith(dog) && (
                          <Text style={styles.friendStatus}>Friend</Text>
                        )}
                      </View>
                      <Text style={styles.otherDogEnergyLevel} numberOfLines={1} ellipsizeMode="tail">
                        Energy: {getSimpleEnergyLevel(dog.energy_level)}
                      </Text>
                    </View>

                    {/* Add Friend Button on the right - only show if not already friends */}
                    {!isAnyOfMyDogsFriendsWith(dog) && (
                      <TouchableOpacity
                        style={[
                          styles.addFriendButton,
                          isFriendButtonDisabled(friendRequests[`${checkedInDogs[0]?.id}-${dog.id}`]) && styles.buttonDisabled
                        ]}
                        onPress={() => showFriendRequestOptions(dog)}
                        disabled={isFriendButtonDisabled(friendRequests[`${checkedInDogs[0]?.id}-${dog.id}`])}
                      >
                        <Text style={styles.addFriendButtonText}>
                          {getFriendButtonText(friendRequests[`${checkedInDogs[0]?.id}-${dog.id}`])}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDogs}>
                <Text style={styles.noDogsText}>No other dogs at the park right now</Text>
                <Text style={styles.noDogsSubtext}>You have the park to yourself! 🎾</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.checkOutButton, loading && styles.buttonDisabled]}
            onPress={handleCheckOut}
            disabled={loading}
          >
            <Text style={styles.checkOutButtonText}>
              {loading ? 'Processing...' : '🚪 Check Out'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for a Great Park Visit:</Text>
          <Text style={styles.tipText}>• Keep your dogs hydrated</Text>
          <Text style={styles.tipText}>• Watch for signs of overheating</Text>
          <Text style={styles.tipText}>• Make sure to clean up after your pets</Text>
          <Text style={styles.tipText}>• Supervise interactions with other dogs</Text>
        </View>

        {/* Bottom padding for better scrolling */}
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

      {/* Checkout Confirmation Modal */}
      <CustomAlert
        visible={checkoutConfirmVisible}
        title="Check Out"
        message={`Check out ${checkedInDogs.map(dog => dog.name).join(', ')} from ${park.name}?`}
        type="warning"
        onClose={() => setCheckoutConfirmVisible(false)}
        confirmText="Check Out"
        onConfirm={confirmCheckOut}
      />

      {/* Friend Selection Modal */}
      {friendSelectModalVisible && selectedFriendDog && (
        <Modal
          transparent={true}
          visible={friendSelectModalVisible}
          animationType="fade"
          onRequestClose={() => setFriendSelectModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Add {selectedFriendDog.name} as Friend</Text>
              <Text style={styles.modalSubtitle}>Which of your dogs wants to make a new friend?</Text>
              
              {checkedInDogs.map((dog) => (
                <TouchableOpacity
                  key={dog.id}
                  style={styles.dogSelectionItem}
                  onPress={() => {
                    setFriendSelectModalVisible(false);
                    handleAddFriend(dog.id, selectedFriendDog.id, selectedFriendDog.name);
                  }}
                >
                  <Text style={styles.dogSelectionEmoji}>{dog.emoji || '🐕'}</Text>
                  <Text style={styles.dogSelectionName}>{dog.name}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setFriendSelectModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parkInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  parkName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  parkAddress: {
    fontSize: 16,
    color: '#666',
  },
  dogsSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  dogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dogEmoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  dogPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  otherDogPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  dogInfo: {
    flex: 1,
    paddingRight: 10,
  },
  dogName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  dogBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dogAge: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  checkInStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  checkOutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkOutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipsContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
    lineHeight: 20,
  },
  otherDogsSection: {
    marginTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  otherDogsContainer: {
    maxHeight: 200,
  },
  otherDogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#E1F5FE',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
    minHeight: 60,
  },
  otherDogImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogEmojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherDogInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dogNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  otherDogName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 18,
    marginRight: 8,
  },
  friendStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  otherDogEnergyLevel: {
    fontSize: 14,
    color: '#666',
    lineHeight: 16,
    flexShrink: 1,
  },
  energyBadge: {
    backgroundColor: '#B2EBF2',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  energyText: {
    color: '#00796B',
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  noDogs: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDogsText: {
    color: '#666',
    fontSize: 16,
  },
  noDogsSubtext: {
    color: '#00796B',
    fontSize: 14,
    marginTop: 5,
  },
  addFriendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  dogSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
  },
  dogSelectionEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  dogSelectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 20,
  },
});