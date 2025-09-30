import { db } from './connection';
import { users, plans, dailyTasks, evidence, streaks } from './schema';
import { logger } from '../config/logger';
import { eq, and } from 'drizzle-orm';

/**
 * Seed today's tasks for the 3 existing demo users
 * - Sarah Chen (vegetarian, losing weight, moderate activity)
 * - Marcus Johnson (gaining muscle, very active)
 * - Patricia Rodriguez (maintaining health, light activity)
 */

interface DemoUserEmail {
  email: string;
  name: string;
}

const demoUsers: DemoUserEmail[] = [
  { email: 'sarah.chen@example.com', name: 'Sarah Chen' },
  { email: 'marcus.j@example.com', name: 'Marcus Johnson' },
  { email: 'patricia.r@example.com', name: 'Patricia Rodriguez' },
];

// Helper to get today's date range (start and end of day)
const getTodayRange = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { startOfDay, endOfDay, now };
};

// Helper to get a date N days ago
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
};

const runTodayTasksSeed = async () => {
  try {
    logger.info('🌱 Starting Today tasks seed...');

    const { startOfDay, endOfDay, now } = getTodayRange();
    const todayStr = now.toISOString().split('T')[0];

    // Process each demo user
    for (const demoUser of demoUsers) {
      // Get user from database
      const [user] = await db.select().from(users).where(eq(users.email, demoUser.email)).limit(1);

      if (!user) {
        logger.warn(`⚠️  User not found: ${demoUser.email} - skipping`);
        continue;
      }

      logger.info(`\n👤 Processing ${user.name}...`);

      // Check if plan already exists for today
      const existingPlan = await db
        .select()
        .from(plans)
        .where(and(eq(plans.userId, user.id), eq(plans.startDate, startOfDay)))
        .limit(1);

      let planId: number;

      if (existingPlan.length > 0) {
        planId = existingPlan[0].id;
        logger.info(`  ♻️  Using existing plan: ${existingPlan[0].name}`);
      } else {
        // Create today's plan
        const [newPlan] = await db
          .insert(plans)
          .values({
            userId: user.id,
            name: `Daily Plan - ${todayStr}`,
            description: `Personalized daily health plan for ${user.name}`,
            planType: 'daily',
            startDate: startOfDay,
            endDate: endOfDay,
            status: 'active',
            totalTasks: 0, // Will be updated after creating tasks
            completedTasks: 0,
            completionPercentage: '0',
          })
          .returning();

        planId = newPlan.id;
        logger.info(`  ✨ Created plan: ${newPlan.name}`);
      }

      // Generate tasks based on user profile
      const tasksToCreate = generateTasksForUser(user.name, user.id, planId, startOfDay);

      // Insert tasks
      let completedCount = 0;

      for (const taskData of tasksToCreate) {
        // Check if task already exists
        const existingTask = await db
          .select()
          .from(dailyTasks)
          .where(
            and(
              eq(dailyTasks.userId, user.id),
              eq(dailyTasks.planId, planId),
              eq(dailyTasks.title, taskData.title)
            )
          )
          .limit(1);

        if (existingTask.length > 0) {
          logger.info(`    → Task already exists: ${taskData.title}`);
          if (existingTask[0].status === 'completed') {
            completedCount++;
          }
          continue;
        }

        const [newTask] = await db.insert(dailyTasks).values(taskData).returning();

        logger.info(`    ✓ Created task: ${taskData.title} (${taskData.taskType})`);

        // Create evidence for completed tasks
        if (taskData.status === 'completed' && taskData.evidenceData) {
          await db.insert(evidence).values({
            taskId: newTask.id,
            userId: user.id,
            ...taskData.evidenceData,
          });

          completedCount++;
          logger.info(`      📋 Added evidence for: ${taskData.title}`);
        }
      }

      // Update plan totals
      const totalTasks = tasksToCreate.length;
      const completionPercentage =
        totalTasks > 0 ? ((completedCount / totalTasks) * 100).toFixed(2) : '0';

      await db
        .update(plans)
        .set({
          totalTasks,
          completedTasks: completedCount,
          completionPercentage,
          updatedAt: now,
        })
        .where(eq(plans.id, planId));

      logger.info(
        `  📊 Plan stats: ${completedCount}/${totalTasks} tasks completed (${completionPercentage}%)`
      );

      // Initialize or update streaks
      await initializeStreaksForUser(user.id, user.name);

      logger.info(`  ✅ Completed seed for ${user.name}\n`);
    }

    logger.info('🎉 Today tasks seed completed successfully!\n');
    logger.info('📝 Summary:');
    logger.info('  - Sarah Chen: Weight loss focused, vegetarian meals, moderate workouts');
    logger.info('  - Marcus Johnson: Muscle gain focused, high protein, intense workouts');
    logger.info(
      '  - Patricia Rodriguez: Health maintenance, gentle activities, balanced nutrition'
    );
    logger.info('\n🔍 Test with: GET /v1/tasks/today');

    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, '❌ Today tasks seed failed');
    process.exit(1);
  }
};

// Generate tasks based on user profile
function generateTasksForUser(userName: string, userId: number, planId: number, dueDate: Date) {
  // Sarah Chen - Vegetarian, losing weight, moderate activity
  if (userName === 'Sarah Chen') {
    return [
      {
        userId,
        planId,
        title: 'Morning Workout - Cardio & Core',
        description: '30 min cardio + core strengthening exercises',
        taskType: 'workout' as const,
        dueDate,
        dueTime: '07:00:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 35 * 60 * 1000), // 7:35 AM
        metadata: {
          duration: 30,
          exerciseName: 'Cardio & Core Circuit',
        },
        priority: 3,
        order: 1,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            actualDuration: 32,
            caloriesBurned: 280,
            avgHeartRate: 145,
          },
          notes: 'Great workout! Feeling energized.',
          recordedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 35 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Breakfast - High Protein Smoothie Bowl',
        description: 'Greek yogurt, berries, granola, and chia seeds',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '08:00:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000),
        metadata: {
          mealType: 'breakfast' as const,
          targetCalories: 350,
          targetProtein: 25,
        },
        priority: 3,
        order: 2,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            actualCalories: 340,
            actualProtein: 27,
            actualCarbs: 42,
            actualFat: 8,
          },
          notes: 'Delicious and filling!',
          recordedAt: new Date(dueDate.getTime() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Morning Hydration - 500ml Water',
        description: 'Start your day hydrated',
        taskType: 'hydration' as const,
        dueDate,
        dueTime: '09:00:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 9 * 60 * 60 * 1000),
        metadata: {
          targetAmount: 500,
        },
        priority: 2,
        order: 3,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            amount: 500,
          },
          recordedAt: new Date(dueDate.getTime() + 9 * 60 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Multivitamin',
        description: 'Take daily multivitamin with breakfast',
        taskType: 'supplement' as const,
        dueDate,
        dueTime: '08:30:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 8 * 60 * 60 * 1000 + 30 * 60 * 1000),
        metadata: {
          supplementName: 'Multivitamin',
          dosage: '1 tablet',
        },
        priority: 2,
        order: 4,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            taken: true,
            timeTaken: new Date(
              dueDate.getTime() + 8 * 60 * 60 * 1000 + 30 * 60 * 1000
            ).toISOString(),
          },
          recordedAt: new Date(dueDate.getTime() + 8 * 60 * 60 * 1000 + 30 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Lunch - Quinoa Buddha Bowl',
        description: 'Quinoa, roasted vegetables, chickpeas, tahini dressing',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '12:30:00',
        status: 'pending' as const,
        metadata: {
          mealType: 'lunch' as const,
          targetCalories: 450,
          targetProtein: 20,
        },
        priority: 3,
        order: 5,
      },
      {
        userId,
        planId,
        title: 'Afternoon Hydration - 750ml Water',
        description: 'Keep hydration levels up throughout the day',
        taskType: 'hydration' as const,
        dueDate,
        dueTime: '15:00:00',
        status: 'pending' as const,
        metadata: {
          targetAmount: 750,
        },
        priority: 2,
        order: 6,
      },
      {
        userId,
        planId,
        title: 'Dinner - Tofu Stir-Fry',
        description: 'Tofu, mixed vegetables, brown rice',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '18:30:00',
        status: 'pending' as const,
        metadata: {
          mealType: 'dinner' as const,
          targetCalories: 500,
          targetProtein: 28,
        },
        priority: 3,
        order: 7,
      },
      {
        userId,
        planId,
        title: 'Evening Walk',
        description: '20 minute relaxing walk',
        taskType: 'cardio' as const,
        dueDate,
        dueTime: '19:30:00',
        status: 'pending' as const,
        metadata: {
          activityType: 'Walking',
          targetDuration: 20,
          targetDistance: 1.5,
        },
        priority: 1,
        order: 8,
      },
    ];
  }

  // Marcus Johnson - Gaining muscle, very active
  if (userName === 'Marcus Johnson') {
    return [
      {
        userId,
        planId,
        title: 'Pre-Workout - Protein Shake',
        description: 'Whey protein, banana, oats',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '05:30:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000),
        metadata: {
          mealType: 'snack' as const,
          targetCalories: 300,
          targetProtein: 30,
        },
        priority: 3,
        order: 1,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            actualCalories: 310,
            actualProtein: 32,
            actualCarbs: 35,
            actualFat: 5,
          },
          recordedAt: new Date(dueDate.getTime() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Strength Training - Upper Body',
        description: 'Bench press, rows, shoulders, arms - 60 min session',
        taskType: 'workout' as const,
        dueDate,
        dueTime: '06:00:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 10 * 60 * 1000),
        metadata: {
          exerciseName: 'Upper Body Strength',
          duration: 60,
          sets: 20,
          reps: 10,
        },
        priority: 3,
        order: 2,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            actualDuration: 65,
            actualSets: 22,
            actualReps: 10,
            caloriesBurned: 420,
          },
          notes: 'Increased weight on bench press! New PR: 100kg x 5 reps',
          recordedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 10 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Post-Workout - Whey Protein',
        description: 'Post-workout protein shake - 30g protein',
        taskType: 'supplement' as const,
        dueDate,
        dueTime: '07:15:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 15 * 60 * 1000),
        metadata: {
          supplementName: 'Whey Protein',
          dosage: '1 scoop (30g)',
        },
        priority: 3,
        order: 3,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            taken: true,
            timeTaken: new Date(
              dueDate.getTime() + 7 * 60 * 60 * 1000 + 15 * 60 * 1000
            ).toISOString(),
          },
          recordedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 15 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Breakfast - High Protein Meal',
        description: '4 eggs, turkey bacon, whole wheat toast, avocado',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '08:00:00',
        status: 'pending' as const,
        metadata: {
          mealType: 'breakfast' as const,
          targetCalories: 650,
          targetProtein: 45,
        },
        priority: 3,
        order: 4,
      },
      {
        userId,
        planId,
        title: 'Creatine Monohydrate',
        description: '5g creatine monohydrate',
        taskType: 'supplement' as const,
        dueDate,
        dueTime: '08:30:00',
        status: 'pending' as const,
        metadata: {
          supplementName: 'Creatine Monohydrate',
          dosage: '5g',
        },
        priority: 2,
        order: 5,
      },
      {
        userId,
        planId,
        title: 'Morning Hydration - 1L Water',
        description: 'Drink 1 liter of water',
        taskType: 'hydration' as const,
        dueDate,
        dueTime: '10:00:00',
        status: 'pending' as const,
        metadata: {
          targetAmount: 1000,
        },
        priority: 2,
        order: 6,
      },
      {
        userId,
        planId,
        title: 'Daily Weigh-In',
        description: 'Track morning weight for progress monitoring',
        taskType: 'weight_log' as const,
        dueDate,
        dueTime: '06:00:00',
        status: 'pending' as const,
        metadata: {
          previousWeight: 80.5,
        },
        priority: 1,
        order: 7,
      },
    ];
  }

  // Patricia Rodriguez - Maintaining health, light activity
  if (userName === 'Patricia Rodriguez') {
    return [
      {
        userId,
        planId,
        title: 'Morning Medications',
        description: 'Take prescribed morning medications',
        taskType: 'supplement' as const,
        dueDate,
        dueTime: '07:00:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000),
        metadata: {
          supplementName: 'Morning Medications',
          dosage: 'As prescribed',
        },
        priority: 3,
        order: 1,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            taken: true,
            timeTaken: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000).toISOString(),
          },
          recordedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Breakfast - Oatmeal & Berries',
        description: 'Steel-cut oats, mixed berries, walnuts, honey',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '07:30:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 30 * 60 * 1000),
        metadata: {
          mealType: 'breakfast' as const,
          targetCalories: 350,
          targetProtein: 12,
        },
        priority: 3,
        order: 2,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            actualCalories: 360,
            actualProtein: 13,
            actualCarbs: 52,
            actualFat: 12,
          },
          notes: 'Added extra berries - delicious!',
          recordedAt: new Date(dueDate.getTime() + 7 * 60 * 60 * 1000 + 30 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Morning Walk - 20 minutes',
        description: 'Gentle walk around the neighborhood',
        taskType: 'cardio' as const,
        dueDate,
        dueTime: '08:30:00',
        status: 'completed' as const,
        completedAt: new Date(dueDate.getTime() + 8 * 60 * 60 * 1000 + 55 * 60 * 1000),
        metadata: {
          activityType: 'Walking',
          targetDuration: 20,
          targetDistance: 1.2,
        },
        priority: 3,
        order: 3,
        evidenceData: {
          evidenceType: 'metrics' as const,
          metrics: {
            duration: 25,
            distance: 1.5,
            caloriesBurned: 95,
            avgHeartRate: 105,
          },
          notes: 'Beautiful morning, walked a bit longer than planned',
          recordedAt: new Date(dueDate.getTime() + 8 * 60 * 60 * 1000 + 55 * 60 * 1000),
        },
      },
      {
        userId,
        planId,
        title: 'Morning Hydration - 500ml Water',
        description: 'Drink a glass of water',
        taskType: 'hydration' as const,
        dueDate,
        dueTime: '09:00:00',
        status: 'pending' as const,
        metadata: {
          targetAmount: 500,
        },
        priority: 2,
        order: 4,
      },
      {
        userId,
        planId,
        title: 'Vitamin D & Calcium',
        description: 'Take vitamin D and calcium supplements',
        taskType: 'supplement' as const,
        dueDate,
        dueTime: '09:00:00',
        status: 'pending' as const,
        metadata: {
          supplementName: 'Vitamin D & Calcium',
          dosage: 'Vitamin D 2000 IU, Calcium 600mg',
        },
        priority: 2,
        order: 5,
      },
      {
        userId,
        planId,
        title: 'Lunch - Grilled Chicken Salad',
        description: 'Mixed greens, grilled chicken, vegetables, olive oil dressing (gluten-free)',
        taskType: 'meal' as const,
        dueDate,
        dueTime: '12:00:00',
        status: 'pending' as const,
        metadata: {
          mealType: 'lunch' as const,
          targetCalories: 450,
          targetProtein: 30,
        },
        priority: 3,
        order: 6,
      },
      {
        userId,
        planId,
        title: 'Weekly Weigh-In',
        description: 'Track weight for health monitoring',
        taskType: 'weight_log' as const,
        dueDate,
        dueTime: '07:15:00',
        status: 'pending' as const,
        metadata: {
          previousWeight: 68.2,
        },
        priority: 1,
        order: 7,
      },
    ];
  }

  return [];
}

// Initialize streaks for a user
async function initializeStreaksForUser(userId: number, userName: string) {
  const streakTypes = [
    'workout',
    'supplement',
    'meal',
    'hydration',
    'cardio',
    'weight_log',
    'progress_photo',
    'overall',
  ] as const;

  for (const streakType of streakTypes) {
    // Check if streak already exists
    const existingStreak = await db
      .select()
      .from(streaks)
      .where(and(eq(streaks.userId, userId), eq(streaks.streakType, streakType)))
      .limit(1);

    if (existingStreak.length > 0) {
      continue;
    }

    // Create initial streak with some mock data based on user
    let currentStreak = 0;
    let longestStreak = 0;
    let totalCompletions = 0;
    let lastCompletedDate = null;
    let streakStartDate = null;

    // Give users different streak histories
    if (userName === 'Sarah Chen') {
      // Sarah has been consistent for a week
      if (['workout', 'meal', 'hydration', 'overall'].includes(streakType)) {
        currentStreak = 7;
        longestStreak = 10;
        totalCompletions = 45;
        lastCompletedDate = getDaysAgo(0);
        streakStartDate = getDaysAgo(7);
      } else {
        currentStreak = 3;
        longestStreak = 5;
        totalCompletions = 15;
        lastCompletedDate = getDaysAgo(0);
        streakStartDate = getDaysAgo(3);
      }
    } else if (userName === 'Marcus Johnson') {
      // Marcus has been very consistent
      if (['workout', 'supplement', 'meal', 'overall'].includes(streakType)) {
        currentStreak = 14;
        longestStreak = 21;
        totalCompletions = 120;
        lastCompletedDate = getDaysAgo(0);
        streakStartDate = getDaysAgo(14);
      } else {
        currentStreak = 7;
        longestStreak = 12;
        totalCompletions = 50;
        lastCompletedDate = getDaysAgo(0);
        streakStartDate = getDaysAgo(7);
      }
    } else if (userName === 'Patricia Rodriguez') {
      // Patricia is building habits
      if (['meal', 'hydration', 'supplement', 'overall'].includes(streakType)) {
        currentStreak = 5;
        longestStreak = 8;
        totalCompletions = 30;
        lastCompletedDate = getDaysAgo(0);
        streakStartDate = getDaysAgo(5);
      } else {
        currentStreak = 2;
        longestStreak = 4;
        totalCompletions = 12;
        lastCompletedDate = getDaysAgo(0);
        streakStartDate = getDaysAgo(2);
      }
    }

    await db.insert(streaks).values({
      userId,
      streakType,
      currentStreak,
      longestStreak,
      totalCompletions,
      lastCompletedDate,
      streakStartDate,
    });

    logger.info(`    🔥 Initialized ${streakType} streak: ${currentStreak} days`);
  }
}

void runTodayTasksSeed();
