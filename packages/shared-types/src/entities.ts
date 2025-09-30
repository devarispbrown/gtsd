/**
 * Core entity types matching database schema
 * These represent the actual data structures returned from the database
 */

import {
  TaskType,
  TaskStatus,
  EvidenceType,
  StreakType,
  PlanStatus,
  PrimaryGoal,
  ActivityLevel,
  Gender,
} from './enums';
import { TaskMetadata } from './task-metadata';
import { EvidenceMetrics } from './evidence-metrics';

/**
 * User entity
 */
export interface User {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * User settings entity
 */
export interface UserSettings {
  id: number;
  userId: number;

  // Account basics
  dateOfBirth?: Date | string | null;
  gender?: Gender | null;

  // Goals
  primaryGoal?: PrimaryGoal | null;
  targetWeight?: number | null; // kg
  targetDate?: Date | string | null;
  activityLevel?: ActivityLevel | null;

  // Health metrics
  currentWeight?: number | null; // kg
  height?: number | null; // cm

  // Calculated values
  bmr?: number | null; // Basal Metabolic Rate
  tdee?: number | null; // Total Daily Energy Expenditure
  calorieTarget?: number | null;
  proteinTarget?: number | null; // grams/day
  waterTarget?: number | null; // ml/day

  // Preferences
  dietaryPreferences?: string[] | null;
  allergies?: string[] | null;
  mealsPerDay?: number;

  // Onboarding
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Date | string | null;

  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Accountability partner entity
 */
export interface Partner {
  id: number;
  userId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  notificationPreference: 'email' | 'sms' | 'both';
  inviteSent: boolean;
  inviteSentAt?: Date | string | null;
  accepted: boolean;
  acceptedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Plan entity - daily or weekly plan
 */
export interface Plan {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  planType: 'daily' | 'weekly';
  startDate: Date | string;
  endDate: Date | string;
  status: PlanStatus;
  totalTasks: number;
  completedTasks: number;
  completionPercentage?: number;
  generatedAt: Date | string;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Daily task entity
 */
export interface DailyTask {
  id: number;
  userId: number;
  planId?: number | null;
  title: string;
  description?: string | null;
  taskType: TaskType;
  dueDate: Date | string;
  dueTime?: string | null; // HH:MM:SS format
  status: TaskStatus;
  completedAt?: Date | string | null;
  skippedAt?: Date | string | null;
  skipReason?: string | null;
  metadata?: TaskMetadata | null;
  priority: number;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Evidence entity - proof of task completion
 */
export interface Evidence {
  id: number;
  taskId: number;
  userId: number;
  evidenceType: EvidenceType;
  notes?: string | null;
  metrics?: EvidenceMetrics | null;
  photoUrl?: string | null;
  photoStorageKey?: string | null;
  recordedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Streak entity - tracks consecutive completions
 */
export interface Streak {
  id: number;
  userId: number;
  streakType: StreakType;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletedDate?: Date | string | null;
  streakStartDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Initial plan snapshot entity
 */
export interface InitialPlanSnapshot {
  id: number;
  userId: number;
  startWeight: number;
  targetWeight: number;
  startDate: Date | string;
  targetDate: Date | string;
  weeklyWeightChangeRate?: number | null; // kg/week
  estimatedWeeks?: number | null;
  projectedCompletionDate?: Date | string | null;
  calorieTarget: number;
  proteinTarget: number;
  waterTarget: number;
  primaryGoal: PrimaryGoal;
  activityLevel: ActivityLevel;
  createdAt: Date | string;
}