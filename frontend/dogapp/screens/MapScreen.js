import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { GOOGLE_API_KEY } from "@env";
import DogParkService from "../services/DogParkService";
import { useAuth } from "../contexts/AuthContext";
import DogService from "../services/DogService";
import BottomNavigation from "../components/BottomNavigation";
import CustomAlert, { DogImage } from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";

const { width, height } = Dimensions.get("window");

export default function MapScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [parks, setParks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [parksCheckedInDogs, setParksCheckedInDogs] = useState({});
  const [selectedPark, setSelectedPark] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const unsubscribeRefs = useRef({});
  const [dogs, setDogs] = useState([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [parkToCheckIn, setParkToCheckIn] = useState(null);
  const [selectedDogsForCheckIn, setSelectedDogsForCheckIn] = useState([]);
  const { alertState, hideAlert, showError, showSuccess, showInfo } =
    useAlerts();

  useEffect(() => {
    loadGoogleMapsScript();
    loadParks();
    // also load user's dogs for Friends navigation
    (async () => {
      try {
        const result = await DogService.getDogs();
        if (result.success) setDogs(result.dogs || []);
      } catch {}
    })();

    return () => {
      Object.values(unsubscribeRefs.current).forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
      DogParkService.cleanupAllListeners();
    };
  }, []);

  // Initialize map only once when Google Maps loads and we have parks
  useEffect(() => {
    if (mapLoaded && parks.length > 0 && !mapRef.current) {
      initializeMap();
    }
  }, [mapLoaded, parks]);

  // Update markers when dogs check in/out, but don't reinitialize the map
  useEffect(() => {
    if (mapRef.current && parks.length > 0) {
      updateMarkers();
    }
  }, [parksCheckedInDogs]);

  const loadGoogleMapsScript = () => {
    if (Platform.OS !== "web") {
      setMapLoaded(true);
      return;
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Maps script loaded");
      setMapLoaded(true);
    };
    script.onerror = () => {
      console.error("❌ Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (Platform.OS !== "web" || !window.google || !mapContainerRef.current)
      return;

    // Default center (Tel Aviv)
    const center =
      parks.length > 0 && parks[0].latitude && parks[0].alongitude
        ? { lat: parks[0].latitude, lng: parks[0].longitude }
        : { lat: 32.0853, lng: 34.7818 };

    // Initialize map only once
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: center,
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    mapRef.current = map;

    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.setCenter(userLocation);

          // Add user location marker
          new window.google.maps.Marker({
            position: userLocation,
            map: map,
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="#4A90E2" stroke="white" stroke-width="2"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(20, 20),
            },
            title: "Your Location",
          });
        },
        (error) => {
          console.log("Could not get user location:", error);
        }
      );
    }

    // Initial marker update
    updateMarkers();
  };

  const updateMarkers = () => {
    if (Platform.OS !== "web" || !window.google || !mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const map = mapRef.current;

    // Add markers for parks with dogs
    parks.forEach((park) => {
      if (!park.latitude || !park.longitude) return;

      const dogs = parksCheckedInDogs[park.id] || [];

      // Create custom marker for each dog
      dogs.forEach((dog) => {
        const marker = new window.google.maps.Marker({
          position: {
            lat: park.latitude + (Math.random() - 0.5) * 0.001,
            lng: park.longitude + (Math.random() - 0.5) * 0.001,
          },
          map: map,
          title: dog.name,
          icon: {
            url:
              dog.photo_url ||
              "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="#4CD964" stroke="white" stroke-width="3"/>
                <text x="20" y="28" font-size="20" text-anchor="middle" fill="white">🐕</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
        });

        marker.addListener("click", () => {
          setSelectedPark({ ...park, dog });
          map.panTo(marker.getPosition());
        });

        markersRef.current.push(marker);
      });

      // Add park marker only if there are dogs or always show parks
      const parkMarker = new window.google.maps.Marker({
        position: { lat: park.latitude, lng: park.longitude },
        map: map,
        title: park.name,
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="12" fill="#FF6B6B" stroke="white" stroke-width="2"/>
              <text x="15" y="20" font-size="14" text-anchor="middle" fill="white">🏞️</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(30, 30),
          anchor: new window.google.maps.Point(15, 15),
        },
      });

      parkMarker.addListener("click", () => {
        setSelectedPark(park);
        map.panTo(parkMarker.getPosition());
      });

      markersRef.current.push(parkMarker);
    });
  };

  const loadParks = async () => {
    try {
      setLoading(true);
      const unsubscribe = DogParkService.subscribeToAllParks((result) => {
        if (result.success) {
          setParks(result.parks);
          result.parks.forEach((park) => {
            setupParkListener(park.id);
          });
        }
        setLoading(false);
      });

      unsubscribeRefs.current.allParks = unsubscribe;
    } catch (error) {
      console.error("Error loading parks:", error);
      setLoading(false);
    }
  };

  const setupParkListener = (parkId) => {
    if (unsubscribeRefs.current[`park_${parkId}`]) {
      return;
    }

    const unsubscribe = DogParkService.subscribeToCheckedInDogs(
      parkId,
      (result) => {
        if (result.success) {
          setParksCheckedInDogs((prev) => ({
            ...prev,
            [parkId]: [...result.dogs],
          }));
        }
      }
    );

    unsubscribeRefs.current[`park_${parkId}`] = unsubscribe;
  };

  const getParkStatus = (parkId) => {
    const dogs = parksCheckedInDogs[parkId] || [];
    return dogs.length > 3 ? "Crowded" : dogs.length > 0 ? "Active" : "Empty";
  };

  const calculateDistance = (park) => {
    return "1.2 km";
  };

  const openFriends = () => {
    if (dogs && dogs.length > 0) {
      navigation.navigate("DogFriends", { dog: dogs[0] });
    } else {
      navigation.navigate("Dashboard");
    }
  };

  const handleCheckInPress = (park) => {
    if (dogs.length === 0) {
      showError(
        "You need to add at least one dog before checking in at parks.",
        "No Dogs Found"
      );
      return;
    }

    // Get dogs already checked in at this park
    const dogsAtPark = parksCheckedInDogs[park.id] || [];
    const myCheckedInDogs = dogsAtPark.filter(
      (dog) => dog.owner_id === currentUser?.uid
    );

    // Filter out dogs that are already checked in
    const availableDogs = dogs.filter(
      (dog) => !myCheckedInDogs.find((checkedIn) => checkedIn.id === dog.id)
    );

    if (availableDogs.length === 0) {
      showInfo("All your dogs are already checked in at this park!");
      return;
    }

    setParkToCheckIn(park);
    setSelectedDogsForCheckIn([]);
    setShowCheckInModal(true);
  };

  const handleCheckOutAll = async (park, e) => {
    // Stop event propagation to prevent card click
    if (e) {
      e.stopPropagation();
    }

    // Get all my dogs checked in at this park
    const dogsAtPark = parksCheckedInDogs[park.id] || [];
    const myCheckedInDogs = dogsAtPark.filter(
      (dog) => dog.owner_id === currentUser?.uid
    );

    if (myCheckedInDogs.length === 0) {
      showInfo("You don't have any dogs checked in at this park.");
      return;
    }

    try {
      const dogIds = myCheckedInDogs.map((dog) => dog.id);
      const result = await DogParkService.checkOutDogs(park.id, dogIds);

      if (result.success) {
        showSuccess(
          `${myCheckedInDogs.length} dog(s) checked out successfully! 👋`
        );
      } else {
        showError(result.error || "Failed to check out dogs");
      }
    } catch (error) {
      console.error("Error during check-out:", error);
      showError("Failed to check out dogs. Please try again.");
    }
  };

  const toggleDogSelection = (dog) => {
    setSelectedDogsForCheckIn((prev) => {
      const isSelected = prev.find((d) => d.id === dog.id);
      if (isSelected) {
        return prev.filter((d) => d.id !== dog.id);
      } else {
        return [...prev, dog];
      }
    });
  };

  const confirmCheckIn = async () => {
    if (selectedDogsForCheckIn.length === 0) {
      showError(
        "Please select at least one dog to check in.",
        "No Dogs Selected"
      );
      return;
    }

    try {
      const dogIds = selectedDogsForCheckIn.map((dog) => dog.id);
      const result = await DogParkService.checkInDogs(parkToCheckIn.id, dogIds);

      if (result.success) {
        const parkToNavigate = parkToCheckIn;
        setShowCheckInModal(false);
        setSelectedDogsForCheckIn([]);
        setParkToCheckIn(null);

        // Navigate to the park screen (use 'DogParks' not 'DogParksScreen')
        navigation.navigate("DogParks", { park: parkToNavigate });

        // Show success message after navigation
        setTimeout(() => {
          showSuccess(
            `${selectedDogsForCheckIn.length} dog(s) checked in successfully! 🎉`
          );
        }, 500);
      } else {
        showError(result.error || "Failed to check in dogs");
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      showError("Failed to check in dogs. Please try again.");
    }
  };

  const CheckInModal = () => {
    if (!showCheckInModal || !parkToCheckIn) return null;

    // Get dogs already checked in at this park
    const dogsAtPark = parksCheckedInDogs[parkToCheckIn.id] || [];
    const myCheckedInDogs = dogsAtPark.filter(
      (dog) => dog.owner_id === currentUser?.uid
    );

    // Filter out dogs that are already checked in
    const availableDogs = dogs.filter(
      (dog) => !myCheckedInDogs.find((checkedIn) => checkedIn.id === dog.id)
    );

    return (
      <Modal
        transparent={true}
        visible={showCheckInModal}
        animationType="fade"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Check In to {parkToCheckIn.name}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCheckInModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select dogs to check in:</Text>

            <ScrollView
              style={styles.dogsList}
              showsVerticalScrollIndicator={false}
            >
              {availableDogs.map((dog) => {
                const isSelected = selectedDogsForCheckIn.find(
                  (d) => d.id === dog.id
                );
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
                  selectedDogsForCheckIn.length === 0 &&
                    styles.confirmButtonDisabled,
                ]}
                onPress={confirmCheckIn}
                disabled={selectedDogsForCheckIn.length === 0}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm ({selectedDogsForCheckIn.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      <View style={styles.mapContainer}>
        <View style={styles.mapTitleContainer}>
          <Text style={styles.mapTitle}>Map</Text>
        </View>

        {Platform.OS === "web" ? (
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>🗺️</Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Map available on web
            </Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Location"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {selectedPark && (
        <View style={styles.selectedParkBanner}>
          <View style={styles.selectedParkInfo}>
            <Text style={styles.selectedParkName}>
              {selectedPark.dog ? selectedPark.dog.name : selectedPark.name}
            </Text>
            <Text style={styles.selectedParkDetails}>
              {selectedPark.dog
                ? `at ${selectedPark.name}`
                : `${
                    parksCheckedInDogs[selectedPark.id]?.length || 0
                  } dogs here`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPark(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Nearby Dog Parks</Text>
          <Text style={styles.resultCount}>{parks.length} results</Text>
        </View>

        <ScrollView
          style={styles.parksList}
          showsVerticalScrollIndicator={false}
        >
          {parks.map((park) => {
            const status = getParkStatus(park.id);
            const distance = calculateDistance(park);
            const dogsCount = parksCheckedInDogs[park.id]?.length || 0;

            // Check if user has dogs checked in at this park
            const dogsAtPark = parksCheckedInDogs[park.id] || [];
            const myCheckedInDogs = dogsAtPark.filter(
              (dog) => dog.owner_id === currentUser?.uid
            );
            const hasMyDogsCheckedIn = myCheckedInDogs.length > 0;

            return (
              <TouchableOpacity
                key={park.id}
                style={styles.parkCard}
                onPress={() => {
                  setSelectedPark(park);
                  if (mapRef.current && park.latitude && park.longitude) {
                    mapRef.current.panTo({
                      lat: park.latitude,
                      lng: park.longitude,
                    });
                    mapRef.current.setZoom(15);
                  }
                }}
              >
                <View style={styles.parkImagePlaceholder}>
                  <Text style={styles.parkImageText}>🏞️</Text>
                  {dogsCount > 0 && (
                    <View style={styles.dogCountBadge}>
                      <Text style={styles.dogCountText}>{dogsCount}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.parkInfo}>
                  <Text style={styles.parkName}>{park.name}</Text>
                  <Text style={styles.parkLocation}>
                    {park.address || "location"}
                  </Text>
                  <View style={styles.parkDetails}>
                    <Text style={styles.parkDistance}>
                      📍 {distance} from you
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        status === "Crowded" && styles.statusCrowded,
                        status === "Active" && styles.statusActive,
                        status === "Empty" && styles.statusEmpty,
                      ]}
                    >
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>{status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.parkActions}>
                  <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCheckInPress(park);
                    }}
                  >
                    <Text style={styles.checkInButtonText}>Check In</Text>
                  </TouchableOpacity>

                  {hasMyDogsCheckedIn && (
                    <TouchableOpacity
                      style={styles.checkOutAllButton}
                      onPress={(e) => handleCheckOutAll(park, e)}
                    >
                      <Text style={styles.checkOutAllButtonText}>
                        Check Out All ({myCheckedInDogs.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  mapContainer: {
    height: height * 0.4,
    position: "relative",
    backgroundColor: "#E0E0E0",
  },
  mapTitleContainer: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D3D3D3",
  },
  mapPlaceholderText: {
    fontSize: 64,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    outlineStyle: "none",
  },
  selectedParkBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectedParkInfo: {
    flex: 1,
  },
  selectedParkName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  selectedParkDetails: {
    fontSize: 14,
    color: "#E8F4FD",
    marginTop: 2,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#FFF",
    fontWeight: "bold",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
  },
  parksList: {
    flex: 1,
  },
  parkCard: {
    flexDirection: "row",
    backgroundColor: "#E8E8E8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  parkImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#D3D3D3",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  parkImageText: {
    fontSize: 32,
  },
  dogCountBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#4CD964",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dogCountText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFF",
  },
  parkInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  parkName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  parkLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  parkDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  parkDistance: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCrowded: {
    backgroundColor: "#FF6B6B",
  },
  statusActive: {
    backgroundColor: "#4CD964",
  },
  statusEmpty: {
    backgroundColor: "#999",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFF",
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "500",
  },
  checkInButton: {
    backgroundColor: "#4CD964",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "center",
    marginTop: 8,
  },
  checkInButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  parkActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  checkOutAllButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "center",
    marginTop: 8,
  },
  checkOutAllButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  dogsList: {
    maxHeight: 200,
  },
  dogItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dogItemSelected: {
    backgroundColor: "#D3EEDD",
  },
  dogItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dogPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  dogItemInfo: {
    flex: 1,
  },
  dogItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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
    borderColor: "#CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: "#4CD964",
    backgroundColor: "#4CD964",
  },
  checkmark: {
    fontSize: 16,
    color: "#FFF",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#4CD964",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
});
