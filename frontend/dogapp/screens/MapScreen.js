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
} from "react-native";
import { GOOGLE_API_KEY } from "@env";
import DogParkService from "../services/DogParkService";
import { useAuth } from "../contexts/AuthContext";
import DogService from "../services/DogService";

const { width, height } = Dimensions.get("window");

export default function MapScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
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
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => logout()}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}}
        >
          <Text style={styles.navIcon}>📍</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Map</Text>
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
