/**
 * Tests for Streaks Store Error Recovery
 *
 * Verifies that the improved error recovery mechanisms work correctly
 * including retry logic, optimistic updates, and error handling.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStreaksStore } from '../streaksStore';
import streakAndBadgeApi from '../../api/streaks';
import { BadgeType } from '@gtsd/shared-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Mock the dependencies
jest.mock('../../api/streaks');
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    networkError: jest.fn(),
    performance: jest.fn(),
  },
}));

describe('StreaksStore Error Recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store before each test
    useStreaksStore.getState().reset();
  });

  describe('Badge Award Error Recovery', () => {
    it('should handle badge fetch failure gracefully after award', async () => {
      const { result } = renderHook(() => useStreaksStore());

      // Mock successful compliance check with badge award
      const mockComplianceResponse = {
        data: {
          compliance: {
            date: '2024-10-22',
            isCompliant: true,
            completedTasks: 5,
            totalTasks: 5,
          },
          streakUpdate: null,
          badgesAwarded: {
            newBadgesAwarded: [BadgeType.DayOneDone],
            alreadyAwarded: [],
          },
        },
      };

      // Mock failed badge fetch
      const mockBadgeError = new Error('Network error');

      (streakAndBadgeApi.streaks.checkCompliance as jest.Mock).mockResolvedValueOnce(
        mockComplianceResponse
      );
      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockRejectedValue(
        mockBadgeError
      );

      await act(async () => {
        await result.current.checkCompliance();
      });

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isCheckingCompliance).toBe(false);
      });

      // Verify optimistic update was applied
      expect(result.current.badges).toHaveLength(1);
      expect(result.current.badges[0].badgeType).toBe(BadgeType.DayOneDone);

      // Verify badge award modal is still shown
      expect(result.current.newBadgeAwarded).toBeTruthy();
      expect(result.current.newBadgeAwarded?.type).toBe(BadgeType.DayOneDone);

      // Verify user-friendly error message
      expect(result.current.badgeAwardError).toBe(
        'Badge awarded! Pull to refresh to sync with server.'
      );

      // Verify haptic feedback was triggered
      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.any(Object)
      );
      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
    });

    it('should retry badge fetch with exponential backoff', async () => {
      const { result } = renderHook(() => useStreaksStore());

      let attemptCount = 0;
      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
        }
        return Promise.resolve({
          data: {
            badges: [
              {
                id: 1,
                badgeType: BadgeType.DayOneDone,
                awardedAt: new Date().toISOString(),
              },
            ],
          },
        });
      });

      await act(async () => {
        await result.current.fetchUserBadgesWithRetry();
      });

      // Verify it retried and eventually succeeded
      expect(attemptCount).toBe(3);
      expect(result.current.badges).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should fail after max retries exhausted', async () => {
      const { result } = renderHook(() => useStreaksStore());

      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockRejectedValue(
        new Error('Persistent error')
      );

      await expect(
        act(async () => {
          await result.current.fetchUserBadgesWithRetry();
        })
      ).rejects.toThrow('Persistent error');

      // Verify retry count was tracked
      expect(streakAndBadgeApi.badges.getMyBadges).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates for multiple badges', async () => {
      const { result } = renderHook(() => useStreaksStore());

      const mockComplianceResponse = {
        data: {
          compliance: {
            date: '2024-10-22',
            isCompliant: true,
            completedTasks: 5,
            totalTasks: 5,
          },
          streakUpdate: null,
          badgesAwarded: {
            newBadgesAwarded: [BadgeType.DayOneDone, BadgeType.WeekWarrior],
            alreadyAwarded: [],
          },
        },
      };

      (streakAndBadgeApi.streaks.checkCompliance as jest.Mock).mockResolvedValueOnce(
        mockComplianceResponse
      );
      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockResolvedValueOnce({
        data: {
          badges: [
            {
              id: 1,
              badgeType: BadgeType.DayOneDone,
              awardedAt: new Date().toISOString(),
            },
            {
              id: 2,
              badgeType: BadgeType.WeekWarrior,
              awardedAt: new Date().toISOString(),
            },
          ],
        },
      });

      await act(async () => {
        await result.current.checkCompliance();
      });

      // Verify both badges were added optimistically
      expect(result.current.badges).toHaveLength(2);
      expect(result.current.badges.map(b => b.badgeType)).toContain(BadgeType.DayOneDone);
      expect(result.current.badges.map(b => b.badgeType)).toContain(BadgeType.WeekWarrior);
    });

    it('should not duplicate badges on optimistic update', async () => {
      const { result } = renderHook(() => useStreaksStore());

      // Pre-populate with an existing badge
      act(() => {
        result.current.awardBadge(BadgeType.DayOneDone);
      });

      expect(result.current.badges).toHaveLength(1);

      const mockComplianceResponse = {
        data: {
          compliance: {
            date: '2024-10-22',
            isCompliant: true,
            completedTasks: 5,
            totalTasks: 5,
          },
          streakUpdate: null,
          badgesAwarded: {
            newBadgesAwarded: [BadgeType.DayOneDone], // Same badge
            alreadyAwarded: [],
          },
        },
      };

      (streakAndBadgeApi.streaks.checkCompliance as jest.Mock).mockResolvedValueOnce(
        mockComplianceResponse
      );
      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockResolvedValueOnce({
        data: { badges: [] },
      });

      await act(async () => {
        await result.current.checkCompliance();
      });

      // Verify no duplication occurred
      expect(result.current.badges).toHaveLength(1);
      expect(result.current.badges[0].badgeType).toBe(BadgeType.DayOneDone);
    });
  });

  describe('Loading States', () => {
    it('should manage loading states correctly during compliance check', async () => {
      const { result } = renderHook(() => useStreaksStore());

      const mockComplianceResponse = {
        data: {
          compliance: {
            date: '2024-10-22',
            isCompliant: true,
            completedTasks: 5,
            totalTasks: 5,
          },
          streakUpdate: null,
          badgesAwarded: {
            newBadgesAwarded: [],
            alreadyAwarded: [],
          },
        },
      };

      let resolveCompliance: any;
      const compliancePromise = new Promise(resolve => {
        resolveCompliance = resolve;
      });

      (streakAndBadgeApi.streaks.checkCompliance as jest.Mock).mockReturnValueOnce(
        compliancePromise
      );

      // Start compliance check
      act(() => {
        result.current.checkCompliance();
      });

      // Verify loading state is set
      expect(result.current.isCheckingCompliance).toBe(true);

      // Resolve the promise
      act(() => {
        resolveCompliance(mockComplianceResponse);
      });

      await waitFor(() => {
        expect(result.current.isCheckingCompliance).toBe(false);
      });
    });

    it('should track badge fetching state separately', async () => {
      const { result } = renderHook(() => useStreaksStore());

      let resolveBadges: any;
      const badgesPromise = new Promise(resolve => {
        resolveBadges = resolve;
      });

      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockReturnValueOnce(
        badgesPromise
      );

      // Start badge fetch
      act(() => {
        result.current.fetchUserBadges();
      });

      // Verify loading state is set
      expect(result.current.isFetchingBadges).toBe(true);

      // Resolve the promise
      act(() => {
        resolveBadges({
          data: { badges: [] },
        });
      });

      await waitFor(() => {
        expect(result.current.isFetchingBadges).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when requested', () => {
      const { result } = renderHook(() => useStreaksStore());

      // Set errors
      act(() => {
        useStreaksStore.setState({
          error: 'General error',
          badgeAwardError: 'Badge error',
        });
      });

      expect(result.current.error).toBe('General error');
      expect(result.current.badgeAwardError).toBe('Badge error');

      // Clear general error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.badgeAwardError).toBe('Badge error');

      // Clear badge award error
      act(() => {
        result.current.clearBadgeAwardError();
      });

      expect(result.current.badgeAwardError).toBeNull();
    });

    it('should handle initialization errors gracefully', async () => {
      const { result } = renderHook(() => useStreaksStore());

      (streakAndBadgeApi.streaks.getMyStreak as jest.Mock).mockRejectedValueOnce(
        new Error('Streak fetch failed')
      );
      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockRejectedValueOnce(
        new Error('Badges fetch failed')
      );

      await act(async () => {
        await result.current.initializeStreaksAndBadges();
      });

      expect(result.current.error).toBe(
        'Failed to initialize streaks and badges. Please refresh to try again.'
      );
      expect(result.current.isLoading).toBe(false);
      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger success haptic on successful badge award', async () => {
      const { result } = renderHook(() => useStreaksStore());

      const mockComplianceResponse = {
        data: {
          compliance: {
            date: '2024-10-22',
            isCompliant: true,
            completedTasks: 5,
            totalTasks: 5,
          },
          streakUpdate: null,
          badgesAwarded: {
            newBadgesAwarded: [BadgeType.DayOneDone],
            alreadyAwarded: [],
          },
        },
      };

      (streakAndBadgeApi.streaks.checkCompliance as jest.Mock).mockResolvedValueOnce(
        mockComplianceResponse
      );
      (streakAndBadgeApi.badges.getMyBadges as jest.Mock).mockResolvedValueOnce({
        data: { badges: [] },
      });

      await act(async () => {
        await result.current.checkCompliance();
      });

      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.any(Object)
      );
    });

    it('should trigger error haptic on failures', async () => {
      const { result } = renderHook(() => useStreaksStore());

      (streakAndBadgeApi.streaks.getMyStreak as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await act(async () => {
        await result.current.fetchStreakData();
      });

      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
    });
  });
});