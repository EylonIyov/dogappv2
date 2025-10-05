import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DogParkService from '../services/DogParkService';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [parks, setParks] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [selectedDog, setSelectedDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 40.7128, // Default to New York City
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [parksCheckedInDogs, setParksCheckedInDogs] = useState({});
  const mapRef = useRef(null);
  const unsubscribeRefs = useRef({});

  useEffect(() => {
    loadParks();
    getUserLocation();

    return () => {
      // Cleanup listeners
      Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      DogParkService.cleanupAllListeners();
    };
  }, []);

  const getUserLocation = () => {
    // Request location permission and get user's current location
    if (Platform.OS === 'web' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newRegion = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };
          setRegion(newRegion);
          if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion, 1000);
          }
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  };

  const loadParks = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dog parks...');

      const unsubscribe = DogParkService.subscribeToAllParks((result) => {
        if (result.success) {
          console.log('✅ Parks loaded:', result.parks.length);
          setParks(result.parks);

          // Subscribe to each park's checked-in dogs
          result.parks.forEach(park => {
            setupParkListener(park.id);
          });
        } else {
          console.error('❌ Failed to load parks:', result.error);
        }
        setLoading(false);
      });

      unsubscribeRefs.current.allParks = unsubscribe;
    } catch (error) {
      console.error('Error loading parks:', error);
      setLoading(false);
    }
  };

  const setupParkListener = (parkId) => {
    if (unsubscribeRefs.current[`park_${parkId}`]) {
      return;
    }

    const unsubscribe = DogParkService.subscribeToCheckedInDogs(parkId, (result) => {
      if (result.success) {
        setParksCheckedInDogs(prev => {
          const newState = { ...prev };
          newState[parkId] = [...result.dogs];
          return newState;
        });
      }
    });

    unsubscribeRefs.current[`park_${parkId}`] = unsubscribe;
  };

  const handleMarkerPress = (park) => {
    const dogs = parksCheckedInDogs[park.id] || [];
    setSelectedPark(park);
    
    // If there are dogs at this park, show the first one by default
    if (dogs.length > 0) {
      setSelectedDog(dogs[0]);
    } else {
      setSelectedDog(null);
    }
  };

  const handleDogMarkerPress = (dog, park) => {
    setSelectedDog(dog);
    setSelectedPark(park);
  };

  const renderCustomMarker = (dog, park) => {
    return (
      <Marker
        key={`dog-${dog.id}`}
        coordinate={{
          latitude: park.latitude + (Math.random() - 0.5) * 0.001, // Slight offset for multiple dogs
          longitude: park.longitude + (Math.random() - 0.5) * 0.001,
        }}
        onPress={() => handleDogMarkerPress(dog, park)}
      >
        <View style={styles.dogMarkerContainer}>
          {dog.photo_url ? (
            <Image
              source={{ uri: dog.photo_url }}
              style={styles.dogMarkerImage}
            />
          ) : (
            <View style={styles.dogMarkerPlaceholder}>
              <Text style={styles.dogMarkerEmoji}>{dog.emoji || '🐕'}</Text>
            </View>
          )}
          {/* Green checkmark indicator */}
          <View style={styles.checkmarkBadge}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        </View>
      </Marker>
    );
  };

  const renderBottomSheet = () => {
    if (!selectedDog) return null;

    const distance = selectedPark ? '1.2 km' : 'Unknown'; // Calculate real distance later

    return (
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetContent}>
          <View style={styles.dogInfoContainer}>
            <Text style={styles.dogName}>
              {selectedDog.name}
              <View style={styles.checkmarkInline}>
                <Text style={styles.checkmarkIconInline}> ✓</Text>
              </View>
            </Text>
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceIcon}>📍</Text>
              <Text style={styles.distanceText}>{distance} away from you</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.heartButton}
            onPress={() => console.log('Add to favorites')}
          >
            <Text style={styles.heartIcon}>🤍</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNavigationBar = () => {
    return (
      <View style={styles.navigationBar}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}}
        >
          <Text style={styles.navIcon}>📍</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.navIcon}>🐾</Text>
          <Text style={styles.navLabel}>Dogs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B6B6B" />
          <Text style={styles.loadingText}>Loading nearby parks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {parks.map((park) => {
          const dogs = parksCheckedInDogs[park.id] || [];
          
          return dogs.map((dog) => renderCustomMarker(dog, park));
        })}
      </MapView>

      {/* Map Title */}
      <View style={styles.mapTitleContainer}>
        <Text style={styles.mapTitle}>Map</Text>
      </View>

      {/* Bottom Sheet */}
      {renderBottomSheet()}

      {/* Navigation Bar */}
      {renderNavigationBar()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  map: {
    width: width,
    height: height,
  },
  mapTitleContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dogMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogMarkerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#4CD964',
    backgroundColor: '#FFF',
  },
  dogMarkerPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#4CD964',
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogMarkerEmoji: {
    fontSize: 30,
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CD964',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  checkmarkIcon: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSheetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dogInfoContainer: {
    flex: 1,
  },
  dogName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  checkmarkInline: {
    display: 'inline',
  },
  checkmarkIconInline: {
    color: '#4CD964',
    fontSize: 24,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  distanceText: {
    fontSize: 16,
    color: '#666',
  },
  heartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 24,
  },
  navigationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonActive: {
    // Add active state styling if needed
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#333',
    fontWeight: '600',
  },
});