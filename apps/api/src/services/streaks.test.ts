import { StreaksService, COMPLIANCE_THRESHOLD, BADGE_DEFINITIONS } from './streaks';
import { db } from '../db/connection';
import { dailyComplianceStreaks, userBadges, dailyTasks, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/error';
import { subDays, startOfDay, endOfDay } from 'date-fns';

describe('StreaksService', () => {
  let streaksService: StreaksService;
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'streak-test@example.com',
        name: 'Streak Test User',
      })
      .returning();
    testUserId = user.id;
  });

  beforeEach(async () => {
    streaksService = new StreaksService();

    // Clean up test data before each test
    await db.delete(dailyComplianceStreaks).where(eq(dailyComplianceStreaks.userId, testUserId));
    await db.delete(userBadges).where(eq(userBadges.userId, testUserId));
    await db.delete(dailyTasks).where(eq(dailyTasks.userId, testUserId));
  });

  afterAll(async () => {
    // Clean up test user
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('calculateDailyCompliance', () => {
    it('should return false when no tasks exist for the day', async () => {
      const isCompliant = await streaksService.calculateDailyCompliance(testUserId);

      expect(isCompliant).toBe(false);
    });

    it('should return true when >= 80% of tasks are completed', async () => {
      const today = new Date();
      const dayStart = startOfDay(today);

      // Create 5 tasks, complete 4 (80%)
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i + 1}`,
          taskType: 'workout',
          dueDate: dayStart,
          status: i < 4 ? 'completed' : 'pending',
          completedAt: i < 4 ? new Date() : null,
        });
      }

      const isCompliant = await streaksService.calculateDailyCompliance(testUserId);

      expect(isCompliant).toBe(true);
    });

    it('should return false when < 80% of tasks are completed', async () => {
      const today = new Date();
      const dayStart = startOfDay(today);

      // Create 5 tasks, complete 3 (60%)
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i + 1}`,
          taskType: 'workout',
          dueDate: dayStart,
          status: i < 3 ? 'completed' : 'pending',
          completedAt: i < 3 ? new Date() : null,
        });
      }

      const isCompliant = await streaksService.calculateDailyCompliance(testUserId);

      expect(isCompliant).toBe(false);
    });

    it('should return true for exactly 80% compliance', async () => {
      const today = new Date();
      const dayStart = startOfDay(today);

      // Create 10 tasks, complete exactly 8 (80%)
      for (let i = 0; i < 10; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i + 1}`,
          taskType: 'workout',
          dueDate: dayStart,
          status: i < 8 ? 'completed' : 'pending',
          completedAt: i < 8 ? new Date() : null,
        });
      }

      const isCompliant = await streaksService.calculateDailyCompliance(testUserId);

      expect(isCompliant).toBe(true);
    });

    it('should handle custom date parameter', async () => {
      const yesterday = subDays(new Date(), 1);
      const dayStart = startOfDay(yesterday);

      // Create tasks for yesterday
      await db.insert(dailyTasks).values({
        userId: testUserId,
        title: 'Yesterday Task',
        taskType: 'workout',
        dueDate: dayStart,
        status: 'completed',
        completedAt: yesterday,
      });

      const isCompliant = await streaksService.calculateDailyCompliance(testUserId, yesterday);

      expect(isCompliant).toBe(true);
    });
  });

  describe('incrementStreak', () => {
    it('should create new streak record for first-time user', async () => {
      const result = await streaksService.incrementStreak(testUserId);

      expect(result.userId).toBe(testUserId);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.totalCompliantDays).toBe(1);
      expect(result.lastComplianceDate).toBeTruthy();
      expect(result.streakStartDate).toBeTruthy();
    });

    it('should increment existing streak (atomic operation)', async () => {
      const yesterday = subDays(new Date(), 1);

      // Create existing streak from yesterday
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 5,
        longestStreak: 5,
        totalCompliantDays: 5,
        lastComplianceDate: yesterday,
        streakStartDate: subDays(yesterday, 4),
      });

      const result = await streaksService.incrementStreak(testUserId);

      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(6);
      expect(result.totalCompliantDays).toBe(6);
    });

    it('should not double-increment if called twice in same day', async () => {
      const result1 = await streaksService.incrementStreak(testUserId);
      const result2 = await streaksService.incrementStreak(testUserId);

      expect(result1.currentStreak).toBe(1);
      expect(result2.currentStreak).toBe(1);
      expect(result1.totalCompliantDays).toBe(1);
      expect(result2.totalCompliantDays).toBe(1);
    });

    it('should reset streak if a day was missed', async () => {
      const twoDaysAgo = subDays(new Date(), 2);

      // Create existing streak from 2 days ago (gap of 1 day)
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 10,
        longestStreak: 10,
        totalCompliantDays: 10,
        lastComplianceDate: twoDaysAgo,
        streakStartDate: subDays(twoDaysAgo, 9),
      });

      const result = await streaksService.incrementStreak(testUserId);

      // Streak should reset to 1
      expect(result.currentStreak).toBe(1);
      // But longest streak should remain
      expect(result.longestStreak).toBe(10);
      // Total days should increment
      expect(result.totalCompliantDays).toBe(11);
    });

    it('should update longestStreak when currentStreak exceeds it', async () => {
      const yesterday = subDays(new Date(), 1);

      // Create existing streak with longest < current (after increment)
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 7,
        longestStreak: 7,
        totalCompliantDays: 10,
        lastComplianceDate: yesterday,
        streakStartDate: subDays(yesterday, 6),
      });

      const result = await streaksService.incrementStreak(testUserId);

      expect(result.currentStreak).toBe(8);
      expect(result.longestStreak).toBe(8);
    });

    it('should maintain database consistency under concurrent updates', async () => {
      // Test atomic operation by calling increment concurrently
      // Only one should succeed in creating/updating
      const promises = [
        streaksService.incrementStreak(testUserId),
        streaksService.incrementStreak(testUserId),
        streaksService.incrementStreak(testUserId),
      ];

      const results = await Promise.all(promises);

      // All should return same streak value (1)
      expect(results.every((r) => r.currentStreak === 1)).toBe(true);
      expect(results.every((r) => r.totalCompliantDays === 1)).toBe(true);

      // Verify database has only one record
      const [streakRecord] = await db
        .select()
        .from(dailyComplianceStreaks)
        .where(eq(dailyComplianceStreaks.userId, testUserId));

      expect(streakRecord.currentStreak).toBe(1);
      expect(streakRecord.totalCompliantDays).toBe(1);
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should award "Day One, Done" badge for 1-day streak', async () => {
      // Create 1-day streak
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 1,
        longestStreak: 1,
        totalCompliantDays: 1,
        lastComplianceDate: new Date(),
        streakStartDate: new Date(),
      });

      const badges = await streaksService.checkAndAwardBadges(testUserId);

      expect(badges.length).toBe(1);
      expect(badges[0].badgeType).toBe('day_one_done');
    });

    it('should award "Week Warrior" badge for 7-day streak', async () => {
      // Create 7-day streak
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 7,
        longestStreak: 7,
        totalCompliantDays: 7,
        lastComplianceDate: new Date(),
        streakStartDate: subDays(new Date(), 6),
      });

      const badges = await streaksService.checkAndAwardBadges(testUserId);

      // Should award both "day_one_done" and "week_warrior"
      expect(badges.length).toBe(2);
      expect(badges.map((b) => b.badgeType)).toContain('day_one_done');
      expect(badges.map((b) => b.badgeType)).toContain('week_warrior');
    });

    it('should award "Perfect Month" badge for 30-day streak', async () => {
      // Create 30-day streak
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 30,
        longestStreak: 30,
        totalCompliantDays: 30,
        lastComplianceDate: new Date(),
        streakStartDate: subDays(new Date(), 29),
      });

      const badges = await streaksService.checkAndAwardBadges(testUserId);

      // Should award day_one_done, week_warrior, and perfect_month
      expect(badges.length).toBe(3);
      expect(badges.map((b) => b.badgeType)).toContain('day_one_done');
      expect(badges.map((b) => b.badgeType)).toContain('week_warrior');
      expect(badges.map((b) => b.badgeType)).toContain('perfect_month');
    });

    it('should award "Hundred Club" badge for 100-day streak', async () => {
      // Create 100-day streak
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 100,
        longestStreak: 100,
        totalCompliantDays: 100,
        lastComplianceDate: new Date(),
        streakStartDate: subDays(new Date(), 99),
      });

      const badges = await streaksService.checkAndAwardBadges(testUserId);

      // Should award all milestone badges
      expect(badges.length).toBe(5); // day_one_done, week_warrior, perfect_month, hundred_club, consistency_king
      expect(badges.map((b) => b.badgeType)).toContain('hundred_club');
      expect(badges.map((b) => b.badgeType)).toContain('consistency_king');
    });

    it('should be idempotent (no duplicate badges)', async () => {
      // Create 7-day streak
      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 7,
        longestStreak: 7,
        totalCompliantDays: 7,
        lastComplianceDate: new Date(),
        streakStartDate: subDays(new Date(), 6),
      });

      // Award badges first time
      const badges1 = await streaksService.checkAndAwardBadges(testUserId);
      expect(badges1.length).toBe(2);

      // Award badges second time
      const badges2 = await streaksService.checkAndAwardBadges(testUserId);
      expect(badges2.length).toBe(0); // No new badges awarded

      // Verify database has exactly 2 badges
      const allBadges = await db
        .select()
        .from(userBadges)
        .where(eq(userBadges.userId, testUserId));

      expect(allBadges.length).toBe(2);
    });

    it('should return empty array when no streak record exists', async () => {
      const badges = await streaksService.checkAndAwardBadges(testUserId);

      expect(badges).toEqual([]);
    });
  });

  describe('getUserStreaks', () => {
    it('should return zeros for user without streak record', async () => {
      const result = await streaksService.getUserStreaks(testUserId);

      expect(result.userId).toBe(testUserId);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalCompliantDays).toBe(0);
      expect(result.lastComplianceDate).toBeNull();
      expect(result.streakStartDate).toBeNull();
    });

    it('should return correct streak data', async () => {
      const lastCompliance = new Date();
      const streakStart = subDays(lastCompliance, 6);

      await db.insert(dailyComplianceStreaks).values({
        userId: testUserId,
        currentStreak: 7,
        longestStreak: 10,
        totalCompliantDays: 15,
        lastComplianceDate: lastCompliance,
        streakStartDate: streakStart,
      });

      const result = await streaksService.getUserStreaks(testUserId);

      expect(result.userId).toBe(testUserId);
      expect(result.currentStreak).toBe(7);
      expect(result.longestStreak).toBe(10);
      expect(result.totalCompliantDays).toBe(15);
      expect(result.lastComplianceDate).toBeTruthy();
      expect(result.streakStartDate).toBeTruthy();
    });
  });

  describe('getUserBadges', () => {
    it('should return empty array for user without badges', async () => {
      const result = await streaksService.getUserBadges(testUserId);

      expect(result).toEqual([]);
    });

    it('should return all user badges ordered by award date (desc)', async () => {
      // Award badges at different times
      await db.insert(userBadges).values({
        userId: testUserId,
        badgeType: 'day_one_done',
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.insert(userBadges).values({
        userId: testUserId,
        badgeType: 'week_warrior',
      });

      const result = await streaksService.getUserBadges(testUserId);

      expect(result.length).toBe(2);
      // Most recent badge should be first
      expect(result[0].badgeType).toBe('week_warrior');
      expect(result[1].badgeType).toBe('day_one_done');
    });

    it('should return only badges for the specified user', async () => {
      // Create another test user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: 'other-test@example.com',
          name: 'Other Test User',
        })
        .returning();

      // Award badge to other user
      await db.insert(userBadges).values({
        userId: otherUser.id,
        badgeType: 'day_one_done',
      });

      // Award badge to test user
      await db.insert(userBadges).values({
        userId: testUserId,
        badgeType: 'week_warrior',
      });

      const result = await streaksService.getUserBadges(testUserId);

      expect(result.length).toBe(1);
      expect(result[0].badgeType).toBe('week_warrior');

      // Clean up
      await db.delete(userBadges).where(eq(userBadges.userId, otherUser.id));
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should correctly handle complete compliance flow', async () => {
      const today = new Date();
      const dayStart = startOfDay(today);

      // 1. Create tasks for today
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i + 1}`,
          taskType: 'workout',
          dueDate: dayStart,
          status: i < 4 ? 'completed' : 'pending',
          completedAt: i < 4 ? new Date() : null,
        });
      }

      // 2. Check compliance (should be true - 80%)
      const isCompliant = await streaksService.calculateDailyCompliance(testUserId);
      expect(isCompliant).toBe(true);

      // 3. Increment streak (if compliant)
      if (isCompliant) {
        const streakData = await streaksService.incrementStreak(testUserId);
        expect(streakData.currentStreak).toBe(1);

        // 4. Check and award badges
        const newBadges = await streaksService.checkAndAwardBadges(testUserId);
        expect(newBadges.length).toBe(1);
        expect(newBadges[0].badgeType).toBe('day_one_done');
      }

      // 5. Get final state
      const finalStreaks = await streaksService.getUserStreaks(testUserId);
      const finalBadges = await streaksService.getUserBadges(testUserId);

      expect(finalStreaks.currentStreak).toBe(1);
      expect(finalBadges.length).toBe(1);
    });

    it('should not award badges if not compliant', async () => {
      const today = new Date();
      const dayStart = startOfDay(today);

      // Create tasks with only 40% completion
      for (let i = 0; i < 5; i++) {
        await db.insert(dailyTasks).values({
          userId: testUserId,
          title: `Task ${i + 1}`,
          taskType: 'workout',
          dueDate: dayStart,
          status: i < 2 ? 'completed' : 'pending',
          completedAt: i < 2 ? new Date() : null,
        });
      }

      const isCompliant = await streaksService.calculateDailyCompliance(testUserId);
      expect(isCompliant).toBe(false);

      // Should not increment streak
      const streaks = await streaksService.getUserStreaks(testUserId);
      expect(streaks.currentStreak).toBe(0);

      const badges = await streaksService.getUserBadges(testUserId);
      expect(badges.length).toBe(0);
    });
  });
});
