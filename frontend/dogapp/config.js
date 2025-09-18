// Configuration file for the Dog App
// This file contains environment-specific settings

// Determine environment based on __DEV__ flag or explicit setting
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Get local IP for development (you'll need to update this with your actual local IP)
const getLocalIP = () => {
  // For development, you can hardcode your local IP here
  // Run `ipconfig getifaddr en0` on macOS or `ipconfig` on Windows to find it
  return 'localhost'; // Change this to your actual local IP for mobile testing
};

const config = {
  // Backend API Configuration
  api: {
    baseUrl: isDevelopment 
      ? `http://${getLocalIP()}:8080` 
      : 'https://dogapp-backend.vercel.app',
    timeout: isDevelopment ? 10000 : 15000, // Shorter timeout for local development
    retries: isDevelopment ? 2 : 3,
  },
  
  // Environment settings
  environment: isDevelopment ? 'development' : 'production',
  
  // Feature flags
  features: {
    enableOfflineMode: false,
    enablePushNotifications: !isDevelopment, // Disable push notifications in development
    enableAnalytics: !isDevelopment, // Disable analytics in development
    enableDebugLogs: isDevelopment, // Enable debug logs only in development
  },
  
  // Cache settings
  cache: {
    dogBreedsExpiry: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 minute in dev, 5 minutes in prod
    userDataExpiry: isDevelopment ? 10 * 60 * 1000 : 30 * 60 * 1000, // 10 minutes in dev, 30 minutes in prod
  },
  
  // Image upload settings
  image: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    quality: isDevelopment ? 0.9 : 0.8, // Higher quality in development
    allowedFormats: ['jpg', 'jpeg', 'png'],
  },

  // Development specific settings
  dev: {
    enableMockData: false, // Set to true to use mock data instead of API calls
    logApiCalls: isDevelopment, // Log all API calls in development
    showPerformanceMetrics: isDevelopment, // Show performance metrics
  },
};

// Helper function to get API URL with endpoint
export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.api.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;
  
  // Log API calls in development
  if (config.dev.logApiCalls) {
    console.log(`🌐 API Call: ${fullUrl}`);
  }
  
  return fullUrl;
};

// Helper function to get API config
export const getApiConfig = () => config.api;

// Helper function to check if feature is enabled
export const isFeatureEnabled = (featureName) => {
  return config.features[featureName] || false;
};

// Helper function to check if we're in development mode
export const isDev = () => isDevelopment;

// Helper function to log debug messages (only in development)
export const debugLog = (message, data = null) => {
  if (config.features.enableDebugLogs) {
    console.log(`🐕 [DEBUG] ${message}`, data || '');
  }
};

// Helper function to get environment info
export const getEnvironmentInfo = () => ({
  isDevelopment,
  isProduction,
  environment: config.environment,
  apiBaseUrl: config.api.baseUrl,
});

export default config;