import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import DogService from '../services/DogService';

const { width } = Dimensions.get('window');

// Memoized DogCard to avoid re-render on parent state changes
const DogCard = memo(({ dog, onPressProfile, onPressEdit, onPressDelete }) => (
  <TouchableOpacity style={styles.dogCard} onPress={() => onPressProfile(dog)}>
    <View style={styles.dogHeader}>
      {dog.photo_url ? (
        <Image source={{ uri: dog.photo_url }} style={styles.dogPhoto} contentFit="cover" cachePolicy="memory-disk" placeholder="🐕" transition={200} />
      ) : (
        <Text style={styles.dogEmoji}>{dog.emoji || '🐕'}</Text>
      )}
      <View style={styles.dogInfo}>
        <Text style={styles.dogName}>{dog.name}</Text>
        <Text style={styles.dogBreed}>{dog.breed}</Text>
        <Text style={styles.dogAge}>{dog.age} years old</Text>
      </View>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.editButton} onPress={() => onPressEdit(dog)}>
        <Text style={styles.editButtonText}>✏️ Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => onPressDelete(dog.id)}>
        <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
));

export default function DashboardScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMainMenu, setShowMainMenu] = useState(false);
  // Animation value for menu
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Reload dogs when screen comes into focus (when returning from other screens)
  useFocusEffect(
    React.useCallback(() => {
      loadDogs();
    }, [])
  );

  useEffect(() => {
    loadDogs();
  }, []);

  const loadDogs = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dogs from API...');
      const result = await DogService.getDogs();
      
      if (result.success) {
        console.log('✅ Dogs loaded successfully:', result.dogs.length, 'dogs found');
        
        // Log photo URLs for each dog
        result.dogs.forEach((dog, index) => {
          console.log(`🐕 Dog ${index + 1}: ${dog.name}`);
          console.log(`   - Photo URL: ${dog.photo_url || 'No photo'}`);
          console.log(`   - Has photo_url field: ${dog.photo_url !== undefined}`);
          console.log(`   - Photo URL length: ${dog.photo_url ? dog.photo_url.length : 0}`);
        });
        
        setDogs(result.dogs);
      } else {
        console.error('❌ Failed to load dogs:', result.error);
        Alert.alert('Error', result.error || 'Failed to load dogs');
      }
    } catch (error) {
      console.error('💥 Error loading dogs:', error);
      Alert.alert('Error', 'Failed to load dogs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteDog = async (dogId) => {
    if (Platform.OS === 'web') {
      // Web: use window.confirm to avoid blocking
      const confirmed = window.confirm('Are you sure you want to delete this dog profile?');
      if (!confirmed) return;
      try {
        const result = await DogService.deleteDog(dogId);
        if (result.success) {
          setDogs(dogs.filter(dog => dog.id !== dogId));
          window.alert('Dog profile deleted successfully');
        } else {
          window.alert(result.error || 'Failed to delete dog');
        }
      } catch (error) {
        console.error('Error deleting dog:', error);
        window.alert('Failed to delete dog. Please try again.');
      }
    } else {
      // Native: use Alert.alert for confirmation dialog
      Alert.alert(
        'Delete Dog Profile',
        'Are you sure you want to delete this dog profile?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await DogService.deleteDog(dogId);
                if (result.success) {
                  setDogs(dogs.filter(dog => dog.id !== dogId));
                  Alert.alert('Success', 'Dog profile deleted successfully');
                } else {
                  Alert.alert('Error', result.error || 'Failed to delete dog');
                }
              } catch (error) {
                console.error('Error deleting dog:', error);
                Alert.alert('Error', 'Failed to delete dog. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        // animate menu close
        closeMenu();
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      // On web, we log out directly to avoid issues with the Alert component
      // and provide a quicker user experience.
      performLogout();
    } else {
      // On native, we show a confirmation dialog.
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  // Stable callbacks to prevent re-creation on each render
  const handleNavigateProfile = useCallback(
    (dog) => navigation.navigate('DogProfile', { dog }),
    [navigation]
  );
  const handleNavigateEdit = useCallback(
    (dog) => navigation.navigate('EditDog', { dog }),
    [navigation]
  );
  const handleDelete = useCallback(
    (id) => deleteDog(id),
    [deleteDog]
  );

  // Animates menu closing then hides
  const closeMenu = useCallback(() => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowMainMenu(false));
  }, [menuAnim]);

  // Animate menu when toggling
  useEffect(() => {
    if (showMainMenu) {
      menuAnim.setValue(0);
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showMainMenu]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>Welcome to your pack! 🎾</Text>
              <Text style={styles.subText}>
                {currentUser?.fullName && `${currentUser.fullName} • `}
                {dogs.length === 0 
                  ? "You haven't added any dogs yet" 
                  : `You have ${dogs.length} furry friend${dogs.length > 1 ? 's' : ''}`
                }
              </Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                if (showMainMenu) closeMenu();
                else setShowMainMenu(true);
              }}
            >
              <Text style={styles.menuText}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🐕 Loading your pack...</Text>
          </View>
        ) : dogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐕‍🦺</Text>
            <Text style={styles.emptyTitle}>No Dogs Yet</Text>
            <Text style={styles.emptyText}>
              Add your first furry friend to get started!
            </Text>
          </View>
        ) : (
          <View style={styles.dogsContainer}>
            {dogs.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onPressProfile={handleNavigateProfile}
                onPressEdit={handleNavigateEdit}
                onPressDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Main Menu Overlay */}
      {showMainMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.overlayBackground}
            onPress={closeMenu}
          />
          <Animated.View
            style={[
              styles.mainMenu,
              {
                opacity: menuAnim,
                transform: [
                  {
                    translateY: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>🐕 Main Menu</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeMenu}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMainMenu(false);
                navigation.navigate('AddDog');
              }}
            >
              <Text style={styles.menuItemEmoji}>🐾</Text>
              <Text style={styles.menuItemText}>Add New Dog</Text>
            </TouchableOpacity>
            
            {dogs.length > 0 && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMainMenu(false);
                  navigation.navigate('DogProfile', { dog: dogs[0] });
                }}
              >
                <Text style={styles.menuItemEmoji}>👁️</Text>
                <Text style={styles.menuItemText}>View Recent Dog</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMainMenu(false);
                loadDogs();
              }}
            >
              <Text style={styles.menuItemEmoji}>🔄</Text>
              <Text style={styles.menuItemText}>Refresh Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                navigation.navigate('DogParks');
              }}
            >
              <Text style={styles.menuItemEmoji}>🏞️</Text>
              <Text style={styles.menuItemText}>Find Dog Parks</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />
            
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutMenuItem]}
              onPress={handleLogout}
            >
              <Text style={styles.menuItemEmoji}>🚪</Text>
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
         </View>
       )}

      {/* Main Add Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddDog')}
        >
          <Text style={styles.addButtonText}>+ Add New Dog</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#E8F4FD',
    textAlign: 'left',
  },
  menuButton: {
    backgroundColor: 'transparent',
    padding: 10,
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
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
  dogsContainer: {
    padding: 15,
  },
  dogCard: {
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
  dogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dogEmoji: {
    fontSize: 50,
    marginRight: 15,
  },
  dogPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dogBreed: {
    fontSize: 16,
    color: '#4A90E2',
    marginBottom: 2,
  },
  dogAge: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.45,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.45,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'relative',
    padding: 20,
  },
  addButton: {
    backgroundColor: '#FF6B6B',
    padding: 18,
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
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  mainMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: 'transparent',
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  menuItemEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 10,
  },
  logoutMenuItem: {
    backgroundColor: '#FF6B6B',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});