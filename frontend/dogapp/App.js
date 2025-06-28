import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddDogScreen from './screens/AddDogScreen';
import DogProfileScreen from './screens/DogProfileScreen';
import EditDogScreen from './screens/EditDogScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { currentUser } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4A90E2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
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
              options={{ title: '🐾 Add New Dog' }}
            />
            <Stack.Screen 
              name="DogProfile" 
              component={DogProfileScreen} 
              options={{ title: '🐕 Dog Profile' }}
            />
            <Stack.Screen 
              name="EditDog" 
              component={EditDogScreen} 
              options={{ title: '✏️ Edit Dog Profile' }}
            />
          </>
        ) : (
          // User is not authenticated - show login screen
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
