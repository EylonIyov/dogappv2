import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert, { DogImage } from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';

export default function DogProfileScreen({ route, navigation }) {
  const { dog } = route.params;
  const { alertState, hideAlert, showError, showSuccess } = useAlerts();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const deleteDog = async () => {
    setConfirmDelete(true);
  };

  const confirmDeleteDog = async () => {
    setConfirmDelete(false);
    try {
      const existingDogs = await AsyncStorage.getItem('dogs');
      const dogs = existingDogs ? JSON.parse(existingDogs) : [];
      const updatedDogs = dogs.filter(d => d.id !== dog.id);
      await AsyncStorage.setItem('dogs', JSON.stringify(updatedDogs));
      
      showSuccess(
        `${dog.name}'s profile has been deleted.`,
        'Deleted'
      );
      // Navigation will happen when alert is closed via onClose callback
    } catch (error) {
      console.error('Error deleting dog:', error);
      showError('Failed to delete dog profile.');
    }
  };

  const InfoCard = ({ icon, title, value, defaultText = 'Not specified' }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <Text style={styles.infoValue}>{value || defaultText}</Text>
    </View>
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <DogImage
            source={{ uri: dog.photo_url }}
            style={styles.dogProfilePhoto}
            placeholder={dog.emoji || '🐕'}
          />
          <Text style={styles.dogName}>{dog.name}</Text>
          <Text style={styles.dogBreed}>{dog.breed}</Text>
          <Text style={styles.addedDate}>
            Added to pack on {formatDate(dog.created_at || dog.createdAt)}
          </Text>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoGrid}>
            <InfoCard icon="🎂" title="Age" value={dog.age ? `${dog.age} years old` : null} />
            <InfoCard icon="⚡" title="Energy Level" value={dog.energyLevel} />
          </View>
        </View>

        {/* Play Style Section */}
        {dog.playStyle && dog.playStyle.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Play Style</Text>
            <View style={styles.textCard}>
              <Text style={styles.cardIcon}>🎭</Text>
              <Text style={styles.cardText}>
                {Array.isArray(dog.playStyle) ? dog.playStyle.join(', ') : dog.playStyle}
              </Text>
            </View>
          </View>
        )}

        {/* Activities Section */}
        {dog.favoriteActivities && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Activities</Text>
            <View style={styles.textCard}>
              <Text style={styles.cardIcon}>🏃</Text>
              <Text style={styles.cardText}>{dog.favoriteActivities}</Text>
            </View>
          </View>
        )}

        {/* Medical Notes Section */}
        {dog.medicalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Notes</Text>
            <View style={styles.textCard}>
              <Text style={styles.cardIcon}>🏥</Text>
              <Text style={styles.cardText}>{dog.medicalNotes}</Text>
            </View>
          </View>
        )}

        {/* Special Needs Section */}
        {dog.specialNeeds && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Needs</Text>
            <View style={styles.textCard}>
              <Text style={styles.cardIcon}>⭐</Text>
              <Text style={styles.cardText}>{dog.specialNeeds}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.friendsButton}
            onPress={() => navigation.navigate('DogFriends', { dog })}
          >
            <Text style={styles.friendsButtonText}>👥 View Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditDog', { dog })}
          >
            <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={deleteDog}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => {
          hideAlert();
          // Navigate back on success
          if (alertState.type === 'success') {
            navigation.navigate('Dashboard');
          }
        }}
        confirmText={alertState.confirmText}
      />

      <CustomAlert
        visible={confirmDelete}
        title="Delete Dog Profile"
        message={`Are you sure you want to delete ${dog.name}'s profile?`}
        type="warning"
        showCancel={true}
        onClose={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteDog}
        confirmText="Delete"
        cancelText="Cancel"
      />
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
  header: {
    backgroundColor: '#4A90E2',
    padding: 30,
    alignItems: 'center',
  },
  dogProfilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  dogEmoji: {
    fontSize: 80,
    marginBottom: 15,
  },
  dogName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dogBreed: {
    fontSize: 18,
    color: '#E8F4FD',
    textAlign: 'center',
    marginBottom: 8,
  },
  addedDate: {
    fontSize: 14,
    color: '#B8D4F0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  textCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  cardIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionSection: {
    margin: 20,
    gap: 15,
  },
  friendsButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  friendsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
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
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 20,
  },
});