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
import DogParkService from '../services/DogParkService';

export default function DogParksScreen({ navigation }) {
  const [parks, setParks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParks();
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

  const handleCheckIn = (park) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Check in at ${park.name}?`);
      if (confirmed) {
        window.alert(`Successfully checked in at ${park.name}! 🐾`);
      }
    } else {
      Alert.alert(
        'Check In',
        `Check in at ${park.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check In',
            onPress: () => {
              Alert.alert('Success! 🐾', `Successfully checked in at ${park.name}!`);
            },
          },
        ]
      );
    }
  };

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
            {parks.map((park) => (
              <ParkCard key={park.id} park={park} />
            ))}
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
});