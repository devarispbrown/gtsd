/**
 * GTSD Mobile App
 * Main application entry point with navigation and state management
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from '@navigation/RootNavigator';
import { DeepLinkHandler } from '@navigation/DeepLinkHandler';
import { useThemeStore } from '@store/themeStore';
import { navigationTheme } from '@constants/theme';
import type { RootStackParamList } from '@types/navigation';

/**
 * Deep linking configuration for React Navigation
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['gtsd://', 'https://gtsd.app', 'https://www.gtsd.app'],
  config: {
    screens: {
      // Main screens
      Today: {
        path: 'today',
        parse: {
          reminder: (reminder: string) => reminder as 'pending' | 'overdue',
          scrollToTask: (value: string) => value === 'true',
        },
      },
      TaskDetail: {
        path: 'task/:taskId',
        parse: {
          taskId: (taskId: string) => parseInt(taskId, 10),
        },
      },
      Settings: 'settings',
      Login: 'login',

      // Onboarding screens
      Welcome: 'welcome',
      AccountBasics: 'onboarding/account',
      Goals: 'onboarding/goals',
      HealthMetrics: 'onboarding/health',
      ActivityLevel: 'onboarding/activity',
      Preferences: 'onboarding/preferences',
      Partners: 'onboarding/partners',
      Review: 'onboarding/review',
      HowItWorks: 'onboarding/how-it-works',
    },
  },
};

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const { setTheme } = useThemeStore();

  useEffect(() => {
    // Set theme based on system preference
    setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setTheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={navigationTheme(isDarkMode)}
          linking={linking}
        >
          <DeepLinkHandler>
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={isDarkMode ? '#000000' : '#FFFFFF'}
            />
            <RootNavigator />
          </DeepLinkHandler>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;