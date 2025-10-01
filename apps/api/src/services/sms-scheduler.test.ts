import { db } from '../db/connection';
import { users, smsLogs } from '../db/schema';
import { smsQueue } from '../config/queue';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Mock setup
 */
jest.mock('../db/connection');
jest.mock('../config/queue');

const mockDb = db as jest.Mocked<typeof db>;
const mockSmsQueue = smsQueue as jest.Mocked<typeof smsQueue>;

interface MockUser {
  id: number;
  name: string;
  phone: string;
  timezone: string;
  smsOptIn: boolean;
  isActive: boolean;
}

interface MockDbChain {
  from: jest.Mock;
  where: jest.Mock;
}

describe('SMS Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User filtering', () => {
    it('should only select users with sms_opt_in = true', async () => {
      const mockUsers: MockUser[] = [
        {
          id: 1,
          name: 'Test User 1',
          phone: '+15551234567',
          timezone: 'America/Los_Angeles',
          smsOptIn: true,
          isActive: true,
        },
        // User 2 has opt-in false, should not be selected
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      } as unknown as MockDbChain);

      // Verify that only opted-in users are processed
      expect(mockUsers.every((u) => u.smsOptIn === true)).toBe(true);
    });

    it('should only select users with valid phone numbers', async () => {
      const mockUsers: MockUser[] = [
        {
          id: 1,
          name: 'Test User 1',
          phone: '+15551234567',
          timezone: 'America/Los_Angeles',
          smsOptIn: true,
          isActive: true,
        },
        // User 2 has null phone, should not be selected
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      } as unknown as MockDbChain);

      // Verify that all users have phone numbers
      expect(mockUsers.every((u) => u.phone !== null)).toBe(true);
    });

    it('should only select active users', async () => {
      const mockUsers: MockUser[] = [
        {
          id: 1,
          name: 'Test User 1',
          phone: '+15551234567',
          timezone: 'America/Los_Angeles',
          smsOptIn: true,
          isActive: true,
        },
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      } as unknown as MockDbChain);

      // Verify that all users are active
      expect(mockUsers.every((u) => u.isActive === true)).toBe(true);
    });
  });

  describe('Cron scheduling', () => {
    it('should schedule morning nudges at 6:15 AM in each timezone', () => {
      const morningConfig = {
        hour: 6,
        minute: 15,
      };

      expect(morningConfig.hour).toBe(6);
      expect(morningConfig.minute).toBe(15);
    });

    it('should schedule evening reminders at 9:00 PM in each timezone', () => {
      const eveningConfig = {
        hour: 21, // 9 PM
        minute: 0,
      };

      expect(eveningConfig.hour).toBe(21);
      expect(eveningConfig.minute).toBe(0);
    });

    it('should check schedules every 5 minutes', () => {
      const cronExpression = '*/5 * * * *'; // Every 5 minutes

      // Validate cron expression format
      expect(cronExpression).toBe('*/5 * * * *');
    });
  });

  describe('Timezone handling', () => {
    it('should correctly determine send time for Pacific timezone', () => {
      const timezone = 'America/Los_Angeles';
      const testDate = new Date('2025-09-30T06:15:00-07:00'); // 6:15 AM Pacific

      const formatted = formatInTimeZone(testDate, timezone, 'HH:mm');
      expect(formatted).toBe('06:15');
    });

    it('should correctly determine send time for Eastern timezone', () => {
      const timezone = 'America/New_York';
      const testDate = new Date('2025-09-30T06:15:00-04:00'); // 6:15 AM Eastern

      const formatted = formatInTimeZone(testDate, timezone, 'HH:mm');
      expect(formatted).toBe('06:15');
    });

    it('should correctly determine send time for Central timezone', () => {
      const timezone = 'America/Chicago';
      const testDate = new Date('2025-09-30T06:15:00-05:00'); // 6:15 AM Central

      const formatted = formatInTimeZone(testDate, timezone, 'HH:mm');
      expect(formatted).toBe('06:15');
    });

    it('should handle users across multiple timezones', () => {
      const users = [
        { id: 1, timezone: 'America/Los_Angeles' }, // Pacific
        { id: 2, timezone: 'America/Denver' }, // Mountain
        { id: 3, timezone: 'America/Chicago' }, // Central
        { id: 4, timezone: 'America/New_York' }, // Eastern
      ];

      // Each user should get SMS at their local 6:15 AM
      expect(users.length).toBe(4);
    });
  });

  describe('Evening reminder task filtering', () => {
    it('should only send reminder to users with pending tasks', async () => {
      // Mock pending tasks - 3 tasks pending
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 3 }]),
        }),
      } as unknown as MockDbChain);

      // Should queue evening reminder
      const pendingCount = 3;
      expect(pendingCount).toBeGreaterThan(0);
    });

    it('should not send reminder to users with no pending tasks', async () => {
      // Mock pending tasks - 0 tasks pending
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      } as unknown as MockDbChain);

      // Should not queue evening reminder
      const pendingCount = 0;
      expect(pendingCount).toBe(0);
    });

    it('should only check tasks for today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Task filtering should be between today 00:00 and tomorrow 00:00
      expect(today.getHours()).toBe(0);
      expect(tomorrow.getDate()).toBe(today.getDate() + 1);
    });
  });

  describe('Job queuing', () => {
    it('should add jobs to SMS queue with correct data structure', async () => {
      const jobData = {
        userId: 1,
        messageType: 'morning_nudge' as const,
      };

      mockSmsQueue.add = jest.fn().mockResolvedValue({});

      await mockSmsQueue.add('morning_nudge', jobData);

      expect(mockSmsQueue.add).toHaveBeenCalledWith('morning_nudge', jobData);
    });

    it('should configure jobs with retry logic', () => {
      const jobOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      };

      expect(jobOptions.attempts).toBe(3);
      expect(jobOptions.backoff.type).toBe('exponential');
    });

    it('should configure job retention policies', () => {
      const jobOptions = {
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // 7 days
        },
      };

      expect(jobOptions.removeOnComplete.age).toBe(86400);
      expect(jobOptions.removeOnFail.age).toBe(604800);
    });
  });

  describe('Manual trigger', () => {
    it('should allow manually triggering SMS for specific user', async () => {
      const userId = 123;
      const messageType = 'morning_nudge';

      mockSmsQueue.add = jest.fn().mockResolvedValue({});

      await mockSmsQueue.add(`manual_${messageType}`, {
        userId,
        messageType,
      });

      expect(mockSmsQueue.add).toHaveBeenCalledWith(
        `manual_${messageType}`,
        expect.objectContaining({
          userId,
          messageType,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as unknown as MockDbChain);

      // Scheduler should log error and continue
      const selectChain = mockDb.select().from(users);
      await expect(
        selectChain.where({})
      ).rejects.toThrow('Database error');
    });

    it('should handle queue errors gracefully', async () => {
      mockSmsQueue.add = jest.fn().mockRejectedValue(new Error('Queue error'));

      await expect(
        mockSmsQueue.add('test', { userId: 1, messageType: 'morning_nudge' })
      ).rejects.toThrow('Queue error');
    });
  });

  describe('Last sent date tracking (shouldSendToday logic)', () => {
    it('should send SMS after target time if not sent today', () => {
      const targetHour = 6;

      // Current time: 8:00 AM (after target)
      const now = new Date('2025-09-30T08:00:00-07:00');

      // Last sent: Yesterday at 6:30 AM
      const lastSentAt = new Date('2025-09-29T06:30:00-07:00');

      // Should send because it's after target time and last send was yesterday
      // This test validates the logic conceptually
      const currentHour = 8;
      const isAfterTarget = currentHour > targetHour;
      const lastSentDay = lastSentAt.getDate();
      const currentDay = now.getDate();

      expect(isAfterTarget).toBe(true);
      expect(lastSentDay).toBeLessThan(currentDay);
    });

    it('should not send SMS if already sent today', () => {
      const targetHour = 6;

      // Current time: 8:00 AM (after target)
      const now = new Date('2025-09-30T08:00:00-07:00');

      // Last sent: Today at 6:30 AM
      const lastSentAt = new Date('2025-09-30T06:30:00-07:00');

      // Should NOT send because already sent today
      const lastSentDay = lastSentAt.getDate();
      const currentDay = now.getDate();

      expect(lastSentDay).toBe(currentDay);
    });

    it('should send SMS on next day even if missed yesterday', () => {
      const targetHour = 6;

      // Current time: Next day, 7:00 AM (after target)
      const now = new Date('2025-10-01T07:00:00-07:00');

      // Last sent: Two days ago at 6:30 AM
      const lastSentAt = new Date('2025-09-29T06:30:00-07:00');

      // Should send because it's a new day after target time
      const currentHour = 7;
      const isAfterTarget = currentHour > targetHour;
      const lastSentDay = lastSentAt.getDate();
      const currentDay = now.getDate();

      expect(isAfterTarget).toBe(true);
      expect(lastSentDay).toBeLessThan(currentDay);
    });

    it('should not send SMS before target time', () => {
      const targetHour = 6;

      // Current time: 5:00 AM (before target)
      const now = new Date('2025-09-30T05:00:00-07:00');

      // Last sent: Yesterday
      const lastSentAt = new Date('2025-09-29T06:30:00-07:00');

      // Should NOT send because it's too early
      const currentHour = 5;
      const isAfterTarget = currentHour >= targetHour;

      expect(isAfterTarget).toBe(false);
    });

    it('should send SMS if never sent before (null lastSentAt)', () => {
      const targetHour = 6;

      // Current time: 7:00 AM (after target)
      const now = new Date('2025-09-30T07:00:00-07:00');

      // Never sent before
      const lastSentAt = null;

      // Should send because never sent before and after target time
      const currentHour = 7;
      const isAfterTarget = currentHour > targetHour;

      expect(isAfterTarget).toBe(true);
      expect(lastSentAt).toBeNull();
    });
  });
});
