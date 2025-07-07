import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import DogService from '../services/DogService';

export default function EditDogScreen({ route, navigation }) {
  const { dog } = route.params;
  const [dogData, setDogData] = useState({
    name: dog.name || '',
    breed: dog.breed || '',
    age: dog.age ? dog.age.toString() : '', // Convert age to string for TextInput
    energyLevel: dog.energy_level || dog.energyLevel || '', // Handle both snake_case and camelCase
    playStyle: dog.play_style || dog.playStyle || [], // Handle both snake_case and camelCase
    emoji: dog.emoji || '🐕',
  });

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

  useEffect(() => {
    fetchBreeds();
  }, []);

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

      const response = await fetch('http://localhost:3000/api/dog-breeds');
      const data = await response.json();
      
      if (data.success) {
        // Update cache
        breedsCacheRef.current = {
          data: data.breeds,
          timestamp: Date.now()
        };
        setAllBreeds(data.breeds);
      } else {
        Alert.alert('Error', 'Failed to load dog breeds');
      }
    } catch (error) {
      console.error('Error fetching breeds:', error);
      Alert.alert('Error', 'Failed to load dog breeds. Please check your connection and try again.');
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

  const handleSave = async () => {
    // Validation
    if (!dogData.name.trim() || !dogData.breed.trim() || !dogData.age.toString().trim()) {
      Alert.alert('Missing Information', 'Please fill in at least the name, breed, and age fields.');
      return;
    }

    // Validate age is a real number
    const ageNumber = parseFloat(dogData.age);
    if (isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 30) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 0 and 30 years.');
      return;
    }

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

      // Use DogService to update dog in Firestore
      const result = await DogService.updateDog(dog.id, dogPayload);

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          `${dogData.name}'s profile has been updated!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update dog. Please try again.');
      }
    } catch (error) {
      console.error('Error updating dog:', error);
      Alert.alert('Error', 'Failed to update dog profile. Please try again.');
    }
  };

  const updateField = (field, value) => {
    setDogData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit {dog.name}'s Profile 🐾</Text>
            <Text style={styles.subtitle}>Update your dog's information</Text>
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
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>💾 Save Changes</Text>
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
  content: {
    padding: 20,
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
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#4A90E2',
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
  autoCompleteOverlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoCompleteContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
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
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  playStyleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playStyleButton: {
    flexBasis: '48%',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedPlayStyle: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  playStyleText: {
    fontSize: 14,
    color: '#333',
  },
  energyLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  energyLevelButton: {
    flexBasis: '48%',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedEnergyLevel: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  energyLevelText: {
    fontSize: 14,
    color: '#333',
  },
  selectedEnergyLevelText: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
});