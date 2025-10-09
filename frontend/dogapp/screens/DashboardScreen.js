import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import DogService from "../services/DogService";
import CustomAlert, { DogImage } from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";

const { width } = Dimensions.get("window");

// Memoized DogCard with friends-style row layout (avatar, name, button on right)
const DogCard = memo(({ dog, onPressProfile, onPressFriends }) => (
  <TouchableOpacity
    style={styles.friendRow}
    onPress={() => onPressProfile(dog)}
    activeOpacity={0.8}
  >
    <DogImage
      source={{ uri: dog.photo_url }}
      style={styles.friendAvatar}
      placeholder={dog.emoji || "🐕"}
    />
    <View style={styles.friendInfo}>
      <Text style={styles.friendName}>{dog.name}</Text>
      <Text style={styles.friendSub}>{dog.breed || "Your dog"}</Text>
    </View>
    <View style={styles.friendActions}>
      <TouchableOpacity
        style={styles.friendBtn}
        onPress={() => onPressFriends(dog)}
      >
        <Text style={styles.friendBtnText}>Bark Crew</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
));

export default function DashboardScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const { alertState, hideAlert, showError, showSuccess, showInfo } =
    useAlerts();
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    dogId: null,
  });
  const [confirmLogout, setConfirmLogout] = useState(false);

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
      console.log("🔄 Loading dogs from API...");
      const result = await DogService.getDogs();

      if (result.success) {
        console.log(
          "✅ Dogs loaded successfully:",
          result.dogs.length,
          "dogs found"
        );

        // Log photo URLs for each dog
        result.dogs.forEach((dog, index) => {
          console.log(`🐕 Dog ${index + 1}: ${dog.name}`);
          console.log(`   - Photo URL: ${dog.photo_url || "No photo"}`);
          console.log(
            `   - Has photo_url field: ${dog.photo_url !== undefined}`
          );
          console.log(
            `   - Photo URL length: ${dog.photo_url ? dog.photo_url.length : 0}`
          );
        });

        setDogs(result.dogs);
      } else {
        console.error("❌ Failed to load dogs:", result.error);
        showError(result.error || "Failed to load dogs");
      }
    } catch (error) {
      console.error("💥 Error loading dogs:", error);
      showError("Failed to load dogs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteDog = async (dogId) => {
    if (Platform.OS === "web") {
      // Web: use custom alert instead of window.confirm/alert
      setConfirmDelete({ visible: true, dogId });
    } else {
      // Native: use custom alert for confirmation dialog
      setConfirmDelete({ visible: true, dogId });
    }
  };

  const confirmDeleteDog = async () => {
    const dogId = confirmDelete.dogId;
    setConfirmDelete({ visible: false, dogId: null });

    try {
      const result = await DogService.deleteDog(dogId);
      if (result.success) {
        setDogs(dogs.filter((dog) => dog.id !== dogId));
        showSuccess("Dog profile deleted successfully");
      } else {
        showError(result.error || "Failed to delete dog");
      }
    } catch (error) {
      console.error("Error deleting dog:", error);
      showError("Failed to delete dog. Please try again.");
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        // animate menu close
        closeMenu();
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
        showError("Failed to logout. Please try again.");
      }
    };

    if (Platform.OS === "web") {
      // On web, we log out directly to avoid issues with the Alert component
      // and provide a quicker user experience.
      performLogout();
    } else {
      // On native, we show a confirmation dialog.
      setConfirmLogout(true);
    }
  };

  const confirmLogoutAction = async () => {
    setConfirmLogout(false);
    try {
      closeMenu();
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      showError("Failed to logout. Please try again.");
    }
  };

  // Stable callbacks to prevent re-creation on each render
  const handleNavigateProfile = useCallback(
    (dog) => navigation.navigate("DogProfile", { dog }),
    [navigation]
  );

  const handleNavigateFriends = useCallback(
    (dog) => navigation.navigate("DogFriends", { dog }),
    [navigation]
  );

  // Helper to open Friends for primary dog
  const openFriends = useCallback(() => {
    if (dogs && dogs.length > 0) {
      navigation.navigate("DogFriends", { dog: dogs[0] });
    } else {
      showInfo("Add a dog first to see friends");
    }
  }, [dogs, navigation, showInfo]);

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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple top bar with back arrow */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Map")}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Dog Section */}
        {!loading && dogs.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.featuredTitle}>{dogs[0].name}'s Friends</Text>
            <TouchableOpacity
              style={styles.featuredDogContainer}
              onPress={() => handleNavigateProfile(dogs[0])}
              activeOpacity={0.8}
            >
              <DogImage
                source={{ uri: dogs[0].photo_url }}
                style={styles.featuredDogImage}
                placeholder={dogs[0].emoji || "🐕"}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* My Dogs Section */}
        {!loading && (
          <View style={styles.myDogsSection}>
            <Text style={styles.sectionTitle}>My Dogs</Text>
            {dogs.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onPressProfile={handleNavigateProfile}
                onPressFriends={handleNavigateFriends}
              />
            ))}

            {/* Add New Dog Button */}
            <TouchableOpacity
              style={styles.addNewDogButton}
              onPress={() => navigation.navigate("AddDog")}
            >
              <Text style={styles.addNewDogIcon}>+</Text>
              <Text style={styles.addNewDogText}>Add New Dog</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom navigation bar matching mock: Home, Account, Map, Friends, Chats */}
      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => logout()}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Map")}
        >
          <Text style={styles.navIcon}>📍</Text>
          <Text style={styles.navLabel}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={openFriends}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Text style={styles.navIcon}>💬</Text>
          <Text style={styles.navLabel}>Chats</Text>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
      />

      <CustomAlert
        visible={confirmDelete.visible}
        title="Delete Dog Profile"
        message="Are you sure you want to delete this dog profile?"
        type="warning"
        showCancel={true}
        onClose={() => setConfirmDelete({ visible: false, dogId: null })}
        onConfirm={confirmDeleteDog}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <CustomAlert
        visible={confirmLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        type="warning"
        showCancel={true}
        onClose={() => setConfirmLogout(false)}
        onConfirm={confirmLogoutAction}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 28,
    color: "#222",
    lineHeight: 28,
  },
  featuredSection: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
  },
  featuredTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginBottom: 16,
  },
  featuredDogContainer: {
    width: "100%",
    alignItems: "center",
  },
  featuredDogImage: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  myDogsSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A4A4A",
    marginBottom: 12,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  friendAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  friendSub: {
    fontSize: 14,
    color: "#9AA0A6",
    marginTop: 2,
  },
  friendActions: {
    width: 120,
    alignItems: "stretch",
    justifyContent: "center",
  },
  friendBtn: {
    backgroundColor: "#5B8C5A",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  friendBtnSecondary: {
    opacity: 0.95,
  },
  friendBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  addNewDogButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#5B8C5A",
    borderStyle: "dashed",
  },
  addNewDogIcon: {
    fontSize: 24,
    color: "#5B8C5A",
    fontWeight: "bold",
    marginRight: 8,
  },
  addNewDogText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5B8C5A",
  },
  bottomPadding: {
    height: 100,
  },
  navigationBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  navButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#6B6B6B",
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#333",
    fontWeight: "600",
  },
});
