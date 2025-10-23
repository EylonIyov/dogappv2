import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ImageBackground,
  Image,
} from "react-native";
import DogParkService from "../services/DogParkService";
import DogService from "../services/DogService";
import CustomAlert, { DogImage } from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";
import { useAuth } from "../contexts/AuthContext";
import BottomNavigation from "../components/BottomNavigation";

// Default park image
const defaultParkImage = require("../assets/Group 1171274734.png");

export default function DogParksScreen({ navigation, route }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedPark, setSelectedPark] = useState(null);
  const [myDogs, setMyDogs] = useState([]);
  const [myCheckedInDogs, setMyCheckedInDogs] = useState([]);
  const [otherDogsAtPark, setOtherDogsAtPark] = useState([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [dogsToCheckIn, setDogsToCheckIn] = useState([]);
  const { alertState, hideAlert, showError, showSuccess, showInfo } =
    useAlerts();

  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const park = route?.params?.park;
    if (park) {
      setSelectedPark(park);
      loadMyDogs();
      setupParkListener(park.id);
    } else {
      showError("No park selected");
      navigation.goBack();
    }

    return () => {
      console.log("🧹 Component unmounting, cleaning up listener...");
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [route?.params?.park]);

  const loadMyDogs = async () => {
    try {
      console.log("🐕 Loading user dogs...");
      const result = await DogService.getDogs();

      if (result.success) {
        console.log(
          "✅ Dogs loaded successfully:",
          result.dogs.length,
          "dogs found"
        );
        setMyDogs(result.dogs);
      } else {
        console.error("❌ Failed to load dogs:", result.error);
      }
    } catch (error) {
      console.error("Error loading dogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupParkListener = (parkId) => {
    console.log(`🎧 Setting up park listener for ${parkId}`);

    const unsubscribe = DogParkService.subscribeToCheckedInDogs(
      parkId,
      (result) => {
        console.log(`🔔 Dogs update for park ${parkId}:`, {
          success: result.success,
          dogCount: result.dogs?.length || 0,
        });

        if (result.success) {
          const allDogsAtPark = result.dogs || [];

          const myCheckedIn = allDogsAtPark.filter(
            (dog) => dog.owner_id === currentUser?.uid
          );
          const otherDogs = allDogsAtPark.filter(
            (dog) => dog.owner_id !== currentUser?.uid
          );

          console.log(`👤 My checked-in dogs:`, myCheckedIn.length);
          console.log(`👥 Other dogs at park:`, otherDogs.length);

          setMyCheckedInDogs(myCheckedIn);
          setOtherDogsAtPark(otherDogs);
        } else {
          console.error(`❌ Failed to get dogs for park:`, result.error);
          setMyCheckedInDogs([]);
          setOtherDogsAtPark([]);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;
  };

  const handleCheckInPress = () => {
    if (myDogs.length === 0) {
      showError(
        "You need to add at least one dog before checking in at parks.",
        "No Dogs Found"
      );
      return;
    }

    const availableDogs = myDogs.filter(
      (dog) => !myCheckedInDogs.find((checkedIn) => checkedIn.id === dog.id)
    );

    if (availableDogs.length === 0) {
      showInfo("All your dogs are already checked in!");
      return;
    }

    setDogsToCheckIn([]);
    setShowCheckInModal(true);
  };

  const handleCheckOut = async (dogId) => {
    try {
      console.log("🚪 Checking out dog:", dogId);
      const result = await DogParkService.checkOutDogs(selectedPark.id, [
        dogId,
      ]);

      if (result.success) {
        showSuccess("Dog checked out successfully! 👋");
      } else {
        showError(result.error || "Failed to check out dog");
      }
    } catch (error) {
      console.error("Error during check-out:", error);
      showError("Failed to check out dog. Please try again.");
    }
  };

  const confirmCheckIn = async () => {
    if (dogsToCheckIn.length === 0) {
      showError(
        "Please select at least one dog to check in.",
        "No Dogs Selected"
      );
      return;
    }

    try {
      const dogIds = dogsToCheckIn.map((dog) => dog.id);
      const result = await DogParkService.checkInDogs(selectedPark.id, dogIds);

      if (result.success) {
        setShowCheckInModal(false);
        setDogsToCheckIn([]);
        showSuccess("Dogs checked in successfully! 🎉");
      } else {
        showError(result.error || "Failed to check in dogs");
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      showError("Failed to check in dogs. Please try again.");
    }
  };

  const toggleDogSelection = (dog) => {
    setDogsToCheckIn((prev) => {
      const isSelected = prev.find((d) => d.id === dog.id);
      if (isSelected) {
        return prev.filter((d) => d.id !== dog.id);
      } else {
        return [...prev, dog];
      }
    });
  };

  const CheckInModal = () => {
    const availableDogs = myDogs.filter(
      (dog) => !myCheckedInDogs.find((checkedIn) => checkedIn.id === dog.id)
    );

    return (
      showCheckInModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dogs to Check In</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCheckInModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.dogsList}
              showsVerticalScrollIndicator={false}
            >
              {availableDogs.map((dog) => {
                const isSelected = dogsToCheckIn.find((d) => d.id === dog.id);
                return (
                  <TouchableOpacity
                    key={dog.id}
                    style={[
                      styles.dogItem,
                      isSelected && styles.dogItemSelected,
                    ]}
                    onPress={() => toggleDogSelection(dog)}
                  >
                    <View style={styles.dogItemContent}>
                      <DogImage
                        source={{ uri: dog.photo_url }}
                        style={styles.dogPhoto}
                        placeholder={dog.emoji || "🐕"}
                      />
                      <View style={styles.dogItemInfo}>
                        <Text style={styles.dogItemName}>{dog.name}</Text>
                        <Text style={styles.dogItemBreed}>{dog.breed}</Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      >
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
                onPress={() => setShowCheckInModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  dogsToCheckIn.length === 0 && styles.confirmButtonDisabled,
                ]}
                onPress={confirmCheckIn}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm ({dogsToCheckIn.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading park details...</Text>
        </View>
      </View>
    );
  }

  if (!selectedPark) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No park selected</Text>
        </View>
      </View>
    );
  }

  // Determine which image to use
  const parkImageSource = selectedPark.image_url
    ? { uri: selectedPark.image_url }
    : defaultParkImage;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Park Header Image */}
        <View style={styles.parkHeaderContainer}>
          <ImageBackground
            source={parkImageSource}
            style={styles.parkHeaderImage}
            imageStyle={styles.parkHeaderImageStyle}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            {/* Filter Menu (three dots) */}
            <View style={styles.filterButton}>
              <View style={styles.filterDot} />
              <View style={styles.filterDot} />
              <View style={styles.filterDot} />
            </View>

            {/* Park Name Overlay at Bottom */}
            <View style={styles.parkNameOverlay}>
              <Text style={styles.parkName}>{selectedPark.name}</Text>
              <View style={styles.locationContainer}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>
                  {selectedPark.distance || "1.2"} km from location
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Check In Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check In:</Text>

          {myCheckedInDogs.length > 0 ? (
            <View style={styles.dogsContainer}>
              {myCheckedInDogs.map((dog) => (
                <View key={dog.id} style={styles.dogCard}>
                  <DogImage
                    source={{ uri: dog.photo_url }}
                    style={styles.dogAvatar}
                    placeholder={dog.emoji || "🐕"}
                  />
                  <View style={styles.dogInfo}>
                    <Text style={styles.dogName}>{dog.name}</Text>
                    <Text style={styles.ownerName}>Max Smith</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.checkInButton}
                      onPress={handleCheckInPress}
                    >
                      <Text style={styles.checkInButtonText}>Check In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.checkOutButton}
                      onPress={() => handleCheckOut(dog.id)}
                    >
                      <Text style={styles.checkOutButtonText}>Check Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No dogs checked in</Text>
            </View>
          )}
        </View>

        {/* Dogs at the Park Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dogs at the Park:</Text>

          {otherDogsAtPark.length > 0 ? (
            <View style={styles.dogsContainer}>
              {otherDogsAtPark.map((dog) => (
                <View key={dog.id} style={styles.dogCard}>
                  <DogImage
                    source={{ uri: dog.photo_url }}
                    style={styles.dogAvatar}
                    placeholder={dog.emoji || "🐕"}
                  />
                  <View style={styles.dogInfo}>
                    <Text style={styles.dogName}>{dog.name}</Text>
                    <Text style={styles.ownerName}>
                      {dog.ownerName || "Max Smith"}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <View style={styles.checkedInBadge}>
                      <Text style={styles.checkedInBadgeText}>Checked In</Text>
                    </View>
                    <TouchableOpacity style={styles.addFriendLink}>
                      <Text style={styles.addFriendText}>Add to Friends</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No other dogs at the park</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <CheckInModal />

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
      />

      <BottomNavigation navigation={navigation} activeRoute="Map" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  parkHeaderContainer: {
    width: "100%",
    height: 294,
    overflow: "hidden",
    backgroundColor: "#D9D9D9",
  },
  parkHeaderImage: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  parkHeaderImageStyle: {
    resizeMode: "cover",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 24,
    left: 19,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  filterButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 55 : 29,
    right: 21,
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
  },
  parkNameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  parkName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 27,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
    opacity: 0.7,
    marginBottom: 16,
  },
  dogsContainer: {
    gap: 20,
  },
  dogCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  dogAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    backgroundColor: "#E0E0E0",
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 13,
    color: "rgba(0, 0, 0, 0.4)",
  },
  actionButtons: {
    gap: 8,
    alignItems: "flex-end",
  },
  checkInButton: {
    backgroundColor: "#9EC7AE",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 104,
    alignItems: "center",
  },
  checkInButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  checkOutButton: {
    backgroundColor: "#E17963",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 104,
    alignItems: "center",
  },
  checkOutButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  checkedInBadge: {
    backgroundColor: "#9EC7AE",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 104,
    alignItems: "center",
  },
  checkedInBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  addFriendLink: {
    paddingVertical: 2,
  },
  addFriendText: {
    fontSize: 13,
    color: "rgba(0, 0, 0, 0.4)",
    textDecorationLine: "underline",
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  bottomPadding: {
    height: 100,
  },
  // ...existing modal styles...
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    marginBottom: 20,
    position: "relative",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: -5,
    right: 0,
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: "#999",
    fontWeight: "bold",
  },
  dogsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  dogItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E9ECEF",
  },
  dogItemSelected: {
    backgroundColor: "#E8F4FD",
    borderColor: "#4A90E2",
  },
  dogItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dogPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#E9ECEF",
  },
  dogItemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  dogItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  dogItemBreed: {
    fontSize: 14,
    color: "#666",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#E9ECEF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: "#9EC7AE",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#CCC",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
