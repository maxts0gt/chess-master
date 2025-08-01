// API Configuration for different environments
export const API_CONFIG = {
  // For Android Emulator
  ANDROID_EMULATOR: 'http://10.0.2.2:8080/api/v1',
  
  // For iOS Simulator  
  IOS_SIMULATOR: 'http://localhost:8080/api/v1',
  
  // For Physical Device (replace with your computer's IP)
  PHYSICAL_DEVICE: 'http://192.168.1.100:8080/api/v1',
  
  // For Web Testing
  WEB: 'http://localhost:8080/api/v1',
  
  // Production
  PRODUCTION: 'https://your-domain.com/api/v1'
};

// Detect platform and return appropriate URL
export const getBackendURL = () => {
  if (!__DEV__) {
    return API_CONFIG.PRODUCTION;
  }
  
  // Default to Android emulator in development
  // Change this based on your testing environment
  return API_CONFIG.ANDROID_EMULATOR;
};