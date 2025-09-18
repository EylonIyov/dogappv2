import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Check for existing token on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      if (storedToken) {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced to 3 seconds for web

        try {
          // Verify token with backend
          const response = await fetch(getApiUrl('/api/auth/me'), {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
            setToken(storedToken);
          } else {
            // Only remove token if it's actually invalid (401/403), not for server errors
            if (response.status === 401 || response.status === 403) {
              await AsyncStorage.removeItem('authToken');
              console.log('Token verification failed, removed from storage');
            } else {
              // For other errors (500, network issues), keep the token and set it
              console.log('Token verification failed due to server error, keeping token');
              setToken(storedToken);
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.log('Auth check timed out - backend may be unavailable');
          } else {
            console.log('Auth check failed:', fetchError.message);
          }
          // Don't remove token if it's just a network issue
          // The user can still try to use the app offline or retry later
          // Set the token in state even if verification failed due to network issues
          setToken(storedToken);
        }
      }
    } catch (error) {
      console.error('Auth state check error:', error);
      // Only remove token if there's a storage error, not network error
      if (error.message.includes('storage')) {
        await AsyncStorage.removeItem('authToken');
      }
    } finally {
      // Always set loading to false, regardless of success or failure
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login with URL:', getApiUrl('/api/auth/login'));
      
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔐 Login response status:', response.status);
      console.log('🔐 Login response headers:', response.headers);
      
      // Get response text first to debug what we're receiving
      const responseText = await response.text();
      console.log('🔐 Raw response text:', responseText.substring(0, 200) + '...');

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('🔐 JSON parse error:', parseError);
        console.error('🔐 Response that failed to parse:', responseText);
        return { success: false, error: 'Server returned invalid response. Please try again.' };
      }

      if (response.ok) {
        // Store token and user data
        await AsyncStorage.setItem('authToken', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (email, password, fullName, dateOfBirth, gender, profileImageUrl, preferences) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          fullName, 
          dateOfBirth, 
          gender,
          profileImageUrl,
          preferences 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        await AsyncStorage.setItem('authToken', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        // Optional: Call backend logout endpoint
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state
      await AsyncStorage.removeItem('authToken');
      setToken(null);
      setCurrentUser(null);
    }
  };

  const value = {
    currentUser,
    token,
    loading,
    login,
    register,
    logout,
  };

  // Always render children, but show loading state if needed
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;