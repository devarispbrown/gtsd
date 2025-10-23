import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { TodayScreen } from '@screens/TodayScreen';
import { BadgesScreen } from '../screens/BadgesScreen';
import { RootStackParamList } from '../types/navigation';
import { useThemeStore } from '@store/themeStore';
import { useAuthStore } from '../stores/authStore';
import { colors } from '@constants/colors';

// Import onboarding screens
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { AccountBasicsScreen } from '../screens/onboarding/AccountBasicsScreen';
import { GoalsScreen } from '../screens/onboarding/GoalsScreen';
import { HealthMetricsScreen } from '../screens/onboarding/HealthMetricsScreen';
import { ActivityLevelScreen } from '../screens/onboarding/ActivityLevelScreen';
import { PreferencesScreen } from '../screens/onboarding/PreferencesScreen';
import { PartnersScreen } from '../screens/onboarding/PartnersScreen';
import { ReviewScreen } from '../screens/onboarding/ReviewScreen';
import { HowItWorksScreen } from '../screens/onboarding/HowItWorksScreen';

// Import auth screens (we'll need to create LoginScreen)
// import { LoginScreen } from '../screens/auth/LoginScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Loading screen component
 */
const LoadingScreen: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? colors.dark.background : colors.light.background,
      }}
    >
      <ActivityIndicator
        size="large"
        color={isDark ? colors.dark.primary : colors.light.primary}
      />
    </View>
  );
};

const RootNavigator: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const {
    isAuthenticated,
    requiresOnboarding,
    isLoading,
    checkAuthStatus,
  } = useAuthStore();

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await checkAuthStatus();
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [checkAuthStatus]);

  // Show loading screen while checking auth status
  if (isInitializing || isLoading) {
    return <LoadingScreen />;
  }

  // Determine initial route based on auth and onboarding status
  let initialRouteName: keyof RootStackParamList;

  if (!isAuthenticated) {
    // User is not authenticated, show welcome/login
    initialRouteName = 'Welcome';
  } else if (requiresOnboarding) {
    // User is authenticated but needs to complete onboarding
    initialRouteName = 'AccountBasics';
  } else {
    // User is authenticated and has completed onboarding
    initialRouteName = 'Today';
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? colors.dark.background : colors.light.background,
        },
        headerTintColor: isDark ? colors.dark.text : colors.light.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        contentStyle: {
          backgroundColor: isDark ? colors.dark.background : colors.light.background,
        },
        animation: 'slide_from_right',
        headerShadowVisible: false,
      }}
    >
      {/* Authentication Screens */}
      {!isAuthenticated && (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{
              headerShown: false,
            }}
          />
          {/* Add LoginScreen and SignupScreen here when created */}
        </>
      )}

      {/* Onboarding Screens - Only show if authenticated but not onboarded */}
      {isAuthenticated && requiresOnboarding && (
        <>
          <Stack.Screen
            name="AccountBasics"
            component={AccountBasicsScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
              // Prevent going back to auth screens
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="Goals"
            component={GoalsScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="HealthMetrics"
            component={HealthMetricsScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="ActivityLevel"
            component={ActivityLevelScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Preferences"
            component={PreferencesScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Partners"
            component={PartnersScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="HowItWorks"
            component={HowItWorksScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}

      {/* Main App Screens - Only show if authenticated and onboarded */}
      {isAuthenticated && !requiresOnboarding && (
        <>
          <Stack.Screen
            name="Today"
            component={TodayScreen}
            options={{
              title: 'Today',
              headerLargeTitle: true,
              headerLargeTitleStyle: {
                fontWeight: '700',
                fontSize: 34,
              },
            }}
          />
          <Stack.Screen
            name="Badges"
            component={BadgesScreen}
            options={{
              title: 'Achievements',
              headerBackTitle: 'Back',
              headerLargeTitle: false,
            }}
          />
          {/* Add other main app screens here */}
        </>
      )}

      {/* Screens accessible from any state (for development/testing) */}
      {__DEV__ && (
        <>
          {/* Keep all screens available in dev mode for testing */}
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AccountBasics"
            component={AccountBasicsScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Goals"
            component={GoalsScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="HealthMetrics"
            component={HealthMetricsScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="ActivityLevel"
            component={ActivityLevelScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Preferences"
            component={PreferencesScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Partners"
            component={PartnersScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{
              title: '',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="HowItWorks"
            component={HowItWorksScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Today"
            component={TodayScreen}
            options={{
              title: 'Today',
              headerLargeTitle: true,
              headerLargeTitleStyle: {
                fontWeight: '700',
                fontSize: 34,
              },
            }}
          />
          <Stack.Screen
            name="Badges"
            component={BadgesScreen}
            options={{
              title: 'Achievements',
              headerBackTitle: 'Back',
              headerLargeTitle: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;