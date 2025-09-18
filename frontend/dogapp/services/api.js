import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getApiConfig } from '../config';

// Helper method to make authenticated API requests with retry logic
export const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const config = getApiConfig();
  const url = getApiUrl(endpoint);
  
  // Get auth token
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No auth token found');
  }

  // Set up default headers with authentication
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Merge with any custom headers
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  let lastError;
  
  // Retry logic
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const response = await fetch(url, {
        timeout: config.timeout,
        ...options,
        headers,
      });
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`API request attempt ${attempt} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt === config.retries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
};

// Helper method to make non-authenticated API requests
export const makeApiRequest = async (endpoint, options = {}) => {
  const config = getApiConfig();
  const url = getApiUrl(endpoint);
  
  let lastError;
  
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const response = await fetch(url, {
        timeout: config.timeout,
        ...options,
      });
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`API request attempt ${attempt} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt === config.retries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
};