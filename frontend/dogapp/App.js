import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddDogScreen from './screens/AddDogScreen';
import DogProfileScreen from './screens/DogProfileScreen';
import EditDogScreen from './screens/EditDogScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
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
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
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
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
