// Device ID utility for guest tracking
// Uses localStorage to persist a unique device ID across sessions

const DEVICE_ID_KEY = 'beehive_device_id';

/**
 * Generate a unique device ID using crypto API
 */
const generateDeviceId = (): string => {
  // Use crypto API if available for better uniqueness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `device_${crypto.randomUUID()}`;
  }
  // Fallback: Generate ID from timestamp + random
  return `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Get or create device ID
 * Returns existing ID from localStorage or generates a new one
 */
export const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('📱 New device ID generated:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    // Handle cases where localStorage is not available
    console.warn('localStorage not available, generating temporary device ID');
    return generateDeviceId();
  }
};

/**
 * Clear device ID (useful for testing or "forget me" feature)
 */
export const clearDeviceId = (): void => {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Could not clear device ID');
  }
};

/**
 * Check if device ID exists
 */
export const hasDeviceId = (): boolean => {
  try {
    return !!localStorage.getItem(DEVICE_ID_KEY);
  } catch (error) {
    return false;
  }
};
