import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddDogScreen from './screens/AddDogScreen';
import DogProfileScreen from './screens/DogProfileScreen';
import EditDogScreen from './screens/EditDogScreen';
import DogParksScreen from './screens/DogParksScreen';
import CheckInConfirmationScreen from './screens/CheckInConfirmationScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { currentUser } = useAuth();

  // Web-specific screen options to fix scrolling
  const webScreenOptions = Platform.OS === 'web' ? {
    cardStyle: { 
      flex: 1,
      // The following properties will be applied to the stack navigator's card.
      // This allows the content of each screen to grow and scroll as needed.
      display: 'flex',
      flexDirection: 'column',
    },
    headerStyle: {
      backgroundColor: '#4A90E2',
      position: 'relative' // Don't use fixed positioning
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
          // User is authenticated - show app screens
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ 
                title: '🐕 My Dogs',
                headerLeft: null, // Prevent going back to login
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
      </View>
    </AuthProvider>
  );
}
