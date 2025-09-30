/**
 * GTSD Mobile App
 * Main application entry point with navigation and state management
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from '@navigation/RootNavigator';
import { useThemeStore } from '@store/themeStore';
import { navigationTheme } from '@constants/theme';

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
        <NavigationContainer theme={navigationTheme(isDarkMode)}>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={isDarkMode ? '#000000' : '#FFFFFF'}
          />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;