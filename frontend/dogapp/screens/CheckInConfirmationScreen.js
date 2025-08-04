import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DogParkService from '../services/DogParkService';

export default function CheckInConfirmationScreen({ route, navigation }) {
  const { park, checkedInDogs } = route.params;
  const [loading, setLoading] = useState(false);

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      // For now, we'll show a confirmation - later you can implement actual check-out logic
      const dogNames = checkedInDogs.map(dog => dog.name).join(', ');
      
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(`Check out ${dogNames} from ${park.name}?`);
        if (confirmed) {
          window.alert(`Successfully checked out ${dogNames} from ${park.name}! 🐾`);
          navigation.goBack();
        }
      } else {
        Alert.alert(
          'Check Out',
          `Check out ${dogNames} from ${park.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Check Out',
              onPress: () => {
                Alert.alert('Success! 🐾', `Successfully checked out ${dogNames} from ${park.name}!`);
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error during check-out:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to check out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to check out. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>✅ Successfully Checked In!</Text>
          <Text style={styles.subtitle}>You're all set at {park.name}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.parkInfo}>
            <Text style={styles.parkName}>📍 {park.name}</Text>
            <Text style={styles.parkAddress}>{park.address}</Text>
          </View>

          <View style={styles.dogsSection}>
            <Text style={styles.sectionTitle}>Dogs Checked In:</Text>
            {checkedInDogs.map((dog, index) => (
              <View key={dog.id} style={styles.dogItem}>
                <Text style={styles.dogEmoji}>{dog.emoji || '🐕'}</Text>
                <View style={styles.dogInfo}>
                  <Text style={styles.dogName}>{dog.name}</Text>
                  <Text style={styles.dogBreed}>{dog.breed}</Text>
                </View>
                <Text style={styles.checkInStatus}>✅ Checked In</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.checkOutButton, loading && styles.buttonDisabled]}
            onPress={handleCheckOut}
            disabled={loading}
          >
            <Text style={styles.checkOutButtonText}>
              {loading ? 'Processing...' : '🚪 Check Out'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stayButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.stayButtonText}>Stay at Park</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for a Great Park Visit:</Text>
          <Text style={styles.tipText}>• Keep your dogs hydrated</Text>
          <Text style={styles.tipText}>• Watch for signs of overheating</Text>
          <Text style={styles.tipText}>• Make sure to clean up after your pets</Text>
          <Text style={styles.tipText}>• Supervise interactions with other dogs</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parkInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  parkName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  parkAddress: {
    fontSize: 16,
    color: '#666',
  },
  dogsSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  dogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dogEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dogBreed: {
    fontSize: 14,
    color: '#666',
  },
  checkInStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  checkOutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkOutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stayButton: {
    backgroundColor: '#E9ECEF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  stayButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  tipsContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
    lineHeight: 20,
  },
});