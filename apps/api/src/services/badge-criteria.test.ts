import { BadgeCriteria } from './badge-criteria';
import { db } from '../db/connection';
import { users, userSettings, dailyTasks, photos } from '../db/schema';
import { eq } from 'drizzle-orm';
import { subDays, startOfDay, endOfDay, setHours } from 'date-fns';

describe('BadgeCriteria', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'badge-test@example.com',
        name: 'Badge Test User',
        timezone: 'America/Los_Angeles',
      })
      .returning();
    testUserId = user.id;

    // Create user settings
    await db.insert(userSettings).values({
      userId: testUserId,
      proteinTarget: 150, // 150g/day
      currentWeight: 80,
      targetWeight: 75,
      onboardingCompleted: true,
    });
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(dailyTasks).where(eq(dailyTasks.userId, testUserId));
    await db.delete(photos).where(eq(photos.userId, testUserId));
  });

  afterAll(async () => {
    // Clean up test user
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('getTaskTypeStreak', () => {
    it('should return 0 when no tasks of type exist', async () => {
      const streak = await BadgeCriteria.getTaskTypeStreak(testUserId, 'hydration', 7);
      expect(streak).toBe(0);
    });

    it('should calculate consecutive days for a specific task type', async () => {
      // Create hydration tasks for last 5 days
      for (let i = 0; i < 5; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Hydration day ${i}`,
          taskType: 'hydration',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const streak = await BadgeCriteria.getTaskTypeStreak(testUserId, 'hydration', 7);
      expect(streak).toBe(5);
    });

    it('should stop counting at first gap', async () => {
      const today = new Date();

      // Day 0 (today) - completed
      await db.insert(dailyTasks).values({
        userId: testUserId,
        title: 'Hydration today',
        taskType: 'hydration',
        dueDate: startOfDay(today),
        status: 'completed',
        completedAt: today,
      });

      // Day 1 - completed
      await db.insert(dailyTasks).values({
        userId: testUserId,
        title: 'Hydration yesterday',
        taskType: 'hydration',
        dueDate: startOfDay(subDays(today, 1)),
        status: 'completed',
        completedAt: subDays(today, 1),
      });

      // Day 2 - MISSING (gap)

      // Day 3 - completed (should not count)
      await db.insert(dailyTasks).values({
        userId: testUserId,
        title: 'Hydration 3 days ago',
        taskType: 'hydration',
        dueDate: startOfDay(subDays(today, 3)),
        status: 'completed',
        completedAt: subDays(today, 3),
      });

      const streak = await BadgeCriteria.getTaskTypeStreak(testUserId, 'hydration', 7);
      expect(streak).toBe(2); // Only today and yesterday
    });
  });

  describe('checkHydrationNation', () => {
    it('should return false with no hydration tasks', async () => {
      const result = await BadgeCriteria.checkHydrationNation(testUserId);
      expect(result).toBe(false);
    });

    it('should return false with less than 7 consecutive days', async () => {
      // Create 5 consecutive days
      for (let i = 0; i < 5; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Hydration ${i}`,
          taskType: 'hydration',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const result = await BadgeCriteria.checkHydrationNation(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 7 consecutive days of hydration', async () => {
      // Create 7 consecutive days
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Hydration ${i}`,
          taskType: 'hydration',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const result = await BadgeCriteria.checkHydrationNation(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkProteinPro', () => {
    it('should return false with no meal tasks', async () => {
      const result = await BadgeCriteria.checkProteinPro(testUserId);
      expect(result).toBe(false);
    });

    it('should return false if protein target is not met', async () => {
      // Create 14 days of meals but protein below target
      for (let i = 0; i < 14; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Meal ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
          metadata: {
            targetProtein: 100, // Below target of 150g
          },
        });
      }

      const result = await BadgeCriteria.checkProteinPro(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 14 consecutive days meeting protein target', async () => {
      // Create 14 days of meals meeting protein target
      for (let i = 0; i < 14; i++) {
        const date = subDays(new Date(), i);

        // Create multiple meals per day to hit protein target
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Breakfast ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
          metadata: {
            targetProtein: 50,
          },
        });

        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Lunch ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
          metadata: {
            targetProtein: 60,
          },
        });

        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Dinner ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
          metadata: {
            targetProtein: 40,
          },
        });
      }

      const result = await BadgeCriteria.checkProteinPro(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkWorkoutWarrior', () => {
    it('should return false with less than 21 consecutive days', async () => {
      // Create 15 consecutive days
      for (let i = 0; i < 15; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Workout ${i}`,
          taskType: 'workout',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const result = await BadgeCriteria.checkWorkoutWarrior(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 21 consecutive days of workouts', async () => {
      // Create 21 consecutive days
      for (let i = 0; i < 21; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Workout ${i}`,
          taskType: 'workout',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const result = await BadgeCriteria.checkWorkoutWarrior(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkSupplementChampion', () => {
    it('should return true with 30 consecutive days of supplements', async () => {
      // Create 30 consecutive days
      for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Supplement ${i}`,
          taskType: 'supplement',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const result = await BadgeCriteria.checkSupplementChampion(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkCardioKing', () => {
    it('should return true with 14 consecutive days of cardio', async () => {
      // Create 14 consecutive days
      for (let i = 0; i < 14; i++) {
        const date = subDays(new Date(), i);
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Cardio ${i}`,
          taskType: 'cardio',
          dueDate: startOfDay(date),
          status: 'completed',
          completedAt: date,
        });
      }

      const result = await BadgeCriteria.checkCardioKing(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkEarlyBird', () => {
    it('should return false with no early morning tasks', async () => {
      const result = await BadgeCriteria.checkEarlyBird(testUserId);
      expect(result).toBe(false);
    });

    it('should return false if tasks completed after 9 AM', async () => {
      // Create 7 days of morning tasks but completed after 9 AM
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i);
        const completedAt = setHours(date, 10); // 10 AM

        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Morning task ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          dueTime: '08:00:00',
          status: 'completed',
          completedAt,
        });
      }

      const result = await BadgeCriteria.checkEarlyBird(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 7 consecutive days of tasks before 9 AM', async () => {
      // Create 7 days of early morning tasks
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i);
        const completedAt = setHours(date, 8); // 8 AM

        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Morning task ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          dueTime: '08:00:00',
          status: 'completed',
          completedAt,
        });
      }

      const result = await BadgeCriteria.checkEarlyBird(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkNightOwl', () => {
    it('should return false with no evening tasks', async () => {
      const result = await BadgeCriteria.checkNightOwl(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 7 consecutive days of tasks after 8 PM', async () => {
      // Create 7 days of evening tasks
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i);
        const completedAt = setHours(date, 21); // 9 PM

        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Evening task ${i}`,
          taskType: 'meal',
          dueDate: startOfDay(date),
          dueTime: '21:00:00',
          status: 'completed',
          completedAt,
        });
      }

      const result = await BadgeCriteria.checkNightOwl(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkComebackKid', () => {
    it('should return false with no compliance history', async () => {
      const result = await BadgeCriteria.checkComebackKid(testUserId);
      expect(result).toBe(false);
    });

    it('should return true if user returned to compliance within 3 days', async () => {
      const today = new Date();

      // Create pattern: compliant -> non-compliant -> compliant
      // Day -10: compliant (80%)
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i}`,
          taskType: 'workout',
          dueDate: startOfDay(subDays(today, 10)),
          status: i < 4 ? 'completed' : 'pending',
          completedAt: i < 4 ? subDays(today, 10) : null,
        });
      }

      // Day -9: non-compliant (40%)
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i}`,
          taskType: 'workout',
          dueDate: startOfDay(subDays(today, 9)),
          status: i < 2 ? 'completed' : 'pending',
          completedAt: i < 2 ? subDays(today, 9) : null,
        });
      }

      // Day -8: compliant again (100%)
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i}`,
          taskType: 'workout',
          dueDate: startOfDay(subDays(today, 8)),
          status: 'completed',
          completedAt: subDays(today, 8),
        });
      }

      const result = await BadgeCriteria.checkComebackKid(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkMilestoneMaster', () => {
    it('should return false with no weight progress', async () => {
      const result = await BadgeCriteria.checkMilestoneMaster(testUserId);
      expect(result).toBe(false);
    });

    it('should return true when 25% of weight goal is achieved', async () => {
      // User settings: currentWeight: 80, targetWeight: 75
      // Total change needed: 5kg
      // 25% = 1.25kg
      // So current weight should be 78.75 or less

      // Update current weight to show progress
      await db
        .update(userSettings)
        .set({ currentWeight: 78.5 }) // Lost 1.5kg (30% of goal)
        .where(eq(userSettings.userId, testUserId));

      const result = await BadgeCriteria.checkMilestoneMaster(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkPhotoFinisher', () => {
    it('should return false with no photos', async () => {
      const result = await BadgeCriteria.checkPhotoFinisher(testUserId);
      expect(result).toBe(false);
    });

    it('should return false with less than 4 consecutive weeks', async () => {
      const today = new Date();

      // Upload photos for 2 weeks only
      for (let week = 0; week < 2; week++) {
        const photoDate = subDays(today, week * 7);
        await db.insert(photos).values({
          userId: testUserId,
          fileKey: `test-photo-${week}.jpg`,
          fileSize: 1024,
          mimeType: 'image/jpeg',
          createdAt: photoDate,
          uploadedAt: photoDate,
        });
      }

      const result = await BadgeCriteria.checkPhotoFinisher(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 4 consecutive weeks of photos', async () => {
      const today = new Date();

      // Upload photos for 4 consecutive weeks
      for (let week = 0; week < 4; week++) {
        const photoDate = subDays(today, week * 7 + 1);
        await db.insert(photos).values({
          userId: testUserId,
          fileKey: `test-photo-${week}.jpg`,
          fileSize: 1024,
          mimeType: 'image/jpeg',
          createdAt: photoDate,
          uploadedAt: photoDate,
        });
      }

      const result = await BadgeCriteria.checkPhotoFinisher(testUserId);
      expect(result).toBe(true);
    });
  });

  describe('checkPerfectMonth', () => {
    it('should return false with less than 30 perfect days', async () => {
      // Create 15 perfect days
      for (let i = 0; i < 15; i++) {
        const date = subDays(new Date(), i);
        for (let j = 0; j < 5; j++) {
          await db.insert(dailyTasks).values({
            userId: testUserId,
            title: `Task ${j}`,
            taskType: 'workout',
            dueDate: startOfDay(date),
            status: 'completed',
            completedAt: date,
          });
        }
      }

      const result = await BadgeCriteria.checkPerfectMonth(testUserId);
      expect(result).toBe(false);
    });

    it('should return false if any day has incomplete tasks', async () => {
      // Create 30 days, but day 15 is not perfect
      for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        for (let j = 0; j < 5; j++) {
          await db.insert(dailyTasks).values({
            userId: testUserId,
            title: `Task ${j}`,
            taskType: 'workout',
            dueDate: startOfDay(date),
            status: i === 15 && j === 4 ? 'pending' : 'completed', // Day 15 not perfect
            completedAt: i === 15 && j === 4 ? null : date,
          });
        }
      }

      const result = await BadgeCriteria.checkPerfectMonth(testUserId);
      expect(result).toBe(false);
    });

    it('should return true with 30 consecutive perfect days (100% completion)', async () => {
      // Create 30 perfect days (all tasks completed)
      for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        for (let j = 0; j < 5; j++) {
          await db.insert(dailyTasks).values({
            userId: testUserId,
            title: `Task ${j}`,
            taskType: 'workout',
            dueDate: startOfDay(date),
            status: 'completed',
            completedAt: date,
          });
        }
      }

      const result = await BadgeCriteria.checkPerfectMonth(testUserId);
      expect(result).toBe(true);
    });
  });
});
