// Configuration file for the Dog App
// This file contains environment-specific settings

const config = {
  // Backend API Configuration
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://ec2-16-171-173-92.eu-north-1.compute.amazonaws.com:8080',    
    timeout: 10000, // 10 seconds
    retries: 3,
  },
  
  // Environment settings
  environment: 'production', // 'development', 'staging', 'production'
  
  // Feature flags
  features: {
    enableOfflineMode: false,
    enablePushNotifications: true,
    enableAnalytics: true,
  },
  
  // Cache settings
  cache: {
    dogBreedsExpiry: 5 * 60 * 1000, // 5 minutes
    userDataExpiry: 30 * 60 * 1000, // 30 minutes
  },
  
  // Image upload settings
  image: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    quality: 0.8,
    allowedFormats: ['jpg', 'jpeg', 'png'],
  },
};

// Helper function to get API URL with endpoint
export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.api.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Helper function to get API config
export const getApiConfig = () => config.api;

// Helper function to check if feature is enabled
export const isFeatureEnabled = (featureName) => {
  return config.features[featureName] || false;
};

export default config;