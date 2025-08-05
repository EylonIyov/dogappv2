import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import DogParkService from '../services/DogParkService';
import DogService from '../services/DogService';
import { useAuth } from '../contexts/AuthContext';

export default function DogParksScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [parks, setParks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dogs, setDogs] = useState([]);
  const [showDogSelection, setShowDogSelection] = useState(false);
  const [selectedPark, setSelectedPark] = useState(null);
  const [selectedDogs, setSelectedDogs] = useState([]);

  useEffect(() => {
    loadParks();
    loadDogs();
  }, []);

  const loadParks = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dog parks from Firestore...');
      const result = await DogParkService.getParks();
      
      if (result.success) {
        console.log('✅ Parks loaded successfully:', result.parks.length, 'parks found');
        setParks(result.parks);
      } else {
        console.error('❌ Failed to load parks:', result.error);
        if (Platform.OS === 'web') {
          window.alert(result.error || 'Failed to load dog parks');
        } else {
          Alert.alert('Error', result.error || 'Failed to load dog parks');
        }
      }
    } catch (error) {
      console.error('Error loading parks:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to load dog parks. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to load dog parks. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDogs = async () => {
    try {
      console.log('🐕 Loading user dogs...');
      const result = await DogService.getDogs();
      
      if (result.success) {
        console.log('✅ Dogs loaded successfully:', result.dogs.length, 'dogs found');
        setDogs(result.dogs);
      } else {
        console.error('❌ Failed to load dogs:', result.error);
      }
    } catch (error) {
      console.error('Error loading dogs:', error);
    }
  };

  const handleCheckIn = (park) => {
    if (dogs.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('You need to add at least one dog before checking in at parks.');
      } else {
        Alert.alert('No Dogs Found', 'You need to add at least one dog before checking in at parks.');
      }
      return;
    }
    
    setSelectedPark(park);
    setSelectedDogs([]);
    setShowDogSelection(true);
  };

  const confirmCheckIn = () => {
    if (selectedDogs.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please select at least one dog to check in.');
      } else {
        Alert.alert('No Dogs Selected', 'Please select at least one dog to check in.');
      }
      return;
    }

    // Call the backend to check in the dogs
    handleCheckInSubmit();
  };

  const handleCheckInSubmit = async () => {
    try {
      const dogIds = selectedDogs.map(dog => dog.id);
      const result = await DogParkService.checkInDogs(selectedPark.id, dogIds);
      
      if (result.success) {
        
        setShowDogSelection(false);
        setSelectedPark(null);
        
        // Navigate to confirmation screen with park and dogs data
        navigation.navigate('CheckInConfirmation', {
          park: selectedPark,
          checkedInDogs: selectedDogs
        });
        
        setSelectedDogs([]);
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || 'Failed to check in dogs');
        } else {
          Alert.alert('Error', result.error || 'Failed to check in dogs');
        }
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to check in dogs. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to check in dogs. Please try again.');
      }
    }
  };

  const toggleDogSelection = (dog) => {
    setSelectedDogs(prev => {
      const isSelected = prev.find(d => d.id === dog.id);
      if (isSelected) {
        return prev.filter(d => d.id !== dog.id);
      } else {
        return [...prev, dog];
      }
    });
  };

  const DogSelectionModal = () => (
    showDogSelection && (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Dogs to Check In</Text>
            <Text style={styles.modalSubtitle}>at {selectedPark?.name}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDogSelection(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.dogsList} showsVerticalScrollIndicator={false}>
            {dogs.map((dog) => {
              const isSelected = selectedDogs.find(d => d.id === dog.id);
              return (
                <TouchableOpacity
                  key={dog.id}
                  style={[styles.dogItem, isSelected && styles.dogItemSelected]}
                  onPress={() => toggleDogSelection(dog)}
                >
                  <View style={styles.dogItemContent}>
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
                    <View style={styles.dogItemInfo}>
                      <Text style={styles.dogItemName}>{dog.name}</Text>
                      <Text style={styles.dogItemBreed}>{dog.breed}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDogSelection(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, selectedDogs.length === 0 && styles.confirmButtonDisabled]}
              onPress={confirmCheckIn}
            >
              <Text style={styles.confirmButtonText}>
                Check In ({selectedDogs.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  );

  const ParkCard = ({ park }) => (
    <View style={styles.parkCard}>
      <View style={styles.parkHeader}>
        <View style={styles.parkInfo}>
          <Text style={styles.parkName}>{park.name}</Text>
          <Text style={styles.parkAddress}>{park.address}</Text>
        </View>
      </View>

      <View style={styles.amenitiesContainer}>
        <Text style={styles.amenitiesTitle}>Amenities:</Text>
        <View style={styles.amenitiesList}>
          {park.amenities.map((amenity, index) => (
            <View key={index} style={styles.amenityTag}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={() => handleCheckIn(park)}
        >
          <Text style={styles.checkInButtonText}>🐾 Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={() => {
            // Future: Open maps/directions
            if (Platform.OS === 'web') {
              window.alert('Directions feature coming soon!');
            } else {
              Alert.alert('Info', 'Directions feature coming soon!');
            }
          }}
        >
          <Text style={styles.directionsButtonText}>🗺️ Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dog Parks Near You 🐕</Text>
        <Text style={styles.subtitle}>Find the perfect spot for your furry friend</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Finding nearby dog parks...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.parksContainer}>
            {parks.map((park, index) => {
              return <ParkCard key={park.id} park={park} />;
            })}
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <DogSelectionModal />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  parksContainer: {
    padding: 15,
  },
  parkCard: {
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
  parkHeader: {
    marginBottom: 15,
  },
  parkInfo: {
    flex: 1,
  },
  parkName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  parkAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  amenitiesContainer: {
    marginBottom: 15,
  },
  amenitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityTag: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  amenityText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  checkInButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  directionsButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomPadding: {
    height: 50,
    ...(Platform.OS === 'web' && {
      height: 100,
    }),
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 20,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#4A90E2',
    textAlign: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: -5,
    right: 0,
    padding: 5,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  dogsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  dogItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  dogItemSelected: {
    backgroundColor: '#E8F4FD',
    borderColor: '#4A90E2',
  },
  dogItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dogPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  dogEmoji: {
    fontSize: 24,
    lineHeight: 50,
    width: 50,
    height: 50,
    textAlign: 'center',
  },
  dogItemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  dogItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  dogItemBreed: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});