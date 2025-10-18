import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/ApiClient';

export const API_CONFIG = {
  // Development mode flag
  DEV_MODE: __DEV__,
  
  // Mock data mode - set to true to use mock data instead of API calls
  USE_MOCK_DATA: false, // Temporarily disabled to debug real API issues
  
  // API timeout settings
  REQUEST_TIMEOUT: 30000, // 30 seconds
  
  // Retry settings
  MAX_RETRIES: 2,
  RETRY_DELAY_BASE: 1000,
  RETRY_DELAY_MAX: 5000,
  
  // Debug logging
  ENABLE_DEBUG_LOGGING: true,
};

// Function to check if we should use mock data
export const shouldUseMockData = async (): Promise<boolean> => {
  if (API_CONFIG.USE_MOCK_DATA) {
    return true;
  }
  
  // You can also check AsyncStorage for a debug flag
  try {
    const debugMode = await AsyncStorage.getItem('DEBUG_MODE');
    return debugMode === 'true';
  } catch {
    return false;
  }
};

// Function to toggle mock data mode
export const toggleMockDataMode = async (enabled: boolean) => {
  await AsyncStorage.setItem('DEBUG_MODE', enabled.toString());
};
