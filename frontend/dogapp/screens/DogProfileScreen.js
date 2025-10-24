import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import CustomAlert, { DogImage } from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";
import BottomNavigation from "../components/BottomNavigation";

export default function DogProfileScreen({ route, navigation }) {
  const { dog } = route.params;
  const { alertState, hideAlert } = useAlerts();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Three dots menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("EditDog", { dog })}
        >
          <View style={styles.menuDot} />
          <View style={styles.menuDot} />
          <View style={styles.menuDot} />
        </TouchableOpacity>

        {/* Header with dog image */}
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            <DogImage
              source={{ uri: dog.photo_url }}
              style={styles.dogImage}
              placeholder={dog.emoji || "🐕"}
            />
          </View>
        </View>

        {/* Content section with white background */}
        <View style={styles.contentSection}>
          {/* Dog name */}
          <Text style={styles.dogName}>{dog.name}</Text>

          {/* Info grid - BREED, AGE, SIZE, SEX */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>BREED</Text>
              <Text style={styles.infoValue}>
                {dog.breed || "Not specified"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>AGE</Text>
              <Text style={styles.infoValue}>
                {dog.age
                  ? `${dog.age} Year${dog.age > 1 ? "s" : ""}`
                  : "Not specified"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>SIZE</Text>
              <Text style={styles.infoValue}>
                {dog.size || "Not specified"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>SEX</Text>
              <Text style={styles.infoValue}>
                {dog.sex || dog.gender || "Not specified"}
              </Text>
            </View>
          </View>

          {/* Location section */}
          {dog.location && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>LOCATION</Text>
              <Text style={styles.sectionValue}>{dog.location}</Text>
            </View>
          )}

          {/* Details section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DETAILS</Text>
            <Text style={styles.sectionValue}>
              {dog.medicalNotes ||
                dog.specialNeeds ||
                dog.favoriteActivities ||
                "No additional details"}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.friendsButton}
              onPress={() => navigation.navigate("DogFriends", { dog })}
            >
              <Text style={styles.friendsButtonText}>View Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
      />

      <BottomNavigation navigation={navigation} activeRoute="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 24,
    left: 19,
    width: 40,
    height: 40,
    justifyContent: "center",
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: "#000000",
  },
  menuButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 55 : 29,
    right: 21,
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 10,
  },
  menuDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#000000",
  },
  header: {
    height: 391,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  dogImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  contentSection: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: 41,
    paddingTop: 20,
  },
  dogName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 30,
    textAlign: "left",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  infoItem: {
    width: "48%",
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(0, 0, 0, 0.4)",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 20,
  },
  section: {
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(0, 0, 0, 0.4)",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 22,
  },
  actionSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  friendsButton: {
    backgroundColor: "#9EC7AE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  friendsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
});
