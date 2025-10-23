import { db } from '../db/connection';
import { dailyTasks, userSettings, photos } from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { startOfDay, endOfDay, subDays, format, getDay } from 'date-fns';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error';

// Valid task types for type safety
const VALID_TASK_TYPES = ['hydration', 'workout', 'meal', 'supplement', 'cardio', 'weight_log'] as const;
type ValidTaskType = typeof VALID_TASK_TYPES[number];

/**
 * Badge criteria checker service
 * Contains logic for determining if a user meets badge requirements
 */
export class BadgeCriteria {
  /**
   * Get consecutive days where tasks of a specific type were completed
   *
   * @param userId - User ID
   * @param taskType - Type of task to check (e.g., 'hydration', 'workout')
   * @param requiredDays - Number of consecutive days required
   * @returns Current streak count for that task type
   */
  private static async getTaskTypeStreak(
    userId: number,
    taskType: ValidTaskType,
    requiredDays: number
  ): Promise<number> {
    try {
      // Validate task type at runtime
      if (!VALID_TASK_TYPES.includes(taskType)) {
        throw new AppError(400, `Invalid task type: ${taskType}`);
      }

      // Get all completed tasks of this type, ordered by date descending
      const completedTasks = await db
        .select({
          dueDate: dailyTasks.dueDate,
          completedAt: dailyTasks.completedAt,
        })
        .from(dailyTasks)
        .where(
          and(
            eq(dailyTasks.userId, userId),
            eq(dailyTasks.taskType, taskType),
            eq(dailyTasks.status, 'completed')
          )
        )
        .orderBy(desc(dailyTasks.dueDate));

      if (completedTasks.length === 0) {
        return 0;
      }

      // Track consecutive days
      let streak = 0;
      let currentDate = new Date();
      currentDate = startOfDay(currentDate);

      // Check backwards from today to find consecutive days
      for (let i = 0; i < requiredDays; i++) {
        const checkDate = subDays(currentDate, i);
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');

        // Check if any task was completed on this date
        const hasCompletionOnDate = completedTasks.some((task) => {
          const taskDateStr = format(startOfDay(task.dueDate), 'yyyy-MM-dd');
          return taskDateStr === checkDateStr;
        });

        if (hasCompletionOnDate) {
          streak++;
        } else {
          // Streak broken
          break;
        }
      }

      logger.debug(
        { userId, taskType, streak, requiredDays },
        'Task type streak calculated'
      );

      return streak;
    } catch (error) {
      logger.error({ err: error, userId, taskType }, 'Error calculating task type streak');
      return 0;
    }
  }

  /**
   * Check if user completed hydration tasks for 7 consecutive days
   * Badge: Hydration Nation
   */
  static async checkHydrationNation(userId: number): Promise<boolean> {
    const streak = await this.getTaskTypeStreak(userId, 'hydration', 7);
    return streak >= 7;
  }

  /**
   * Check if user met protein target for 14 consecutive days
   * Badge: Protein Pro
   *
   * This checks if meal tasks with protein targets were completed
   */
  static async checkProteinPro(userId: number): Promise<boolean> {
    try {
      const today = startOfDay(new Date());
      const fourteenDaysAgo = subDays(today, 14);
      const targetProtein = 100; // grams

      // Single query to fetch all meal tasks for the last 14 days
      const allMealTasks = await db
        .select({
          dueDate: dailyTasks.dueDate,
          status: dailyTasks.status,
          metadata: dailyTasks.metadata,
        })
        .from(dailyTasks)
        .where(
          and(
            eq(dailyTasks.userId, userId),
            eq(dailyTasks.taskType, 'meal'),
            gte(dailyTasks.dueDate, fourteenDaysAgo),
            lte(dailyTasks.dueDate, today)
          )
        );

      // Group tasks by day and calculate protein
      const dailyProtein: Record<string, number> = {};
      for (const task of allMealTasks) {
        const dateKey = format(startOfDay(task.dueDate), 'yyyy-MM-dd');
        if (!dailyProtein[dateKey]) dailyProtein[dateKey] = 0;

        if (task.status === 'completed' && task.metadata) {
          const metadata = task.metadata as any;
          dailyProtein[dateKey] += metadata.targetProtein || 0;
        }
      }

      // Check for 14 consecutive days meeting the threshold
      let consecutiveDays = 0;
      for (let i = 0; i < 14; i++) {
        const checkDate = subDays(today, i);
        const dateKey = format(checkDate, 'yyyy-MM-dd');

        if (dailyProtein[dateKey] >= targetProtein) {
          consecutiveDays++;
        } else {
          break; // Streak broken
        }
      }

      return consecutiveDays >= 14;
    } catch (error) {
      logger.error({ error, userId }, 'Error checking Protein Pro badge');
      return false;
    }
  }

  /**
   * Check if user completed workouts for 21 consecutive days
   * Badge: Workout Warrior
   */
  static async checkWorkoutWarrior(userId: number): Promise<boolean> {
    const streak = await this.getTaskTypeStreak(userId, 'workout', 21);
    return streak >= 21;
  }

  /**
   * Check if user completed supplement tasks for 30 consecutive days
   * Badge: Supplement Champion
   */
  static async checkSupplementChampion(userId: number): Promise<boolean> {
    const streak = await this.getTaskTypeStreak(userId, 'supplement', 30);
    return streak >= 30;
  }

  /**
   * Check if user completed cardio for 14 consecutive days
   * Badge: Cardio King
   */
  static async checkCardioKing(userId: number): Promise<boolean> {
    const streak = await this.getTaskTypeStreak(userId, 'cardio', 14);
    return streak >= 14;
  }

  /**
   * Check if user completed morning tasks before 9 AM for 7 consecutive days
   * Badge: Early Bird
   *
   * Morning tasks are typically: breakfast, morning supplements, morning workout
   */
  static async checkEarlyBird(userId: number): Promise<boolean> {
    try {
      let consecutiveDays = 0;
      const today = startOfDay(new Date());

      for (let i = 0; i < 7; i++) {
        const checkDate = subDays(today, i);
        const dayStart = startOfDay(checkDate);
        const cutoffTime = new Date(checkDate);
        cutoffTime.setHours(9, 0, 0, 0); // 9:00 AM

        // Get tasks with morning-specific due times (before 9 AM)
        const morningTasks = await db
          .select({
            id: dailyTasks.id,
            completedAt: dailyTasks.completedAt,
            dueTime: dailyTasks.dueTime,
          })
          .from(dailyTasks)
          .where(
            and(
              eq(dailyTasks.userId, userId),
              eq(dailyTasks.status, 'completed'),
              gte(dailyTasks.dueDate, dayStart),
              lte(dailyTasks.dueDate, endOfDay(checkDate))
            )
          );

        // Filter for tasks with morning due times
        const earlyMorningTasks = morningTasks.filter((task) => {
          if (!task.dueTime || !task.completedAt) return false;

          // Check if due time is before 9 AM
          const [hours] = task.dueTime.split(':').map(Number);
          if (hours >= 9) return false;

          // Check if completed before 9 AM
          const completedTime = new Date(task.completedAt);
          return completedTime < cutoffTime;
        });

        if (earlyMorningTasks.length > 0) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      return consecutiveDays >= 7;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Early Bird badge');
      return false;
    }
  }

  /**
   * Check if user completed evening tasks after 8 PM for 7 consecutive days
   * Badge: Night Owl
   *
   * Evening tasks are typically: dinner, evening supplements, evening routine
   */
  static async checkNightOwl(userId: number): Promise<boolean> {
    try {
      let consecutiveDays = 0;
      const today = startOfDay(new Date());

      for (let i = 0; i < 7; i++) {
        const checkDate = subDays(today, i);
        const dayStart = startOfDay(checkDate);
        const cutoffTime = new Date(checkDate);
        cutoffTime.setHours(20, 0, 0, 0); // 8:00 PM

        // Get tasks with evening-specific due times (after 8 PM)
        const eveningTasks = await db
          .select({
            id: dailyTasks.id,
            completedAt: dailyTasks.completedAt,
            dueTime: dailyTasks.dueTime,
          })
          .from(dailyTasks)
          .where(
            and(
              eq(dailyTasks.userId, userId),
              eq(dailyTasks.status, 'completed'),
              gte(dailyTasks.dueDate, dayStart),
              lte(dailyTasks.dueDate, endOfDay(checkDate))
            )
          );

        // Filter for tasks with evening due times
        const lateEveningTasks = eveningTasks.filter((task) => {
          if (!task.dueTime || !task.completedAt) return false;

          // Check if due time is after 8 PM
          const [hours] = task.dueTime.split(':').map(Number);
          if (hours < 20) return false;

          // Check if completed after 8 PM
          const completedTime = new Date(task.completedAt);
          return completedTime >= cutoffTime;
        });

        if (lateEveningTasks.length > 0) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      return consecutiveDays >= 7;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Night Owl badge');
      return false;
    }
  }

  /**
   * Check if user stayed compliant on weekends for 4 consecutive weeks
   * Badge: Weekend Warrior
   *
   * Weekend = Saturday (6) and Sunday (0) in getDay()
   */
  static async checkWeekendWarrior(userId: number): Promise<boolean> {
    try {
      let consecutiveWeekends = 0;
      const today = new Date();

      // Check last 4 weeks (8 weekend days total)
      for (let week = 0; week < 4; week++) {
        // Check Saturday
        const saturday = subDays(today, (week * 7) + (6 - getDay(today)));
        const saturdayCompliant = await this.isDayCompliant(userId, saturday);

        // Check Sunday
        const sunday = subDays(today, (week * 7) + (7 - getDay(today)));
        const sundayCompliant = await this.isDayCompliant(userId, sunday);

        // Both days must be compliant
        if (saturdayCompliant && sundayCompliant) {
          consecutiveWeekends++;
        } else {
          break;
        }
      }

      return consecutiveWeekends >= 4;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Weekend Warrior badge');
      return false;
    }
  }

  /**
   * Check if a specific day was compliant (80%+ completion)
   */
  private static async isDayCompliant(userId: number, date: Date): Promise<boolean> {
    try {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const tasksForDay = await db
        .select({
          id: dailyTasks.id,
          status: dailyTasks.status,
        })
        .from(dailyTasks)
        .where(
          and(
            eq(dailyTasks.userId, userId),
            gte(dailyTasks.dueDate, dayStart),
            lte(dailyTasks.dueDate, dayEnd)
          )
        );

      if (tasksForDay.length === 0) {
        return false;
      }

      const completedTasks = tasksForDay.filter((task) => task.status === 'completed');
      const compliancePercentage = completedTasks.length / tasksForDay.length;

      return compliancePercentage >= 0.8;
    } catch (error) {
      logger.error({ err: error, userId, date }, 'Error checking day compliance');
      return false;
    }
  }

  /**
   * Check if user returned to compliance within 3 days of a missed day
   * Badge: Comeback Kid
   *
   * Looks for pattern: compliant -> missed -> compliant within 3 days
   */
  static async checkComebackKid(userId: number): Promise<boolean> {
    try {
      // Get last 30 days of compliance data
      const today = new Date();
      const daysToCheck = 30;
      const complianceHistory: boolean[] = [];

      for (let i = daysToCheck - 1; i >= 0; i--) {
        const checkDate = subDays(today, i);
        const isCompliant = await this.isDayCompliant(userId, checkDate);
        complianceHistory.push(isCompliant);
      }

      // Look for comeback pattern: compliant -> non-compliant -> compliant within 3 days
      for (let i = 0; i < complianceHistory.length - 4; i++) {
        const wasCompliant = complianceHistory[i];
        const missedDay = !complianceHistory[i + 1];

        if (wasCompliant && missedDay) {
          // Check if they came back within next 3 days
          const returnedWithinThreeDays =
            complianceHistory[i + 2] ||
            complianceHistory[i + 3] ||
            complianceHistory[i + 4];

          if (returnedWithinThreeDays) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Comeback Kid badge');
      return false;
    }
  }

  /**
   * Check if user achieved 25% of their weight/fitness goal
   * Badge: Milestone Master
   */
  static async checkMilestoneMaster(userId: number): Promise<boolean> {
    try {
      const [settings] = await db
        .select({
          currentWeight: userSettings.currentWeight,
          targetWeight: userSettings.targetWeight,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      if (!settings?.currentWeight || !settings?.targetWeight) {
        return false;
      }

      // Get user's starting weight (from their first weight log or initial settings)
      const [firstWeightLog] = await db
        .select({
          dueDate: dailyTasks.dueDate,
          metadata: dailyTasks.metadata,
        })
        .from(dailyTasks)
        .where(
          and(
            eq(dailyTasks.userId, userId),
            eq(dailyTasks.taskType, 'weight_log'),
            eq(dailyTasks.status, 'completed')
          )
        )
        .orderBy(dailyTasks.dueDate)
        .limit(1);

      const startWeight = firstWeightLog?.metadata
        ? (firstWeightLog.metadata as any).previousWeight
        : parseFloat(settings.currentWeight.toString());

      const targetWeight = parseFloat(settings.targetWeight.toString());
      const currentWeight = parseFloat(settings.currentWeight.toString());

      // Calculate progress
      const totalWeightChange = Math.abs(targetWeight - startWeight);
      const currentProgress = Math.abs(currentWeight - startWeight);
      const progressPercentage = (currentProgress / totalWeightChange) * 100;

      return progressPercentage >= 25;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Milestone Master badge');
      return false;
    }
  }

  /**
   * Check if user uploaded progress photos for 4 consecutive weeks
   * Badge: Photo Finisher
   */
  static async checkPhotoFinisher(userId: number): Promise<boolean> {
    try {
      let consecutiveWeeks = 0;
      const today = new Date();

      // Check last 4 weeks
      for (let week = 0; week < 4; week++) {
        const weekStart = subDays(today, (week + 1) * 7);
        const weekEnd = subDays(today, week * 7);

        // Check if user uploaded photos this week
        const photosThisWeek = await db
          .select({ id: photos.id })
          .from(photos)
          .where(
            and(
              eq(photos.userId, userId),
              gte(photos.createdAt, weekStart),
              lte(photos.createdAt, weekEnd)
            )
          )
          .limit(1);

        if (photosThisWeek.length > 0) {
          consecutiveWeeks++;
        } else {
          break;
        }
      }

      return consecutiveWeeks >= 4;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Photo Finisher badge');
      return false;
    }
  }

  /**
   * Check if user achieved perfect month (30 days with 100% compliance on each day)
   * Badge: Perfect Month
   *
   * Note: This differs from the 30-day streak (80% threshold)
   * This requires 100% completion on each of 30 consecutive days
   */
  static async checkPerfectMonth(userId: number): Promise<boolean> {
    try {
      let consecutivePerfectDays = 0;
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const checkDate = subDays(today, i);
        const dayStart = startOfDay(checkDate);
        const dayEnd = endOfDay(checkDate);

        const tasksForDay = await db
          .select({
            id: dailyTasks.id,
            status: dailyTasks.status,
          })
          .from(dailyTasks)
          .where(
            and(
              eq(dailyTasks.userId, userId),
              gte(dailyTasks.dueDate, dayStart),
              lte(dailyTasks.dueDate, dayEnd)
            )
          );

        if (tasksForDay.length === 0) {
          break;
        }

        // Check if ALL tasks were completed (100%)
        const allCompleted = tasksForDay.every((task) => task.status === 'completed');

        if (allCompleted) {
          consecutivePerfectDays++;
        } else {
          break;
        }
      }

      return consecutivePerfectDays >= 30;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error checking Perfect Month badge');
      return false;
    }
  }
}
