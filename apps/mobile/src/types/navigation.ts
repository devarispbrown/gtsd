import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define the param list for your navigation stack
export type RootStackParamList = {
  // Main screens
  Today: undefined;
  TaskDetail?: { taskId: string };
  Settings?: undefined;
  Login?: undefined;

  // Onboarding screens
  Welcome: undefined;
  AccountBasics: undefined;
  Goals: undefined;
  HealthMetrics: undefined;
  ActivityLevel: undefined;
  Preferences: undefined;
  Partners: undefined;
  Review: undefined;
  HowItWorks: undefined;

  // Add more screens as needed
};

// Generate screen props types
export type TodayScreenProps = NativeStackScreenProps<RootStackParamList, 'Today'>;
export type TaskDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// Onboarding screen props
export type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
export type AccountBasicsScreenProps = NativeStackScreenProps<RootStackParamList, 'AccountBasics'>;
export type GoalsScreenProps = NativeStackScreenProps<RootStackParamList, 'Goals'>;
export type HealthMetricsScreenProps = NativeStackScreenProps<RootStackParamList, 'HealthMetrics'>;
export type ActivityLevelScreenProps = NativeStackScreenProps<RootStackParamList, 'ActivityLevel'>;
export type PreferencesScreenProps = NativeStackScreenProps<RootStackParamList, 'Preferences'>;
export type PartnersScreenProps = NativeStackScreenProps<RootStackParamList, 'Partners'>;
export type ReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'Review'>;
export type HowItWorksScreenProps = NativeStackScreenProps<RootStackParamList, 'HowItWorks'>;

// Navigation prop type for use in components
export type NavigationProp = TodayScreenProps['navigation'];
export type RouteProp = TodayScreenProps['route'];