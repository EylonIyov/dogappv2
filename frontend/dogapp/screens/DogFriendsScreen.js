import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import FriendService from "../services/FriendService";
import DogService from "../services/DogService";
import CustomAlert, { DogImage } from "../components/CustomAlert";
import { useAlerts } from "../components/useCustomAlert";
import BottomNavigation from "../components/BottomNavigation";

export default function DogFriendsScreen({ route, navigation }) {
  const { dog } = route.params;
  const [friends, setFriends] = useState([]);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { alertState, hideAlert, showError, showSuccess, showInfo } =
    useAlerts();

  useFocusEffect(
    React.useCallback(() => {
      loadFriendsData();
    }, [dog.id])
  );

  const loadFriendsData = async () => {
    try {
      setLoading(true);

      // Load friends
      const friendsResult = await FriendService.getFriends(dog.id);
      if (friendsResult.success) {
        setFriends(friendsResult.friends || []);
      }

      // Load suggested friends (all dogs except current dog and existing friends)
      const dogsResult = await DogService.getDogs();
      if (dogsResult.success) {
        const friendIds = friendsResult.friends?.map((f) => f.id) || [];
        const suggested = dogsResult.dogs.filter(
          (d) => d.id !== dog.id && !friendIds.includes(d.id)
        );
        setSuggestedFriends(suggested.slice(0, 4)); // Show max 4 suggestions
      }
    } catch (error) {
      console.error("Error loading friends data:", error);
      showError("Failed to load friends. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friend) => {
    try {
      const result = await FriendService.removeFriend(dog.id, friend.id);

      if (result.success) {
        showSuccess(`Removed ${friend.name} from friends`);
        setFriends((prev) => prev.filter((f) => f.id !== friend.id));
        // Move to suggested friends
        setSuggestedFriends((prev) => [...prev, friend]);
      } else {
        showError(result.error || "Failed to remove friend");
      }
    } catch (error) {
      showError("Failed to remove friend. Please try again.");
    }
  };

  const handleAddFriend = async (friend) => {
    try {
      const result = await FriendService.addFriend(dog.id, friend.id);

      if (result.success) {
        showSuccess(`Added ${friend.name} as a friend!`);
        setFriends((prev) => [...prev, friend]);
        setSuggestedFriends((prev) => prev.filter((f) => f.id !== friend.id));
      } else {
        showError(result.error || "Failed to add friend");
      }
    } catch (error) {
      showError("Failed to add friend. Please try again.");
    }
  };

  const FriendRow = ({ friend, onButtonPress, buttonText, buttonStyle }) => (
    <View style={styles.friendRow}>
      <DogImage
        source={{ uri: friend.photo_url }}
        style={styles.friendAvatar}
        placeholder={friend.emoji || "🐕"}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <Text style={styles.ownerName}>Max Smith</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, buttonStyle]}
        onPress={() => onButtonPress(friend)}
      >
        <Text style={styles.actionButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Dog's name title */}
        <Text style={styles.pageTitle}>{dog.name}'s Friends</Text>

        {/* Large dog profile card */}
        <View style={styles.mainDogCard}>
          <DogImage
            source={{ uri: dog.photo_url }}
            style={styles.mainDogImage}
            placeholder={dog.emoji || "🐕"}
          />
        </View>

        {/* My Friends Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Friends</Text>

          {friends.length > 0 ? (
            <View style={styles.friendsList}>
              {friends.map((friend) => (
                <FriendRow
                  key={friend.id}
                  friend={friend}
                  onButtonPress={handleRemoveFriend}
                  buttonText="Remove"
                  buttonStyle={styles.removeButton}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyFriends}>
              <Text style={styles.emptyText}>No friends yet</Text>
            </View>
          )}
        </View>

        {/* Suggested Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested Friends</Text>
            <TouchableOpacity>
              <Text style={styles.addFriendsLink}>Add Friends</Text>
            </TouchableOpacity>
          </View>

          {suggestedFriends.length > 0 ? (
            <View style={styles.friendsList}>
              {suggestedFriends.map((friend) => (
                <FriendRow
                  key={friend.id}
                  friend={friend}
                  onButtonPress={handleAddFriend}
                  buttonText="Add Friend"
                  buttonStyle={styles.addButton}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyFriends}>
              <Text style={styles.emptyText}>No suggestions available</Text>
            </View>
          )}
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
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 24,
    left: 19,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === "ios" ? 60 : 34,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginLeft: 16,
    marginBottom: 20,
    marginTop: 20,
  },
  mainDogCard: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  mainDogImage: {
    width: 187,
    height: 178,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    opacity: 0.7,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  addFriendsLink: {
    fontSize: 13,
    color: "rgba(0, 0, 0, 0.4)",
    textDecorationLine: "underline",
  },
  friendsList: {
    paddingHorizontal: 10,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  friendAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E0E0E0",
    marginRight: 15,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 13,
    color: "rgba(0, 0, 0, 0.4)",
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 104,
    alignItems: "center",
  },
  removeButton: {
    backgroundColor: "#E17963",
  },
  addButton: {
    backgroundColor: "#9EC7AE",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "400",
  },
  emptyFriends: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  bottomPadding: {
    height: 50,
  },
});
