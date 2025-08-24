import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DogService from '../services/DogService';
import CustomAlert from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';

export default function AddDogScreen({ navigation }) {
  const [dogData, setDogData] = useState({
    name: '',
    breed: '',
    age: '',
    energyLevel: '',
    playStyle: [],
    emoji: '🐕',
  });
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Auto-complete state
  const [allBreeds, setAllBreeds] = useState([]);
  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const [showBreedSuggestions, setShowBreedSuggestions] = useState(false);
  const [breedsLoading, setBreedsLoading] = useState(false);

  // Refs for caching
  const breedsCacheRef = useRef({ data: [], timestamp: null });
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const dogEmojis = ['🐕', '🐶', '🦮', '🐕‍🦺', '🐩', '🐾'];
  
  const energyLevels = [
    "Low - Calm and relaxed",
    "Moderate - Balanced energy", 
    "High - Very active and energetic",
    "Very High - Extremely active"
  ];

  const playStyles = [
    "Wrestle",
    "Chase", 
    "Fetch",
    "Tug of War",
    "Hide and Seek",
    "Gentle Play",
    "Solo Play",
    "Social Play"
  ];

  const { alertState, hideAlert, showError, showSuccess, showWarning } = useAlerts();

  useEffect(() => {
    fetchBreeds();
    requestPermissions();
  }, []);

  // Request camera/media library permissions
  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showWarning(
          'We need access to your photo library to select dog pictures. Please enable this in your device settings.',
          'Permission Required'
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  // Check if cache is valid
  const isCacheValid = () => {
    const { data, timestamp } = breedsCacheRef.current;
    return data.length > 0 && timestamp && (Date.now() - timestamp < CACHE_DURATION);
  };

  const fetchBreeds = async () => {
    try {
      setBreedsLoading(true);
      
      // Check cache first
      if (isCacheValid()) {
        setAllBreeds(breedsCacheRef.current.data);
        setBreedsLoading(false);
        return;
      }

      const response = await fetch('http://ec2-16-171-173-92.eu-north-1.compute.amazonaws.com:3000/api/dog-breeds');
      const data = await response.json();
      
      if (data.success) {
        // Update cache
        breedsCacheRef.current = {
          data: data.breeds,
          timestamp: Date.now()
        };
        setAllBreeds(data.breeds);
      } else {
        showError('Failed to load dog breeds', 'Error');
      }
    } catch (error) {
      console.error('Error fetching breeds:', error);
      showError('Failed to load dog breeds. Please check your connection and try again.', 'Error');
    } finally {
      setBreedsLoading(false);
    }
  };

  const handleBreedInputChange = (text) => {
    setDogData(prev => ({ ...prev, breed: text }));
    
    if (text.length >= 2) { // Only show suggestions after 2 characters
      // Filter breeds based on input
      const filtered = allBreeds.filter(breed =>
        breed.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 8); // Limit to 8 suggestions for better UI
      
      setFilteredBreeds(filtered);
      setShowBreedSuggestions(filtered.length > 0);
    } else {
      setShowBreedSuggestions(false);
      setFilteredBreeds([]);
    }
  };

  const selectBreed = (breed) => {
    setDogData(prev => ({ ...prev, breed }));
    setShowBreedSuggestions(false);
    setFilteredBreeds([]);
  };

  const validateAge = (ageText) => {
    // Remove any non-numeric characters except decimal point
    const cleanedAge = ageText.replace(/[^0-9.]/g, '');
    
    // Check if it's a valid number
    const ageNumber = parseFloat(cleanedAge);
    
    if (isNaN(ageNumber)) {
      return '';
    }
    
    // Ensure age is within reasonable bounds (0-30 years)
    if (ageNumber < 0 || ageNumber > 30) {
      return '';
    }
    
    // Limit to 1 decimal place
    return Math.round(ageNumber * 10) / 10;
  };

  const handleSave = async () => {
    // Validation - only check required fields
    if (!dogData.name.trim() || !dogData.breed.trim() || !dogData.age.toString().trim()) {
      showError('Please fill in the name, breed, and age fields.', 'Missing Information');
      return;
    }

    // Validate age is a real number
    const ageNumber = parseFloat(dogData.age);
    if (isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 30) {
      showError('Please enter a valid age between 0 and 30 years.', 'Invalid Age');
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API with new structure
      const dogPayload = {
        name: dogData.name.trim(),
        breed: dogData.breed.trim(),
        age: ageNumber,
        energyLevel: dogData.energyLevel,
        playStyle: dogData.playStyle,
        emoji: dogData.emoji,
      };

      // First create the dog
      const result = await DogService.addDog(dogPayload);

      if (result.success) {
        let photoUploadSuccess = true;
        
        // If a photo was selected, upload it
        if (selectedPhoto) {
          setUploadingPhoto(true);
          const photoResult = await DogService.uploadDogPhoto(result.dog.id, selectedPhoto.uri);
          
          if (!photoResult.success) {
            console.warn('Photo upload failed:', photoResult.error);
            photoUploadSuccess = false;
          }
          setUploadingPhoto(false);
        }

        const successMessage = selectedPhoto && photoUploadSuccess 
          ? `${dogData.name} has been added to your pack with photo!`
          : selectedPhoto && !photoUploadSuccess
          ? `${dogData.name} has been added to your pack, but photo upload failed.`
          : `${dogData.name} has been added to your pack!`;

        showSuccess(successMessage, 'Success! 🎉');
      } else {
        showError(result.error || 'Failed to add dog. Please try again.');
      }
    } catch (error) {
      console.error('Error saving dog:', error);
      showError('Failed to save dog profile. Please try again.');
    } finally {
      setLoading(false);
      setUploadingPhoto(false);
    }
  };

  const updateField = (field, value) => {
    if (field === 'age') {
      const validatedAge = validateAge(value);
      setDogData(prev => ({ ...prev, [field]: validatedAge.toString() }));
    } else {
      setDogData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Your Furry Friend 🐾</Text>
            <Text style={styles.subtitle}>Tell us about your dog</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Emoji Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choose an emoji for your dog:</Text>
              <View style={styles.emojiContainer}>
                {dogEmojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiButton,
                      dogData.emoji === emoji && styles.selectedEmoji,
                    ]}
                    onPress={() => updateField('emoji', emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Basic Information */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>🏷️ Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your dog's name"
                value={dogData.name}
                onChangeText={(value) => updateField('name', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🐕 Breed *</Text>
              <View style={styles.breedInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={breedsLoading ? "Loading breeds..." : "Type your dog's breed..."}
                  value={dogData.breed}
                  onChangeText={handleBreedInputChange}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!breedsLoading}
                  onFocus={() => {
                    if (dogData.breed.length > 0) {
                      handleBreedInputChange(dogData.breed);
                    }
                  }}
                />
                {showBreedSuggestions && filteredBreeds.length > 0 && (
                  <View style={styles.suggestionsDropdown}>
                    <ScrollView
                      style={styles.suggestionsList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {filteredBreeds.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.suggestionItem}
                          onPress={() => selectBreed(item)}
                        >
                          <Text style={styles.suggestionText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎂 Age (years) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2.5"
                value={dogData.age}
                onChangeText={(value) => updateField('age', value)}
                keyboardType="numeric"
              />
            </View>

            {/* Energy Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>⚡ Energy Level</Text>
              <View style={styles.energyLevelContainer}>
                {energyLevels.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.energyLevelButton,
                      dogData.energyLevel === level && styles.selectedEnergyLevel,
                    ]}
                    onPress={() => updateField('energyLevel', level)}
                  >
                    <Text style={[
                      styles.energyLevelText,
                      dogData.energyLevel === level && styles.selectedEnergyLevelText
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Play Style */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎭 Play Style (Select multiple)</Text>
              <View style={styles.playStyleContainer}>
                {playStyles.map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.playStyleButton,
                      dogData.playStyle.includes(style) && styles.selectedPlayStyle,
                    ]}
                    onPress={() => {
                      const newPlayStyle = dogData.playStyle.includes(style)
                        ? dogData.playStyle.filter(s => s !== style)
                        : [...dogData.playStyle, style];
                      updateField('playStyle', newPlayStyle);
                    }}
                  >
                    <Text style={[
                      styles.playStyleText,
                      dogData.playStyle.includes(style) && styles.selectedPlayStyleText
                    ]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Photo Upload - New Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>📸 Dog's Photo</Text>
              <TouchableOpacity
                style={styles.photoUploadContainer}
                onPress={async () => {
                  try {
                    console.log('Opening image picker...');
                    
                    // Open image picker
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.8, // Reduce quality slightly for better performance
                    });

                    console.log('Image picker result:', result);

                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      console.log('Photo selected:', result.assets[0]);
                      setSelectedPhoto(result.assets[0]);
                    } else {
                      console.log('Photo selection was canceled or no assets returned');
                    }
                  } catch (error) {
                    console.error('Error opening image picker:', error);
                    showError('Failed to open photo library. Please try again.', 'Error');
                  }
                }}
              >
                {selectedPhoto ? (
                  <Image
                    source={{ uri: selectedPhoto.uri }}
                    style={styles.selectedPhoto}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>📷 Tap to select a photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {selectedPhoto && (
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Text style={styles.removePhotoButtonText}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploadingPhoto && (
              <Text style={styles.uploadingText}>Uploading photo...</Text>
            )}
          </View>

          {/* Save Button moved inside ScrollView */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? '🐾 Adding to Pack...' : '🐾 Add to My Pack!'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom padding for web scrolling */}
          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => {
          hideAlert();
          // Navigate back on success
          if (alertState.type === 'success') {
            navigation.goBack();
          }
        }}
        confirmText={alertState.confirmText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      height: 'auto', // Allow dynamic height on web
    }),
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: 'auto', // Allow dynamic height
      minHeight: '100%',
    }),
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
    ...(Platform.OS === 'web' && {
      minHeight: 'auto', // Remove minimum height constraint
      paddingBottom: 150, // Extra padding for web
      justifyContent: 'flex-start', // Don't center content on web
    }),
  },
  content: {
    padding: 20,
    minHeight: '100%', // Web-specific: ensure content takes full height
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  selectedEmoji: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  emojiText: {
    fontSize: 24,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 0.48,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  selectedGender: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    padding: 20,
    marginTop: 'auto', // Web-specific: push button to bottom
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#FF6B6B',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  selectedPickerItem: {
    backgroundColor: '#E8F4FD',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedPickerItemText: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  dropdownButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#A0A0A0',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#333',
  },
  autoCompleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoCompleteContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  breedInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderTopWidth: 0,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  energyLevelContainer: {
    gap: 8,
  },
  energyLevelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedEnergyLevel: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  energyLevelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedEnergyLevelText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  playStyleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playStyleButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    minWidth: '48%',
  },
  selectedPlayStyle: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  playStyleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedPlayStyleText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  photoUploadContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    height: 200,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  photoPlaceholderText: {
    color: '#A0A0A0',
    fontSize: 16,
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhotoButton: {
    marginTop: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  removePhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  bottomPadding: {
    height: 50,
    ...(Platform.OS === 'web' && {
      height: 200, // Much larger padding for web
    }),
  },
});