import { useState, useEffect, useCallback } from 'react';

interface StoredCredentials {
  identifier: string;
  password: string;
  centerId: string;
  centerName: string;
  biometricEnabled: boolean;
}

const CREDENTIALS_KEY = 'quran_app_credentials';

export const useCredentialsStorage = () => {
  const [storedCredentials, setStoredCredentials] = useState<StoredCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored credentials on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        setStoredCredentials(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save credentials after successful login
  const saveCredentials = useCallback((credentials: Omit<StoredCredentials, 'biometricEnabled'>) => {
    try {
      const existing = localStorage.getItem(CREDENTIALS_KEY);
      const existingData = existing ? JSON.parse(existing) : {};
      
      const newData: StoredCredentials = {
        ...credentials,
        biometricEnabled: existingData.biometricEnabled || false
      };
      
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(newData));
      setStoredCredentials(newData);
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  }, []);

  // Enable/disable biometric login
  const toggleBiometric = useCallback((enabled: boolean) => {
    try {
      if (storedCredentials) {
        const updated = { ...storedCredentials, biometricEnabled: enabled };
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(updated));
        setStoredCredentials(updated);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling biometric:', error);
      return false;
    }
  }, [storedCredentials]);

  // Clear stored credentials
  const clearCredentials = useCallback(() => {
    try {
      localStorage.removeItem(CREDENTIALS_KEY);
      setStoredCredentials(null);
      return true;
    } catch (error) {
      console.error('Error clearing credentials:', error);
      return false;
    }
  }, []);

  // Check if biometric is available (placeholder for Capacitor integration)
  const isBiometricAvailable = useCallback(async (): Promise<boolean> => {
    // This will be implemented with Capacitor's biometric plugin
    // For now, return true if running in a mobile context
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Authenticate with biometric (placeholder for Capacitor integration)
  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    // This will be implemented with Capacitor's biometric plugin
    // For now, simulate success if biometric is enabled
    if (storedCredentials?.biometricEnabled) {
      // In a real implementation, this would trigger the device's biometric prompt
      return true;
    }
    return false;
  }, [storedCredentials]);

  return {
    storedCredentials,
    isLoading,
    saveCredentials,
    toggleBiometric,
    clearCredentials,
    isBiometricAvailable,
    authenticateWithBiometric,
    hasStoredCredentials: !!storedCredentials,
    isBiometricEnabled: storedCredentials?.biometricEnabled || false
  };
};
