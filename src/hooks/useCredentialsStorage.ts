import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

interface StoredCredentials {
  identifier: string;
  password: string;
  centerId: string;
  centerName: string;
  biometricEnabled: boolean;
  pin?: string;
  pinEnabled?: boolean;
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

  // Set PIN for quick login
  const setPin = useCallback((pin: string) => {
    try {
      if (storedCredentials) {
        const updated = { ...storedCredentials, pin, pinEnabled: true };
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(updated));
        setStoredCredentials(updated);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting PIN:', error);
      return false;
    }
  }, [storedCredentials]);

  // Disable PIN
  const disablePin = useCallback(() => {
    try {
      if (storedCredentials) {
        const updated = { ...storedCredentials, pin: undefined, pinEnabled: false };
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(updated));
        setStoredCredentials(updated);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disabling PIN:', error);
      return false;
    }
  }, [storedCredentials]);

  // Verify PIN
  const verifyPin = useCallback((inputPin: string): boolean => {
    if (storedCredentials?.pinEnabled && storedCredentials?.pin) {
      return storedCredentials.pin === inputPin;
    }
    return false;
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

  // Check if biometric is available using native plugin
  const isBiometricAvailable = useCallback(async (): Promise<boolean> => {
    // Only check on native platforms
    if (!Capacitor.isNativePlatform()) {
      // For web, return true if touch is available (for testing)
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }, []);

  // Authenticate with biometric using native plugin
  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!storedCredentials?.biometricEnabled) {
      return false;
    }

    // On native platform, use real biometric
    if (Capacitor.isNativePlatform()) {
      try {
        // Check if available first
        const availability = await NativeBiometric.isAvailable();
        if (!availability.isAvailable) {
          return false;
        }

        // Perform biometric verification
        await NativeBiometric.verifyIdentity({
          reason: 'تسجيل الدخول إلى تطبيق حلقات القرآن',
          title: 'تأكيد الهوية',
          subtitle: 'استخدم البصمة للدخول',
          description: '',
          useFallback: true,
          fallbackTitle: 'استخدم كلمة المرور',
        });

        return true;
      } catch (error) {
        console.error('Biometric authentication failed:', error);
        return false;
      }
    }

    // On web, simulate success for testing
    return true;
  }, [storedCredentials]);

  return {
    storedCredentials,
    isLoading,
    saveCredentials,
    toggleBiometric,
    clearCredentials,
    isBiometricAvailable,
    authenticateWithBiometric,
    setPin,
    disablePin,
    verifyPin,
    hasStoredCredentials: !!storedCredentials,
    isBiometricEnabled: storedCredentials?.biometricEnabled || false,
    isPinEnabled: storedCredentials?.pinEnabled || false
  };
};
