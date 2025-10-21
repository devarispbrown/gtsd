/**
 * Secure Storage Utility
 * Provides secure storage for sensitive data like tokens
 * Uses react-native-keychain for iOS Keychain and Android Keystore
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

// Storage keys
const SECURE_STORAGE_SERVICE = '@gtsd_secure';
const TOKEN_KEY = '@gtsd_auth_token';
const REFRESH_TOKEN_KEY = '@gtsd_refresh_token';
const TOKEN_EXPIRY_KEY = '@gtsd_token_expiry';

/**
 * Secure storage interface
 */
export interface SecureStorageItem {
  key: string;
  value: string;
}

/**
 * Token storage data
 */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds
}

/**
 * Check if running in a secure environment
 * Note: Keychain may not work in some simulators/emulators
 */
const isSecureStorageAvailable = async (): Promise<boolean> => {
  try {
    // Check if we can access keychain
    const supported = await Keychain.getSupportedBiometryType();
    return supported !== null || true; // Keychain is available on iOS and Android
  } catch {
    return false;
  }
};

/**
 * Secure storage utility class
 */
class SecureStorage {
  private useKeychain: boolean = true;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize secure storage
   */
  private async initialize() {
    this.useKeychain = await isSecureStorageAvailable();

    if (!this.useKeychain) {
      console.warn('Secure storage not available, falling back to AsyncStorage');
    }
  }

  /**
   * Store item securely
   */
  async setItem(key: string, value: string): Promise<void> {
    if (this.useKeychain) {
      try {
        await Keychain.setInternetCredentials(
          SECURE_STORAGE_SERVICE,
          key,
          value,
          {
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            accessGroup: undefined,
            authenticationPrompt: {
              title: 'GTSD Authentication',
              subtitle: 'Authenticate to access your GTSD data',
            },
          }
        );
      } catch (error) {
        console.error('Keychain storage failed, falling back to AsyncStorage', error);
        await AsyncStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  /**
   * Retrieve item from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    if (this.useKeychain) {
      try {
        const credentials = await Keychain.getInternetCredentials(SECURE_STORAGE_SERVICE);
        if (credentials && credentials.username === key) {
          return credentials.password;
        }
        return null;
      } catch (error) {
        console.error('Keychain retrieval failed, falling back to AsyncStorage', error);
        return AsyncStorage.getItem(key);
      }
    } else {
      return AsyncStorage.getItem(key);
    }
  }

  /**
   * Remove item from secure storage
   */
  async removeItem(key: string): Promise<void> {
    if (this.useKeychain) {
      try {
        await Keychain.resetInternetCredentials(SECURE_STORAGE_SERVICE as any);
      } catch (error) {
        console.error('Keychain removal failed, falling back to AsyncStorage', error);
        await AsyncStorage.removeItem(key);
      }
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  /**
   * Clear all secure storage
   */
  async clear(): Promise<void> {
    if (this.useKeychain) {
      try {
        await Keychain.resetInternetCredentials(SECURE_STORAGE_SERVICE as any);
      } catch (error) {
        console.error('Keychain clear failed', error);
      }
    }

    // Also clear AsyncStorage tokens
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY]);
  }
}

// Create singleton instance
const secureStorage = new SecureStorage();

/**
 * Token management functions
 */
export const tokenStorage = {
  /**
   * Store authentication tokens securely
   */
  async storeTokens(data: TokenData): Promise<void> {
    try {
      await Promise.all([
        secureStorage.setItem(TOKEN_KEY, data.accessToken),
        data.refreshToken
          ? secureStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
          : Promise.resolve(),
        data.expiresAt
          ? AsyncStorage.setItem(TOKEN_EXPIRY_KEY, data.expiresAt.toString())
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  },

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const [token, expiryStr] = await Promise.all([
        secureStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(TOKEN_EXPIRY_KEY),
      ]);

      if (!token) return null;

      // Check if token is expired
      if (expiryStr) {
        const expiry = parseInt(expiryStr, 10);
        if (Date.now() >= expiry) {
          await this.clearTokens();
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await secureStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  },

  /**
   * Get all stored tokens
   */
  async getTokens(): Promise<TokenData | null> {
    try {
      const [accessToken, refreshToken, expiryStr] = await Promise.all([
        secureStorage.getItem(TOKEN_KEY),
        secureStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(TOKEN_EXPIRY_KEY),
      ]);

      if (!accessToken) return null;

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt: expiryStr ? parseInt(expiryStr, 10) : undefined,
      };
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return null;
    }
  },

  /**
   * Check if tokens are expired
   */
  async areTokensExpired(): Promise<boolean> {
    try {
      const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiryStr) return false;

      const expiry = parseInt(expiryStr, 10);
      return Date.now() >= expiry;
    } catch (error) {
      console.error('Failed to check token expiry:', error);
      return false;
    }
  },

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await secureStorage.clear();
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      throw new Error('Failed to clear authentication tokens');
    }
  },

  /**
   * Check if user is authenticated (has valid tokens)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  },
};

export default tokenStorage;