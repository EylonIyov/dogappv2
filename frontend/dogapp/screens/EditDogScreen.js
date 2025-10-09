import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DogService from "../services/DogService";
import CustomAlert, { DogImage } from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";
import { getApiUrl } from "../config";

export default function EditDogScreen({ route, navigation }) {
  const { dog } = route.params;
  const [dogData, setDogData] = useState({
    name: dog?.name || "",
    breed: dog?.breed || "",
    age: dog?.age?.toString() || "",
    energyLevel: dog?.energyLevel || "",
    playStyle: dog?.playStyle || [],
    emoji: dog?.emoji || "🐕",
  });

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Web-specific file input ref
  const fileInputRef = useRef(null);

  const [allBreeds, setAllBreeds] = useState([]);
  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const [showBreedSuggestions, setShowBreedSuggestions] = useState(false);
  const [breedsLoading, setBreedsLoading] = useState(false);

  const breedsCacheRef = useRef({ data: [], timestamp: null });
  const CACHE_DURATION = 5 * 60 * 1000;

  const dogEmojis = ["🐕", "🐶", "🦮", "🐕‍🦺", "🐩", "🐾"];

  const energyLevels = [
    "Low - Calm and relaxed",
    "Moderate - Balanced energy",
    "High - Very active and energetic",
    "Very High - Extremely active",
  ];

  const playStyles = [
    "Wrestle",
    "Chase",
    "Fetch",
    "Tug of War",
    "Hide and Seek",
    "Gentle Play",
    "Solo Play",
    "Social Play",
  ];

  const { alertState, hideAlert, showError, showSuccess, showWarning } =
    useAlerts();

  useEffect(() => {
    fetchBreeds();
    if (Platform.OS !== "web") {
      requestPermissions();
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showWarning(
          "We need access to your photo library to select dog pictures. Please enable this in your device settings.",
          "Permission Required"
        );
      }
    } catch (error) {
      console.error("Permission request error:", error);
    }
  };

  const isCacheValid = () => {
    const { data, timestamp } = breedsCacheRef.current;
    return (
      data.length > 0 && timestamp && Date.now() - timestamp < CACHE_DURATION
    );
  };

  const fetchBreeds = async () => {
    try {
      setBreedsLoading(true);

      if (isCacheValid()) {
        setAllBreeds(breedsCacheRef.current.data);
        setBreedsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl("/api/dog-breeds"));
      const data = await response.json();

      if (data.success) {
        breedsCacheRef.current = {
          data: data.breeds,
          timestamp: Date.now(),
        };
        setAllBreeds(data.breeds);
      } else {
        showError("Failed to load dog breeds");
      }
    } catch (error) {
      console.error("Error fetching breeds:", error);
      showError(
        "Failed to load dog breeds. Please check your connection and try again."
      );
    } finally {
      setBreedsLoading(false);
    }
  };

  const handleBreedInputChange = (text) => {
    setDogData((prev) => ({ ...prev, breed: text }));

    if (text.length >= 2) {
      const filtered = allBreeds
        .filter((breed) => breed.toLowerCase().includes(text.toLowerCase()))
        .slice(0, 8);

      setFilteredBreeds(filtered);
      setShowBreedSuggestions(filtered.length > 0);
    } else {
      setShowBreedSuggestions(false);
      setFilteredBreeds([]);
    }
  };

  const selectBreed = (breed) => {
    setDogData((prev) => ({ ...prev, breed }));
    setShowBreedSuggestions(false);
    setFilteredBreeds([]);
  };

  const handleSave = async () => {
    if (
      !dogData.name.trim() ||
      !dogData.breed.trim() ||
      !dogData.age.toString().trim()
    ) {
      showError(
        "Please fill in at least the name, breed, and age fields.",
        "Missing Information"
      );
      return;
    }

    const ageNumber = parseFloat(dogData.age);
    if (isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 30) {
      showError(
        "Please enter a valid age between 0 and 30 years.",
        "Invalid Age"
      );
      return;
    }

    try {
      const dogPayload = {
        name: dogData.name.trim(),
        breed: dogData.breed.trim(),
        age: ageNumber,
        energyLevel: dogData.energyLevel,
        playStyle: dogData.playStyle,
        emoji: dogData.emoji,
      };

      console.log("Updating dog with payload:", dogPayload);

      const result = await DogService.updateDog(dog.id, dogPayload);

      if (result.success) {
        let photoUploadSuccess = true;

        if (selectedPhoto) {
          setUploadingPhoto(true);
          const photoResult = await DogService.uploadDogPhoto(
            dog.id,
            selectedPhoto.uri
          );

          if (!photoResult.success) {
            console.warn("Photo upload failed:", photoResult.error);
            photoUploadSuccess = false;
          }
          setUploadingPhoto(false);
        }

        const successMessage =
          selectedPhoto && photoUploadSuccess
            ? `${dogData.name}'s profile has been updated with photo!`
            : selectedPhoto && !photoUploadSuccess
            ? `${dogData.name}'s profile has been updated, but photo upload failed.`
            : `${dogData.name}'s profile has been updated!`;

        showSuccess(successMessage, "Success! 🎉");
      } else {
        showError(result.error || "Failed to update dog. Please try again.");
      }
    } catch (error) {
      console.error("Error updating dog:", error);
      showError("Failed to update dog profile. Please try again.");
    }
  };

  const handleDelete = async () => {
    try {
      console.log("Deleting dog:", dog.id);
      const result = await DogService.deleteDog(dog.id);

      if (result.success) {
        showSuccess(
          `${dog.name} has been removed from your pack.`,
          "Dog Deleted"
        );
        // Navigate back to dashboard after successful deletion
        setTimeout(() => {
          navigation.navigate("Dashboard");
        }, 1500);
      } else {
        showError(
          result.error || "Failed to delete dog. Please try again.",
          "Delete Failed"
        );
      }
    } catch (error) {
      console.error("Error deleting dog:", error);
      showError("Failed to delete dog. Please try again.", "Delete Failed");
    }
  };

  const updateField = (field, value) => {
    setDogData((prev) => ({ ...prev, [field]: value }));
  };

  // Platform-specific photo selection
  const selectPhoto = async () => {
    try {
      console.log("Opening image picker... Platform:", Platform.OS);

      if (Platform.OS === "web") {
        // Web: Use HTML file input
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      } else {
        // Native: Use expo-image-picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        console.log("Image picker result:", result);

        if (!result.canceled && result.assets && result.assets.length > 0) {
          console.log("Photo selected:", result.assets[0]);
          setSelectedPhoto(result.assets[0]);
        } else {
          console.log("Photo selection was canceled");
        }
      }
    } catch (error) {
      console.error("Error opening image picker:", error);
      showError("Failed to open photo library. Please try again.", "Error");
    }
  };

  // Handle web file input change
  const handleWebFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showError("Please select an image file.", "Invalid File");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError("Image size must be less than 5MB.", "File Too Large");
        return;
      }

      // Create object URL for preview
      const uri = URL.createObjectURL(file);
      console.log("Web photo selected:", {
        uri,
        type: file.type,
        size: file.size,
      });

      setSelectedPhoto({
        uri,
        type: file.type,
        name: file.name,
        file, // Store the actual file object for upload
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      <View
        style={styles.content}
        onStartShouldSetResponder={
          Platform.OS !== "web" ? () => true : undefined
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Edit {dog.name}'s Profile 🐾</Text>
          <Text style={styles.subtitle}>Update your dog's information</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>📸 Dog's Photo</Text>

            {/* Hidden file input for web */}
            {Platform.OS === "web" && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleWebFileChange}
              />
            )}

            <TouchableOpacity
              style={styles.photoUploadContainer}
              onPress={selectPhoto}
            >
              {selectedPhoto ? (
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.selectedPhoto}
                />
              ) : dog.photo_url ? (
                <DogImage
                  source={{ uri: dog.photo_url }}
                  style={styles.selectedPhoto}
                  placeholder={dog.emoji || "🐕"}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    📷 Tap to select a photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {(selectedPhoto || dog.photo_url) && (
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => {
                  // Clean up object URL on web
                  if (Platform.OS === "web" && selectedPhoto?.uri) {
                    URL.revokeObjectURL(selectedPhoto.uri);
                  }
                  setSelectedPhoto(null);
                }}
              >
                <Text style={styles.removePhotoButtonText}>
                  {selectedPhoto ? "Remove New Photo" : "Change Photo"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {uploadingPhoto && (
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          )}

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
                  onPress={() => updateField("emoji", emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>🏷️ Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your dog's name"
              value={dogData.name}
              onChangeText={(value) => updateField("name", value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>🐕 Breed *</Text>
            <View style={styles.breedInputContainer}>
              <TextInput
                style={styles.input}
                placeholder={
                  breedsLoading
                    ? "Loading breeds..."
                    : "Type your dog's breed..."
                }
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
              onChangeText={(value) => updateField("age", value)}
              keyboardType="numeric"
            />
          </View>

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
                  onPress={() => updateField("energyLevel", level)}
                >
                  <Text
                    style={[
                      styles.energyLevelText,
                      dogData.energyLevel === level &&
                        styles.selectedEnergyLevelText,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>🎭 Play Style (Select multiple)</Text>
            <View style={styles.playStyleContainer}>
              {playStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.playStyleButton,
                    dogData.playStyle.includes(style) &&
                      styles.selectedPlayStyle,
                  ]}
                  onPress={() => {
                    const newPlayStyle = dogData.playStyle.includes(style)
                      ? dogData.playStyle.filter((s) => s !== style)
                      : [...dogData.playStyle, style];
                    updateField("playStyle", newPlayStyle);
                  }}
                >
                  <Text
                    style={[
                      styles.playStyleText,
                      dogData.playStyle.includes(style) &&
                        styles.selectedPlayStyleText,
                    ]}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>💾 Save Changes</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setConfirmDelete(true)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete {dog.name}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => {
          hideAlert();
          if (alertState.type === "success") {
            navigation.goBack();
          }
        }}
        confirmText={alertState.confirmText}
      />

      {/* Delete Confirmation Dialog */}
      <CustomAlert
        visible={confirmDelete}
        title="Delete Dog Profile?"
        message={`Are you sure you want to delete ${dog.name}'s profile? This action cannot be undone.`}
        type="warning"
        showCancel={true}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          handleDelete();
        }}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
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
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  emojiContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E9ECEF",
  },
  selectedEmoji: {
    borderColor: "#4A90E2",
    backgroundColor: "#E8F4FD",
  },
  emojiText: {
    fontSize: 24,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderButton: {
    flex: 0.48,
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  selectedGender: {
    borderColor: "#4A90E2",
    backgroundColor: "#E8F4FD",
  },
  genderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  buttonContainer: {
    padding: 20,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  autoCompleteOverlay: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  autoCompleteContainer: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  breedInputContainer: {
    position: "relative",
    zIndex: 1,
  },
  suggestionsDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderTopWidth: 0,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: "#000",
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
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  suggestionText: {
    fontSize: 16,
    color: "#333",
  },
  pickerContainer: {
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#333",
  },
  playStyleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  playStyleButton: {
    flexBasis: "48%",
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  selectedPlayStyle: {
    borderColor: "#4A90E2",
    backgroundColor: "#E8F4FD",
  },
  playStyleText: {
    fontSize: 14,
    color: "#333",
  },
  energyLevelContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  energyLevelButton: {
    flexBasis: "48%",
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  selectedEnergyLevel: {
    borderColor: "#4A90E2",
    backgroundColor: "#E8F4FD",
  },
  energyLevelText: {
    fontSize: 14,
    color: "#333",
  },
  selectedEnergyLevelText: {
    fontWeight: "bold",
    color: "#4A90E2",
  },
  bottomPadding: {
    height: 100,
    ...(Platform.OS === "web" && {
      height: 200,
    }),
  },
  photoUploadContainer: {
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    height: 200,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  photoPlaceholderText: {
    color: "#A0A0A0",
    fontSize: 16,
  },
  selectedPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removePhotoButton: {
    marginTop: 10,
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  removePhotoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  uploadingText: {
    textAlign: "center",
    color: "#666",
    marginTop: 10,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#FF4444",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
