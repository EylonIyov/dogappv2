import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";

export default function BottomNavigation({ navigation, activeRoute }) {
  const navItems = [
    { name: "Dashboard", icon: "🏠", label: "Home", route: "Dashboard" },
    { name: "Account", icon: "👤", label: "Account", route: "Account" },
    { name: "Map", icon: "📍", label: "Map", route: "Map" },
    {
      name: "Notifications",
      icon: "🔔",
      label: "Notifications",
      route: "Notifications",
    },
  ];

  const handleNavigation = (item) => {
    navigation.navigate(item.route);
  };

  return (
    <View style={styles.navigationBar}>
      {navItems.map((item) => {
        const isActive =
          activeRoute === item.route || activeRoute === item.name;

        return (
          <TouchableOpacity
            key={item.name}
            style={[styles.navButton, isActive && styles.navButtonActive]}
            onPress={() => handleNavigation(item)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
