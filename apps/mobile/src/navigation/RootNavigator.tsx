import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TodayScreen } from '@screens/TodayScreen';
import { RootStackParamList } from '../types/navigation';
import { useThemeStore } from '@store/themeStore';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // TODO: Check if user has completed onboarding
  // For now, start with Welcome screen for demo
  const initialRouteName = 'Welcome';

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
      {/* Main Screens */}
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

      {/* Onboarding Screens */}
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
    </Stack.Navigator>
  );
};

export default RootNavigator;