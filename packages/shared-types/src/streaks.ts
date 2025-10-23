/**
 * Streaks and Achievements/Badges System Types
 *
 * This module provides comprehensive type safety for the daily compliance streak
 * tracking and badge/achievement system.
 *
 * Key Features:
 * - Daily compliance tracking based on task completion percentage
 * - Atomic streak updates with optimistic concurrency control
 * - Idempotent badge awards using unique constraints
 * - Extensible badge system for future achievements
 */

import { BadgeType } from './enums';

/**
 * Badge types - All available achievement badges
 *
 * Current badges:
 * - DAY_ONE_DONE: Awarded on first compliant day
 *
 * Future badges (prepared for implementation):
 * - HYDRATION_NATION: Complete hydration tasks for 7 days
 * - PROTEIN_PRO: Hit protein target for 14 consecutive days
 * - WEEK_WARRIOR: Maintain 7-day streak
 * - CONSISTENCY_KING: Maintain 30-day streak
 * - HUNDRED_CLUB: Reach 100-day streak
 * - PERFECT_MONTH: Complete 30 days with 100% compliance
 * - EARLY_BIRD: Complete morning tasks before 9 AM for 7 days
 * - WEEKEND_WARRIOR: Stay compliant on weekends for 4 weeks
 * - COMEBACK_KID: Resume streak after a break
 * - MILESTONE_MASTER: Reach specific weight/measurement milestones
 */

/**
 * Badge metadata - Display information for each badge type
 */
export interface BadgeMetadata {
  type: BadgeType;
  name: string;
  description: string;
  emoji: string;
  category: 'milestone' | 'streak' | 'task_specific' | 'time_based' | 'special';
  unlockCriteria: string;
  isImplemented: boolean;
}

/**
 * Complete badge catalog with metadata
 */
export const BADGE_CATALOG: Record<BadgeType, BadgeMetadata> = {
  [BadgeType.DayOneDone]: {
    type: BadgeType.DayOneDone,
    name: 'Day One, Done',
    description: 'Completed your first compliant day',
    emoji: '✅',
    category: 'milestone',
    unlockCriteria: 'Complete your first day with 80%+ task completion',
    isImplemented: true,
  },
  [BadgeType.WeekWarrior]: {
    type: BadgeType.WeekWarrior,
    name: 'Week Warrior',
    description: 'Maintained a 7-day streak',
    emoji: '🗓️',
    category: 'streak',
    unlockCriteria: 'Complete 7 consecutive compliant days',
    isImplemented: false,
  },
  [BadgeType.ConsistencyKing]: {
    type: BadgeType.ConsistencyKing,
    name: 'Consistency King',
    description: 'Maintained a 30-day streak',
    emoji: '👑',
    category: 'streak',
    unlockCriteria: 'Complete 30 consecutive compliant days',
    isImplemented: false,
  },
  [BadgeType.HundredClub]: {
    type: BadgeType.HundredClub,
    name: 'Hundred Club',
    description: 'Reached the legendary 100-day streak',
    emoji: '💯',
    category: 'streak',
    unlockCriteria: 'Complete 100 consecutive compliant days',
    isImplemented: false,
  },
  [BadgeType.PerfectMonth]: {
    type: BadgeType.PerfectMonth,
    name: 'Perfect Month',
    description: 'Completed 30 days with 100% compliance',
    emoji: '🌟',
    category: 'streak',
    unlockCriteria: 'Complete all tasks (100%) for 30 days',
    isImplemented: false,
  },
  [BadgeType.HydrationNation]: {
    type: BadgeType.HydrationNation,
    name: 'Hydration Nation',
    description: 'Hit water intake goals for 7 days',
    emoji: '💧',
    category: 'task_specific',
    unlockCriteria: 'Complete hydration tasks for 7 consecutive days',
    isImplemented: false,
  },
  [BadgeType.ProteinPro]: {
    type: BadgeType.ProteinPro,
    name: 'Protein Pro',
    description: 'Hit protein targets for 14 days',
    emoji: '🥩',
    category: 'task_specific',
    unlockCriteria: 'Meet protein target for 14 consecutive days',
    isImplemented: false,
  },
  [BadgeType.WorkoutWarrior]: {
    type: BadgeType.WorkoutWarrior,
    name: 'Workout Warrior',
    description: 'Completed workouts for 21 days',
    emoji: '💪',
    category: 'task_specific',
    unlockCriteria: 'Complete workout tasks for 21 consecutive days',
    isImplemented: false,
  },
  [BadgeType.SupplementChampion]: {
    type: BadgeType.SupplementChampion,
    name: 'Supplement Champion',
    description: 'Never missed a supplement for 30 days',
    emoji: '💊',
    category: 'task_specific',
    unlockCriteria: 'Complete supplement tasks for 30 consecutive days',
    isImplemented: false,
  },
  [BadgeType.CardioKing]: {
    type: BadgeType.CardioKing,
    name: 'Cardio King',
    description: 'Completed cardio sessions for 14 days',
    emoji: '🏃',
    category: 'task_specific',
    unlockCriteria: 'Complete cardio tasks for 14 consecutive days',
    isImplemented: false,
  },
  [BadgeType.EarlyBird]: {
    type: BadgeType.EarlyBird,
    name: 'Early Bird',
    description: 'Completed morning tasks before 9 AM for 7 days',
    emoji: '🌅',
    category: 'time_based',
    unlockCriteria: 'Complete morning tasks before 9 AM for 7 consecutive days',
    isImplemented: false,
  },
  [BadgeType.NightOwl]: {
    type: BadgeType.NightOwl,
    name: 'Night Owl',
    description: 'Completed evening tasks consistently',
    emoji: '🦉',
    category: 'time_based',
    unlockCriteria: 'Complete evening tasks after 8 PM for 7 consecutive days',
    isImplemented: false,
  },
  [BadgeType.WeekendWarrior]: {
    type: BadgeType.WeekendWarrior,
    name: 'Weekend Warrior',
    description: 'Stayed compliant on weekends for 4 weeks',
    emoji: '🎯',
    category: 'time_based',
    unlockCriteria: 'Complete Saturday and Sunday tasks for 4 consecutive weeks',
    isImplemented: false,
  },
  [BadgeType.ComebackKid]: {
    type: BadgeType.ComebackKid,
    name: 'Comeback Kid',
    description: 'Resumed your streak after a break',
    emoji: '🔥',
    category: 'special',
    unlockCriteria: 'Return to compliance within 3 days of a missed day',
    isImplemented: false,
  },
  [BadgeType.MilestoneMaster]: {
    type: BadgeType.MilestoneMaster,
    name: 'Milestone Master',
    description: 'Reached your first major goal milestone',
    emoji: '🎖️',
    category: 'special',
    unlockCriteria: 'Achieve 25% of your weight/fitness goal',
    isImplemented: false,
  },
  [BadgeType.PhotoFinisher]: {
    type: BadgeType.PhotoFinisher,
    name: 'Photo Finisher',
    description: 'Logged progress photos consistently',
    emoji: '📸',
    category: 'special',
    unlockCriteria: 'Upload progress photos for 4 consecutive weeks',
    isImplemented: false,
  },
};

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Daily compliance streak entity
 * Tracks user's consecutive compliant days across all daily tasks
 */
export interface DailyComplianceStreak {
  id: number;
  userId: number;

  // Streak tracking
  currentStreak: number;        // Current consecutive compliant days
  longestStreak: number;        // All-time best streak
  totalCompliantDays: number;   // Lifetime count of compliant days

  // Date tracking
  lastComplianceDate: Date | string | null;  // Last date user was compliant
  streakStartDate: Date | string | null;     // When current streak began

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * User badge entity - Represents a badge awarded to a user
 */
export interface UserBadge {
  id: number;
  userId: number;
  badgeType: BadgeType;
  awardedAt: Date | string;
  createdAt: Date | string;
}

/**
 * User badge with metadata - Enriched badge for display
 */
export interface UserBadgeWithMetadata extends UserBadge {
  metadata: BadgeMetadata;
}

// ============================================================================
// Compliance Calculation Types
// ============================================================================

/**
 * Compliance threshold configuration
 * Defines what percentage of tasks must be completed for a day to count as compliant
 */
export interface ComplianceThreshold {
  /** Percentage of tasks that must be completed (0-100) */
  percentage: number;

  /** Minimum number of tasks that must exist for day to be evaluated */
  minimumTasks?: number;
}

/**
 * Default compliance threshold (80% of tasks completed)
 */
export const DEFAULT_COMPLIANCE_THRESHOLD: ComplianceThreshold = {
  percentage: 80,
  minimumTasks: 1,
};

/**
 * Daily compliance calculation result
 */
export interface DailyComplianceResult {
  date: string;                    // YYYY-MM-DD format
  totalTasks: number;              // Total tasks for the day
  completedTasks: number;          // Tasks marked as completed
  completionPercentage: number;    // Percentage (0-100)
  isCompliant: boolean;            // Whether day meets compliance threshold
  threshold: ComplianceThreshold;  // Threshold used for calculation
}

/**
 * Streak update operation result
 */
export interface StreakUpdateResult {
  previousStreak: number;
  newStreak: number;
  streakIncreased: boolean;
  streakReset: boolean;
  newLongestStreak: boolean;
}

// ============================================================================
// Badge Award Types
// ============================================================================

/**
 * Badge award criteria - Interface for checking if badge should be awarded
 */
export interface BadgeAwardCriteria {
  badgeType: BadgeType;
  shouldAward: (context: BadgeAwardContext) => boolean | Promise<boolean>;
}

/**
 * Badge award context - Data available when evaluating badge criteria
 */
export interface BadgeAwardContext {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  totalCompliantDays: number;
  complianceResult: DailyComplianceResult;
  existingBadges: BadgeType[];
}

/**
 * Badge award operation result
 */
export interface BadgeAwardResult {
  badgeType: BadgeType;
  awarded: boolean;           // Whether badge was newly awarded
  alreadyEarned: boolean;     // Whether user already had this badge
  badge?: UserBadge;          // The badge entity if awarded
}

/**
 * Multi-badge award result
 */
export interface MultiBadgeAwardResult {
  totalChecked: number;
  newBadgesAwarded: BadgeType[];
  alreadyEarned: BadgeType[];
  results: BadgeAwardResult[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * GET /v1/streaks/me - Get current user's streak information
 */
export interface GetMyStreakResponse {
  streak: DailyComplianceStreak;
  todayCompliance: DailyComplianceResult | null;
  canIncrementToday: boolean;
}

/**
 * POST /v1/streaks/check-compliance - Manually trigger compliance check for a date
 */
export interface CheckComplianceRequest {
  date?: string;  // YYYY-MM-DD format, defaults to today
}

/**
 * POST /v1/streaks/check-compliance - Response
 */
export interface CheckComplianceResponse {
  compliance: DailyComplianceResult;
  streakUpdate: StreakUpdateResult | null;
  badgesAwarded: MultiBadgeAwardResult;
}

/**
 * GET /v1/badges/me - Get current user's earned badges
 */
export interface GetMyBadgesResponse {
  badges: UserBadgeWithMetadata[];
  totalBadges: number;
  totalAvailable: number;
  completionPercentage: number;
}

/**
 * GET /v1/badges/available - Get all available badges
 */
export interface GetAvailableBadgesResponse {
  badges: BadgeMetadata[];
  total: number;
}

/**
 * GET /v1/badges/:badgeType - Get specific badge details
 */
export interface GetBadgeDetailsResponse {
  badge: BadgeMetadata;
  earned: boolean;
  earnedAt?: Date | string;
  progress?: number;  // Optional progress percentage (0-100)
}

// ============================================================================
// Database Insert/Update Types
// ============================================================================

/**
 * Insert type for daily_compliance_streaks table
 */
export interface InsertDailyComplianceStreak {
  userId: number;
  currentStreak?: number;
  longestStreak?: number;
  totalCompliantDays?: number;
  lastComplianceDate?: Date | string | null;
  streakStartDate?: Date | string | null;
}

/**
 * Update type for daily_compliance_streaks table
 */
export interface UpdateDailyComplianceStreak {
  currentStreak?: number;
  longestStreak?: number;
  totalCompliantDays?: number;
  lastComplianceDate?: Date | string | null;
  streakStartDate?: Date | string | null;
  updatedAt?: Date | string;
}

/**
 * Insert type for user_badges table
 */
export interface InsertUserBadge {
  userId: number;
  badgeType: BadgeType;
  awardedAt?: Date | string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a badge is implemented
 */
export const isBadgeImplemented = (badgeType: BadgeType): boolean => {
  return BADGE_CATALOG[badgeType]?.isImplemented ?? false;
};

/**
 * Type guard to check if compliance result is compliant
 */
export const isCompliant = (result: DailyComplianceResult): boolean => {
  return result.isCompliant && result.completedTasks >= (result.threshold.minimumTasks ?? 0);
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Badge category filter type
 */
export type BadgeCategory = 'milestone' | 'streak' | 'task_specific' | 'time_based' | 'special' | 'all';

/**
 * Streak statistics summary
 */
export interface StreakStatistics {
  currentStreak: number;
  longestStreak: number;
  totalCompliantDays: number;
  lastComplianceDate: Date | string | null;
  streakStartDate: Date | string | null;
  daysSinceLastCompliance: number | null;
  isActive: boolean;
}

/**
 * Helper type for atomic streak updates using optimistic concurrency control
 */
export interface AtomicStreakUpdate {
  userId: number;
  expectedCurrentStreak: number;  // For optimistic locking
  newCurrentStreak: number;
  newLongestStreak: number;
  newTotalCompliantDays: number;
  lastComplianceDate: Date | string;
  streakStartDate: Date | string;
}

/**
 * Streak update conflict error
 */
export interface StreakUpdateConflictError {
  code: 'STREAK_UPDATE_CONFLICT';
  message: string;
  expectedStreak: number;
  actualStreak: number;
  userId: number;
}
