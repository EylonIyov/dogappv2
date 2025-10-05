import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import DevPanel from './components/DevPanel';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MapScreen from './screens/MapScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddDogScreen from './screens/AddDogScreen';
import DogProfileScreen from './screens/DogProfileScreen';
import EditDogScreen from './screens/EditDogScreen';
import DogParksScreen from './screens/DogParksScreen';
import CheckInConfirmationScreen from './screens/CheckInConfirmationScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import DogFriendsScreen from './screens/DogFriendsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { currentUser, loading } = useAuth();

  // Show loading screen while auth is being checked
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 16, 
          color: '#666',
          fontWeight: '500'
        }}>
          Loading Dog App...
        </Text>
      </View>
    );
  }

  // Web-specific screen options to fix scrolling
  const webScreenOptions = Platform.OS === 'web' ? {
    cardStyle: { 
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    headerStyle: {
      backgroundColor: '#4A90E2',
      position: 'relative'
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  } : {
    headerStyle: {
      backgroundColor: '#4A90E2',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  };

  return (
    <NavigationContainer
      documentTitle={{ formatter: (options, route) => options?.title ?? route?.name }}
    >
      <Stack.Navigator 
        screenOptions={webScreenOptions}
      >
        {currentUser ? (
          // User is authenticated - show app screens with Map as home
          <>
            <Stack.Screen 
              name="Map" 
              component={MapScreen} 
              options={{ 
                headerShown: false, // Hide header for map screen
                headerLeft: null,
              }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ 
                title: '🐕 My Dogs',
              }}
            />
            <Stack.Screen 
              name="AddDog" 
              component={AddDogScreen} 
              options={{ 
                title: '🐾 Add New Dog'
              }}
            />
            <Stack.Screen 
              name="DogProfile" 
              component={DogProfileScreen} 
              options={{ title: '🐕 Dog Profile' }}
            />
            <Stack.Screen 
              name="EditDog" 
              component={EditDogScreen} 
              options={{ 
                title: '✏️ Edit Dog Profile'
              }}
            />
            <Stack.Screen 
              name="DogParks" 
              component={DogParksScreen} 
              options={{ 
                title: '🏞️ Dog Parks'
              }}
            />
            <Stack.Screen 
              name="CheckInConfirmation" 
              component={CheckInConfirmationScreen} 
              options={{ 
                title: '✅ Check-In Confirmed'
              }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen} 
              options={{ 
                title: '🔔 Notifications'
              }}
            />
            <Stack.Screen 
              name="DogFriends" 
              component={DogFriendsScreen} 
              options={{ 
                title: '👥 Dog Friends'
              }}
            />
          </>
        ) : (
          // User is not authenticated - show auth screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen} 
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <AppNavigator />
        <DevPanel />
      </View>
    </AuthProvider>
  );
}
