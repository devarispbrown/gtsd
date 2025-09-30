import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define the param list for your navigation stack
export type RootStackParamList = {
  Today: undefined;
  TaskDetail?: { taskId: string };
  Settings?: undefined;
  // Add more screens as needed
};

// Generate screen props types
export type TodayScreenProps = NativeStackScreenProps<RootStackParamList, 'Today'>;
export type TaskDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// Navigation prop type for use in components
export type NavigationProp = TodayScreenProps['navigation'];
export type RouteProp = TodayScreenProps['route'];