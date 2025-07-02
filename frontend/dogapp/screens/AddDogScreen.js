import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import DogService from '../services/DogService';

export default function AddDogScreen({ navigation }) {
  const [dogData, setDogData] = useState({
    name: '',
    breed: '',
    age: '',
    color: '',
    gender: '',
    emoji: '🐕',
    medicalNotes: '',
    favoriteActivities: '',
    specialNeeds: '',
  });
  const [loading, setLoading] = useState(false);
  const [breeds, setBreeds] = useState([]);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [breedsLoading, setBreedsLoading] = useState(true);

  const dogEmojis = ['🐕', '🐶', '🦮', '🐕‍🦺', '🐩', '🐾'];
  
  const dogColors = [
    'Black', 'Brown', 'White', 'Golden', 'Cream', 'Gray', 'Silver',
    'Red', 'Blue', 'Chocolate', 'Tan', 'Sable', 'Brindle', 'Merle',
    'Parti-color', 'Tricolor', 'Black and Tan', 'Black and White',
    'Brown and White', 'Other'
  ];

  useEffect(() => {
    fetchBreeds();
  }, []);

  const fetchBreeds = async () => {
    try {
      setBreedsLoading(true);
      const response = await fetch('http://localhost:3000/api/dog-breeds');
      const data = await response.json();
      
      if (data.success) {
        setBreeds(data.breeds);
      } else {
        Alert.alert('Error', 'Failed to load dog breeds');
      }
    } catch (error) {
      console.error('Error fetching breeds:', error);
      Alert.alert('Error', 'Failed to load dog breeds. Please try again.');
    } finally {
      setBreedsLoading(false);
    }
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

    setLoading(true);
    try {
      // Prepare data for API
      const dogPayload = {
        name: dogData.name.trim(),
        breed: dogData.breed.trim(),
        age: ageNumber,
        emoji: dogData.emoji,
        notes: [
          dogData.color ? `Color: ${dogData.color}` : '',
          dogData.gender ? `Gender: ${dogData.gender}` : '',
          dogData.favoriteActivities ? `Favorite Activities: ${dogData.favoriteActivities}` : '',
          dogData.medicalNotes ? `Medical Notes: ${dogData.medicalNotes}` : '',
          dogData.specialNeeds ? `Special Needs: ${dogData.specialNeeds}` : '',
        ].filter(note => note).join('\n'),
      };

      const result = await DogService.addDog(dogPayload);

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          `${dogData.name} has been added to your pack!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to add dog. Please try again.');
      }
    } catch (error) {
      console.error('Error saving dog:', error);
      Alert.alert('Error', 'Failed to save dog profile. Please try again.');
    } finally {
      setLoading(false);
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

  const renderBreedPicker = () => (
    <Modal visible={showBreedPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Breed</Text>
            <TouchableOpacity onPress={() => setShowBreedPicker(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>
          {breedsLoading ? (
            <Text style={styles.loadingText}>Loading breeds...</Text>
          ) : (
            <FlatList
              data={breeds}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    dogData.breed === item && styles.selectedPickerItem
                  ]}
                  onPress={() => {
                    updateField('breed', item);
                    setShowBreedPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    dogData.breed === item && styles.selectedPickerItemText
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  const renderColorPicker = () => (
    <Modal visible={showColorPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Color</Text>
            <TouchableOpacity onPress={() => setShowColorPicker(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={dogColors}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  dogData.color === item && styles.selectedPickerItem
                ]}
                onPress={() => {
                  updateField('color', item);
                  setShowColorPicker(false);
                }}
              >
                <Text style={[
                  styles.pickerItemText,
                  dogData.color === item && styles.selectedPickerItemText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowBreedPicker(true)}
              >
                <Text style={[
                  styles.dropdownText,
                  !dogData.breed && styles.placeholderText
                ]}>
                  {dogData.breed || 'Select breed'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>🎂 Age (years) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2.5"
                  value={dogData.age}
                  onChangeText={(value) => updateField('age', value)}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>🎨 Color</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowColorPicker(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !dogData.color && styles.placeholderText
                  ]}>
                    {dogData.color || 'Select color'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>⚥ Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    dogData.gender === 'Male' && styles.selectedGender,
                  ]}
                  onPress={() => updateField('gender', 'Male')}
                >
                  <Text style={styles.genderText}>♂️ Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    dogData.gender === 'Female' && styles.selectedGender,
                  ]}
                  onPress={() => updateField('gender', 'Female')}
                >
                  <Text style={styles.genderText}>♀️ Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Additional Information */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>🏃 Favorite Activities</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Playing fetch, Swimming, Long walks"
                value={dogData.favoriteActivities}
                onChangeText={(value) => updateField('favoriteActivities', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🏥 Medical Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any medical conditions, allergies, or special care instructions"
                value={dogData.medicalNotes}
                onChangeText={(value) => updateField('medicalNotes', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>⭐ Special Needs</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special requirements or behavioral notes"
                value={dogData.specialNeeds}
                onChangeText={(value) => updateField('specialNeeds', value)}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </ScrollView>

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

      {renderBreedPicker()}
      {renderColorPicker()}
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
});