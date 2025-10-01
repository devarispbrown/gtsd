/**
 * Type-safe navigation types for GTSD mobile app
 * Provides strict typing for all navigation routes and parameters
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TaskType } from '@gtsd/shared-types';

/**
 * Main stack param list
 * Defines all routes and their required/optional parameters
 */
export type RootStackParamList = {
  // Main screens
  Today: {
    reminder?: 'pending' | 'overdue';
    scrollToTask?: boolean;
  } | undefined;

  /**
   * Task detail screen
   * @param taskId - The ID of the task to display
   */
  TaskDetail: { taskId: number };

  /**
   * Add evidence screen
   * @param taskId - The ID of the task to add evidence for
   * @param taskType - The type of task (for context)
   */
  AddEvidence: {
    taskId: number;
    taskType: TaskType;
  };

  /**
   * Evidence detail screen
   * @param evidenceId - The ID of the evidence to display
   * @param taskId - The ID of the parent task
   */
  EvidenceDetail: {
    evidenceId: number;
    taskId: number;
  };

  Settings: undefined;
  Login: undefined;

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
};

/**
 * Tab navigator param list (if using bottom tabs)
 */
export type TabParamList = {
  TodayTab: undefined;
  ProgressTab: undefined;
  SettingsTab: undefined;
};

// ============================================================================
// Screen Props Types
// ============================================================================

/**
 * Main screen props types
 */
export type TodayScreenProps = NativeStackScreenProps<RootStackParamList, 'Today'>;
export type TaskDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;
export type AddEvidenceScreenProps = NativeStackScreenProps<RootStackParamList, 'AddEvidence'>;
export type EvidenceDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'EvidenceDetail'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/**
 * Onboarding screen props
 */
export type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
export type AccountBasicsScreenProps = NativeStackScreenProps<RootStackParamList, 'AccountBasics'>;
export type GoalsScreenProps = NativeStackScreenProps<RootStackParamList, 'Goals'>;
export type HealthMetricsScreenProps = NativeStackScreenProps<RootStackParamList, 'HealthMetrics'>;
export type ActivityLevelScreenProps = NativeStackScreenProps<RootStackParamList, 'ActivityLevel'>;
export type PreferencesScreenProps = NativeStackScreenProps<RootStackParamList, 'Preferences'>;
export type PartnersScreenProps = NativeStackScreenProps<RootStackParamList, 'Partners'>;
export type ReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'Review'>;
export type HowItWorksScreenProps = NativeStackScreenProps<RootStackParamList, 'HowItWorks'>;

// ============================================================================
// Generic Navigation Types
// ============================================================================

/**
 * Navigation prop type for use in components
 * Use this for type-safe navigation.navigate() calls
 */
export type RootNavigationProp = TodayScreenProps['navigation'];

/**
 * Route prop type for accessing route params
 */
export type RootRouteProp<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>['route'];

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Extract route params for a given screen
 * @example
 * type TaskDetailParams = RouteParams<'TaskDetail'>; // { taskId: number }
 */
export type RouteParams<T extends keyof RootStackParamList> = RootStackParamList[T];

/**
 * Type guard to check if route has parameters
 */
export const hasParams = <T extends keyof RootStackParamList>(
  route: RootRouteProp<T>
): route is RootRouteProp<T> & { params: NonNullable<RouteParams<T>> } => {
  return route.params !== undefined;
};