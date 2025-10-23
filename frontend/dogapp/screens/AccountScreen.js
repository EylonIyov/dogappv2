import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import CustomAlert from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";
import DogService from "../services/DogService";
import BottomNavigation from "../components/BottomNavigation";

export default function AccountScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const { alertState, hideAlert, showError, showSuccess } = useAlerts();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [dogCount, setDogCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const result = await DogService.getDogs();
      if (result.success) {
        setDogCount(result.dogs.length);
      }
    } catch (error) {
      console.error("Error loading account data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess("You have been logged out successfully.", "Goodbye! 👋");
    } catch (error) {
      console.error("Logout error:", error);
      showError("Failed to logout. Please try again.", "Error");
    }
  };

  const InfoCard = ({ icon, title, value }) => (
    <View style={styles.infoCard}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your profile and preferences
          </Text>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 User Information</Text>
          <View style={styles.card}>
            <InfoCard
              icon="📧"
              title="Email"
              value={currentUser?.email || "Not available"}
            />
            <InfoCard
              icon="🆔"
              title="User ID"
              value={
                currentUser?.uid
                  ? `${currentUser.uid.substring(0, 12)}...`
                  : "Not available"
              }
            />
            <InfoCard
              icon="🐕"
              title="My Dogs"
              value={
                loading
                  ? "Loading..."
                  : `${dogCount} ${dogCount === 1 ? "dog" : "dogs"}`
              }
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ App Information</Text>
          <View style={styles.card}>
            <InfoCard
              icon="📱"
              title="Platform"
              value={
                Platform.OS === "web"
                  ? "Web"
                  : Platform.OS === "ios"
                  ? "iOS"
                  : "Android"
              }
            />
            <InfoCard icon="📦" title="Version" value="1.0.0" />
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setConfirmLogout(true)}
          >
            <Text style={styles.logoutButtonText}>🚪 Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom navigation bar */}
      <BottomNavigation navigation={navigation} activeRoute="Account" />

      {/* Logout Confirmation Dialog */}
      <CustomAlert
        visible={confirmLogout}
        title="Log Out?"
        message="Are you sure you want to log out? You'll need to log back in to access your account."
        type="warning"
        showCancel={true}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          handleLogout();
        }}
        confirmText="Log Out"
        cancelText="Cancel"
      />

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
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
  header: {
    backgroundColor: "#4A90E2",
    padding: 30,
    paddingTop: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#E8F4FD",
    textAlign: "center",
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  logoutSection: {
    margin: 20,
    marginTop: 40,
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FF4444",
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  bottomPadding: {
    height: 40,
  },
});
