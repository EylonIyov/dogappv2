import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import DogParkService from '../services/DogParkService';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function CheckInConfirmationScreen({ route, navigation }) {
  const { park, checkedInDogs } = route.params;
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otherDogs, setOtherDogs] = useState([]);
  const [loadingOtherDogs, setLoadingOtherDogs] = useState(true);

  useEffect(() => {
    loadOtherDogs();
    
    // Set navigation options to hide the back button
    navigation.setOptions({
      headerLeft: () => null,
      gestureEnabled: false,
    });
  }, [navigation]);

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
    console.log('🚪 Frontend: handleCheckOut called');
    try {
      setLoading(true);
      const dogNames = checkedInDogs.map(dog => dog.name).join(', ');
      const dogIds = checkedInDogs.map(dog => dog.id);
      
      console.log('🚪 Frontend: Dog names:', dogNames);
      console.log('🚪 Frontend: Dog IDs:', dogIds);
      console.log('🚪 Frontend: Park ID:', park.id);
      
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(`Check out ${dogNames} from ${park.name}?`);
        if (!confirmed) {
          console.log('🚪 Frontend: User cancelled checkout');
          setLoading(false);
          return;
        }
      } else {
        const confirmed = await new Promise((resolve) => {
          Alert.alert(
            'Check Out',
            `Check out ${dogNames} from ${park.name}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Check Out', onPress: () => resolve(true) },
            ]
          );
        });
        
        if (!confirmed) {
          console.log('🚪 Frontend: User cancelled checkout');
          setLoading(false);
          return;
        }
      }

      console.log('🚪 Frontend: User confirmed checkout, calling API...');
      // Call the backend to check out the dogs
      const result = await DogParkService.checkOutDogs(park.id, dogIds);
      
      console.log('🚪 Frontend: API response:', result);
      if (result.success) {
        const successMessage = `Successfully checked out ${dogNames} from ${park.name}! 🐾`;
        
        if (Platform.OS === 'web') {
          window.alert(successMessage);
        } else {
          Alert.alert('Success! 🐾', successMessage);
        }
        
        navigation.goBack();
      } else {
        const errorMessage = result.error || 'Failed to check out. Please try again.';
        
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      console.error('🚪 Frontend: Error during check-out:', error);
      const errorMessage = 'Failed to check out. Please try again.';
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      console.log('🚪 Frontend: Setting loading to false');
      setLoading(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
                {dog.photo_url ? (
                  <Image
                    source={{ uri: dog.photo_url }}
                    style={styles.dogPhoto}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    placeholder="🐕"
                    transition={200}
                  />
                ) : (
                  <Text style={styles.dogEmoji}>{dog.emoji || '🐕'}</Text>
                )}
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
              <ScrollView style={styles.otherDogsList} showsVerticalScrollIndicator={false}>
                {otherDogs.map((dog) => (
                  <View key={dog.id} style={styles.otherDogItem}>
                    {/* Dog Image/Emoji on the left */}
                    <View style={styles.otherDogImageContainer}>
                      {dog.photo_url && dog.photo_url !== '' && dog.photo_url !== '/' && dog.photo_url !== 'null' && dog.photo_url !== 'undefined' ? (
                        <Image
                          source={{ uri: dog.photo_url }}
                          style={styles.otherDogPhoto}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                          transition={200}
                          onError={(error) => {
                            console.log('❌ Failed to load image for dog:', dog.name, 'URL:', dog.photo_url, 'Error:', error);
                          }}
                          onLoad={() => {
                            console.log('✅ Successfully loaded image for dog:', dog.name);
                          }}
                        />
                      ) : (
                        <View style={styles.dogEmojiContainer}>
                          <Text style={styles.dogEmoji}>{dog.emoji || '🐕'}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Dog Info on the right */}
                    <View style={styles.otherDogInfo}>
                      <Text style={styles.otherDogName} numberOfLines={1} ellipsizeMode="tail">
                        {dog.name || 'Unknown Dog'}
                      </Text>
                      <Text style={styles.otherDogEnergyLevel} numberOfLines={1} ellipsizeMode="tail">
                        Energy: {getSimpleEnergyLevel(dog.energy_level)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
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
  otherDogsList: {
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
  otherDogName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
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
});