import React, { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const dogEmojis = ['🐕', '🐶', '🦮', '🐕‍🦺', '🐩', '🐾'];

  const handleSave = async () => {
    // Validation
    if (!dogData.name.trim() || !dogData.breed.trim() || !dogData.age.trim()) {
      Alert.alert('Missing Information', 'Please fill in at least the name, breed, and age fields.');
      return;
    }

    try {
      // Load existing dogs
      const existingDogs = await AsyncStorage.getItem('dogs');
      const dogs = existingDogs ? JSON.parse(existingDogs) : [];

      // Create new dog with unique ID
      const newDog = {
        ...dogData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      // Add to dogs array
      const updatedDogs = [...dogs, newDog];

      // Save to storage
      await AsyncStorage.setItem('dogs', JSON.stringify(updatedDogs));

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
    } catch (error) {
      console.error('Error saving dog:', error);
      Alert.alert('Error', 'Failed to save dog profile. Please try again.');
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
              <TextInput
                style={styles.input}
                placeholder="e.g., Golden Retriever, Mixed Breed"
                value={dogData.breed}
                onChangeText={(value) => updateField('breed', value)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>🎂 Age *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Years"
                  value={dogData.age}
                  onChangeText={(value) => updateField('age', value)}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>🎨 Color</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Brown, Black"
                  value={dogData.color}
                  onChangeText={(value) => updateField('color', value)}
                />
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
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>🐾 Add to My Pack!</Text>
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
});