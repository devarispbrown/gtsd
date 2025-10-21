/**
 * Application Configuration
 * Central configuration for environment variables and feature flags
 */

import Config from 'react-native-config';
import { Platform } from 'react-native';

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Configuration interface
 */
export interface AppConfig {
  // API Configuration
  apiUrl: string;
  apiTimeout: number;

  // Environment
  environment: Environment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;

  // Feature Flags
  features: {
    biometricAuth: boolean;
    pushNotifications: boolean;
    analytics: boolean;
    crashReporting: boolean;
  };

  // Deep Linking
  deepLinking: {
    scheme: string;
    domain: string;
    universalLinksEnabled: boolean;
  };

  // Security
  security: {
    certificatePinning: boolean;
    jailbreakDetection: boolean;
    debuggerDetection: boolean;
  };

  // Development Settings
  dev: {
    autoLogin: boolean;
    skipOnboarding: boolean;
    userEmail?: string;
    userPassword?: string;
    enableReduxDevTools: boolean;
    enableNetworkLogging: boolean;
  };

  // Platform specific
  platform: {
    isIOS: boolean;
    isAndroid: boolean;
    version: string;
    buildNumber: string;
  };

  // External Services
  services: {
    sentryDsn?: string;
    analyticsKey?: string;
    fcmServerKey?: string; // Android
    apnsKeyId?: string; // iOS
    apnsTeamId?: string; // iOS
  };
}

/**
 * Get current environment
 */
const getEnvironment = (): Environment => {
  const env = Config.NODE_ENV || process.env.NODE_ENV;
  switch (env) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    default:
      return 'development';
  }
};

/**
 * Get API URL based on environment and platform
 */
const getApiUrl = (): string => {
  const configUrl = Config.REACT_APP_API_URL || process.env.REACT_APP_API_URL;

  if (configUrl) {
    return configUrl;
  }

  // Default URLs based on environment
  const environment = getEnvironment();

  if (environment === 'production') {
    return 'https://api.gtsd.app/api';
  }

  if (environment === 'staging') {
    return 'https://staging-api.gtsd.app/api';
  }

  // Development defaults
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine
    return 'http://10.0.2.2:3000/api';
  }

  // iOS simulator and physical devices
  return 'http://localhost:3000/api';
};

/**
 * Parse boolean environment variable
 */
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Application configuration singleton
 */
const environment = getEnvironment();

export const appConfig: AppConfig = {
  // API Configuration
  apiUrl: getApiUrl(),
  apiTimeout: 30000, // 30 seconds

  // Environment
  environment,
  isDevelopment: environment === 'development',
  isStaging: environment === 'staging',
  isProduction: environment === 'production',

  // Feature Flags
  features: {
    biometricAuth: parseBoolean(Config.ENABLE_BIOMETRIC_AUTH, true),
    pushNotifications: parseBoolean(Config.ENABLE_PUSH_NOTIFICATIONS, true),
    analytics: parseBoolean(Config.ENABLE_ANALYTICS, environment === 'production'),
    crashReporting: parseBoolean(Config.ENABLE_CRASH_REPORTING, environment === 'production'),
  },

  // Deep Linking
  deepLinking: {
    scheme: Config.DEEP_LINK_SCHEME || 'gtsd',
    domain: Config.DEEP_LINK_DOMAIN || 'gtsd.app',
    universalLinksEnabled: true,
  },

  // Security
  security: {
    certificatePinning: environment === 'production',
    jailbreakDetection: environment === 'production',
    debuggerDetection: environment === 'production',
  },

  // Development Settings
  dev: {
    autoLogin: parseBoolean(Config.DEV_AUTO_LOGIN) && environment === 'development',
    skipOnboarding: parseBoolean(Config.DEV_SKIP_ONBOARDING) && environment === 'development',
    userEmail: Config.DEV_USER_EMAIL,
    userPassword: Config.DEV_USER_PASSWORD,
    enableReduxDevTools: environment === 'development',
    enableNetworkLogging: environment === 'development',
  },

  // Platform specific
  platform: {
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    version: Platform.Version.toString(),
    buildNumber: '1.0.0', // This would come from your app.json or build config
  },

  // External Services
  services: {
    sentryDsn: Config.SENTRY_DSN,
    analyticsKey: Config.ANALYTICS_API_KEY,
    fcmServerKey: Config.FCM_SERVER_KEY,
    apnsKeyId: Config.APNS_KEY_ID,
    apnsTeamId: Config.APNS_TEAM_ID,
  },
};

/**
 * Log configuration in development
 */
if (__DEV__) {
  console.log('App Configuration:', {
    environment: appConfig.environment,
    apiUrl: appConfig.apiUrl,
    features: appConfig.features,
    platform: `${Platform.OS} ${Platform.Version}`,
  });
}

export default appConfig;