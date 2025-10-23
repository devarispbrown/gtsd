/**
 * Streaks and Badges Store
 *
 * Manages application state for streaks and achievement badges.
 * Handles data fetching, caching, and state updates for the gamification system.
 * Includes comprehensive error recovery and retry logic.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  DailyComplianceStreak,
  UserBadgeWithMetadata,
  BadgeMetadata,
  BadgeType,
  DailyComplianceResult,
  BADGE_CATALOG,
} from '@gtsd/shared-types';
import streakAndBadgeApi from '../api/streaks';
import { logger } from '../utils/logger';

interface StreaksStore {
  // State
  streak: DailyComplianceStreak | null;
  todayCompliance: DailyComplianceResult | null;
  canIncrementToday: boolean;
  badges: UserBadgeWithMetadata[];
  availableBadges: BadgeMetadata[];
  newBadgeAwarded: BadgeMetadata | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isCheckingCompliance: boolean;
  isFetchingBadges: boolean;
  error: string | null;
  badgeAwardError: string | null;
  lastFetchTime: number | null;
  retryCount: number;

  // Actions - Streaks
  fetchStreakData: () => Promise<void>;
  refreshStreak: () => Promise<void>;
  checkCompliance: (date?: string) => Promise<void>;
  updateStreak: (streak: DailyComplianceStreak) => void;

  // Actions - Badges
  fetchUserBadges: () => Promise<void>;
  fetchUserBadgesWithRetry: (retries?: number) => Promise<void>;
  refreshBadges: () => Promise<void>;
  awardBadge: (badgeType: BadgeType) => void;
  showBadgeAward: (badgeType: BadgeType) => void;
  clearBadgeAward: () => void;

  // Actions - Combined
  checkComplianceAndAwards: () => Promise<void>;
  initializeStreaksAndBadges: () => Promise<void>;

  // Utilities
  clearError: () => void;
  clearBadgeAwardError: () => void;
  reset: () => void;
  triggerErrorHaptic: () => void;
  triggerSuccessHaptic: () => void;

  // Getters
  getBadgeProgress: (badgeType: BadgeType) => number;
  isStreakActive: () => boolean;
  getDaysSinceLastCompliance: () => number | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BADGE_FETCH_MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useStreaksStore = create<StreaksStore>()(
  immer((set, get) => ({
    // Initial state
    streak: null,
    todayCompliance: null,
    canIncrementToday: false,
    badges: [],
    availableBadges: Object.values(BADGE_CATALOG),
    newBadgeAwarded: null,
    isLoading: false,
    isRefreshing: false,
    isCheckingCompliance: false,
    isFetchingBadges: false,
    error: null,
    badgeAwardError: null,
    lastFetchTime: null,
    retryCount: 0,

    // Haptic feedback utilities
    triggerErrorHaptic: () => {
      ReactNativeHapticFeedback.trigger('notificationError', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    },

    triggerSuccessHaptic: () => {
      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    },

    // Streak Actions
    fetchStreakData: async () => {
      const state = get();
      const now = Date.now();

      // Use cache if available and fresh
      if (state.streak && state.lastFetchTime && now - state.lastFetchTime < CACHE_DURATION) {
        logger.debug('Using cached streak data');
        return;
      }

      set(draft => {
        draft.isLoading = !state.streak;
        draft.error = null;
      });

      try {
        const response = await streakAndBadgeApi.streaks.getMyStreak();

        if (response.data) {
          set(draft => {
            draft.streak = response.data!.streak;
            draft.todayCompliance = response.data!.todayCompliance;
            draft.canIncrementToday = response.data!.canIncrementToday;
            draft.lastFetchTime = now;
            draft.isLoading = false;
          });
          logger.info('Streak data fetched successfully');
        } else if (response.error) {
          set(draft => {
            draft.error = response.error!;
            draft.isLoading = false;
          });
          logger.error('Failed to fetch streak data', new Error(response.error!));
          get().triggerErrorHaptic();
        }
      } catch (error) {
        set(draft => {
          draft.error = 'Failed to fetch streak data';
          draft.isLoading = false;
        });
        logger.error('Exception while fetching streak data', error);
        get().triggerErrorHaptic();
      }
    },

    refreshStreak: async () => {
      set(draft => {
        draft.isRefreshing = true;
        draft.error = null;
      });

      try {
        const response = await streakAndBadgeApi.streaks.getMyStreak();

        if (response.data) {
          set(draft => {
            draft.streak = response.data!.streak;
            draft.todayCompliance = response.data!.todayCompliance;
            draft.canIncrementToday = response.data!.canIncrementToday;
            draft.lastFetchTime = Date.now();
            draft.isRefreshing = false;
          });
          logger.info('Streak data refreshed successfully');
        } else if (response.error) {
          set(draft => {
            draft.error = response.error!;
            draft.isRefreshing = false;
          });
          logger.error('Failed to refresh streak data', new Error(response.error!));
          get().triggerErrorHaptic();
        }
      } catch (error) {
        set(draft => {
          draft.error = 'Failed to refresh streak data';
          draft.isRefreshing = false;
        });
        logger.error('Exception while refreshing streak data', error);
        get().triggerErrorHaptic();
      }
    },

    checkCompliance: async (date?: string) => {
      set(draft => {
        draft.isCheckingCompliance = true;
        draft.error = null;
        draft.badgeAwardError = null;
      });

      try {
        const response = await streakAndBadgeApi.streaks.checkCompliance(
          date ? { date } : undefined
        );

        if (response.data) {
          // Update compliance and streak if changed
          if (response.data.streakUpdate) {
            await get().fetchStreakData();
          }

          // Handle new badges with improved error recovery
          if (response.data.badgesAwarded.newBadgesAwarded.length > 0) {
            const newBadges = response.data.badgesAwarded.newBadgesAwarded;
            const firstNewBadge = newBadges[0];

            // Optimistically add badges to local state
            const optimisticBadges = newBadges.map(badgeType => {
              const badgeMetadata = BADGE_CATALOG[badgeType];
              return {
                id: Date.now() + Math.random(), // Temporary unique ID
                userId: 0, // Will be replaced by server
                badgeType,
                awardedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                metadata: badgeMetadata,
              } as UserBadgeWithMetadata;
            });

            set(draft => {
              // Add optimistic badges if they don't already exist
              optimisticBadges.forEach(newBadge => {
                const exists = draft.badges.some(
                  (b: UserBadgeWithMetadata) => b.badgeType === newBadge.badgeType
                );
                if (!exists) {
                  draft.badges.unshift(newBadge);
                }
              });
            });

            logger.info('Badges awarded optimistically', { badges: newBadges });

            try {
              // Show badge award modal
              get().showBadgeAward(firstNewBadge);
              get().triggerSuccessHaptic();

              // Fetch badges with retry logic
              await get().fetchUserBadgesWithRetry();
              logger.info('Badge list refreshed successfully after award');
            } catch (error) {
              // If badge fetch fails, show user-friendly error but keep optimistic update
              logger.error('Failed to refresh badges after award', error);
              set(draft => {
                draft.badgeAwardError = 'Badge awarded! Pull to refresh to sync with server.';
              });

              // Still trigger error haptic to indicate partial failure
              get().triggerErrorHaptic();

              // Don't clear the badge award modal - let user celebrate!
              // User can dismiss it manually
            }
          }

          set(draft => {
            draft.todayCompliance = response.data!.compliance;
            draft.isCheckingCompliance = false;
          });

          logger.info('Compliance checked successfully', {
            date,
            streakUpdated: response.data.streakUpdate,
            badgesAwarded: response.data.badgesAwarded.newBadgesAwarded.length,
          });
        } else if (response.error) {
          set(draft => {
            draft.error = response.error!;
            draft.isCheckingCompliance = false;
          });
          logger.error('Failed to check compliance', new Error(response.error!));
          get().triggerErrorHaptic();
        }
      } catch (error) {
        set(draft => {
          draft.error = 'Failed to check compliance. Please try again.';
          draft.isCheckingCompliance = false;
        });
        logger.error('Exception while checking compliance', error);
        get().triggerErrorHaptic();
      }
    },

    updateStreak: (streak: DailyComplianceStreak) => {
      set(draft => {
        draft.streak = streak;
        draft.lastFetchTime = Date.now();
      });
      logger.debug('Streak updated manually');
    },

    // Badge Actions
    fetchUserBadges: async () => {
      const state = get();

      set(draft => {
        draft.isFetchingBadges = true;
        draft.isLoading = state.badges.length === 0;
        draft.error = null;
        draft.badgeAwardError = null;
      });

      try {
        const response = await streakAndBadgeApi.badges.getMyBadges();

        if (response.data) {
          set(draft => {
            draft.badges = response.data!.badges;
            draft.isFetchingBadges = false;
            draft.isLoading = false;
            draft.retryCount = 0; // Reset retry count on success
          });
          logger.info('User badges fetched successfully', {
            count: response.data.badges.length,
          });
        } else if (response.error) {
          throw new Error(response.error);
        }
      } catch (error) {
        set(draft => {
          draft.error = 'Failed to fetch badges';
          draft.isFetchingBadges = false;
          draft.isLoading = false;
        });
        logger.error('Failed to fetch user badges', error);
        throw error; // Re-throw for retry logic
      }
    },

    fetchUserBadgesWithRetry: async (retries = BADGE_FETCH_MAX_RETRIES) => {
      const startTime = Date.now();

      try {
        await get().fetchUserBadges();
        const duration = Date.now() - startTime;
        logger.performance('fetchUserBadgesWithRetry', duration, {
          retriesUsed: BADGE_FETCH_MAX_RETRIES - retries,
        });
      } catch (error) {
        if (retries > 0) {
          logger.networkError('Badge fetch failed', error, retries - 1, {
            attempt: BADGE_FETCH_MAX_RETRIES - retries + 1,
          });

          set(draft => {
            draft.retryCount = BADGE_FETCH_MAX_RETRIES - retries + 1;
          });

          // Wait before retrying with exponential backoff
          const delay = RETRY_DELAY * Math.pow(2, BADGE_FETCH_MAX_RETRIES - retries);
          await new Promise(resolve => setTimeout(resolve, delay));

          return get().fetchUserBadgesWithRetry(retries - 1);
        }

        // All retries exhausted
        logger.error('Failed to fetch badges after all retries', error, {
          maxRetries: BADGE_FETCH_MAX_RETRIES,
        });

        set(draft => {
          draft.retryCount = 0;
        });

        throw error;
      }
    },

    refreshBadges: async () => {
      set(draft => {
        draft.isRefreshing = true;
        draft.error = null;
        draft.badgeAwardError = null;
      });

      try {
        await get().fetchUserBadgesWithRetry();
        set(draft => {
          draft.isRefreshing = false;
        });
        logger.info('Badges refreshed successfully');
      } catch (error) {
        set(draft => {
          draft.error = 'Failed to refresh badges. Pull down to try again.';
          draft.isRefreshing = false;
        });
        logger.error('Failed to refresh badges', error);
        get().triggerErrorHaptic();
      }
    },

    awardBadge: (badgeType: BadgeType) => {
      const badgeMetadata = BADGE_CATALOG[badgeType];
      if (!badgeMetadata) {
        logger.warn('Attempted to award unknown badge type', { badgeType });
        return;
      }

      const newBadge: UserBadgeWithMetadata = {
        id: Date.now(), // Temporary ID
        userId: 0, // Will be set by server
        badgeType,
        awardedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        metadata: badgeMetadata,
      };

      set(draft => {
        // Check if badge already exists
        const exists = draft.badges.some((b: UserBadgeWithMetadata) => b.badgeType === badgeType);
        if (!exists) {
          draft.badges.push(newBadge);
          logger.info('Badge awarded locally', { badgeType });
        } else {
          logger.debug('Badge already exists', { badgeType });
        }
      });
    },

    showBadgeAward: (badgeType: BadgeType) => {
      const badgeMetadata = BADGE_CATALOG[badgeType];
      if (!badgeMetadata) {
        logger.warn('Attempted to show unknown badge type', { badgeType });
        return;
      }

      set(draft => {
        draft.newBadgeAwarded = badgeMetadata;
      });

      logger.info('Showing badge award modal', { badgeType });
    },

    clearBadgeAward: () => {
      set(draft => {
        draft.newBadgeAwarded = null;
        draft.badgeAwardError = null;
      });
      logger.debug('Badge award modal cleared');
    },

    // Combined Actions
    checkComplianceAndAwards: async () => {
      const state = get();

      // Check if we should check compliance
      if (!state.canIncrementToday) {
        logger.debug('Skipping compliance check - already checked today');
        return;
      }

      await get().checkCompliance();
    },

    initializeStreaksAndBadges: async () => {
      set(draft => {
        draft.isLoading = true;
        draft.error = null;
        draft.badgeAwardError = null;
      });

      const startTime = Date.now();

      try {
        // Fetch both in parallel
        const [streakResponse, badgesResponse] = await Promise.all([
          streakAndBadgeApi.streaks.getMyStreak(),
          streakAndBadgeApi.badges.getMyBadges(),
        ]);

        set(draft => {
          if (streakResponse.data) {
            draft.streak = streakResponse.data.streak;
            draft.todayCompliance = streakResponse.data.todayCompliance;
            draft.canIncrementToday = streakResponse.data.canIncrementToday;
            draft.lastFetchTime = Date.now();
          }

          if (badgesResponse.data) {
            draft.badges = badgesResponse.data.badges;
          }

          draft.isLoading = false;

          // Set error if either failed
          const error = streakResponse.error || badgesResponse.error;
          if (error) {
            draft.error = error;
            logger.error('Partial failure during initialization', new Error(error));
            get().triggerErrorHaptic();
          }
        });

        const duration = Date.now() - startTime;
        logger.performance('initializeStreaksAndBadges', duration, {
          streakSuccess: !!streakResponse.data,
          badgesSuccess: !!badgesResponse.data,
        });

        if (streakResponse.data && badgesResponse.data) {
          logger.info('Streaks and badges initialized successfully');
        }
      } catch (error) {
        set(draft => {
          draft.error = 'Failed to initialize streaks and badges. Please refresh to try again.';
          draft.isLoading = false;
        });
        logger.error('Failed to initialize streaks and badges', error);
        get().triggerErrorHaptic();
      }
    },

    // Utilities
    clearError: () => {
      set(draft => {
        draft.error = null;
      });
      logger.debug('Error cleared');
    },

    clearBadgeAwardError: () => {
      set(draft => {
        draft.badgeAwardError = null;
      });
      logger.debug('Badge award error cleared');
    },

    reset: () => {
      set(draft => {
        draft.streak = null;
        draft.todayCompliance = null;
        draft.canIncrementToday = false;
        draft.badges = [];
        draft.newBadgeAwarded = null;
        draft.isLoading = false;
        draft.isRefreshing = false;
        draft.isCheckingCompliance = false;
        draft.isFetchingBadges = false;
        draft.error = null;
        draft.badgeAwardError = null;
        draft.lastFetchTime = null;
        draft.retryCount = 0;
      });
      logger.info('Store reset');
    },

    // Getters
    getBadgeProgress: (badgeType: BadgeType) => {
      const state = get();
      const badge = BADGE_CATALOG[badgeType];

      if (!badge || !state.streak) return 0;

      // Calculate progress based on badge type
      switch (badgeType) {
        case BadgeType.DayOneDone:
          return state.streak.totalCompliantDays >= 1 ? 100 : 0;

        case BadgeType.WeekWarrior:
          return Math.min((state.streak.currentStreak / 7) * 100, 100);

        case BadgeType.ConsistencyKing:
          return Math.min((state.streak.currentStreak / 30) * 100, 100);

        case BadgeType.HundredClub:
          return Math.min((state.streak.currentStreak / 100) * 100, 100);

        default:
          return 0;
      }
    },

    isStreakActive: () => {
      const state = get();
      if (!state.streak) return false;

      const lastDate = state.streak.lastComplianceDate;
      if (!lastDate) return false;

      const daysSince = get().getDaysSinceLastCompliance();
      return daysSince !== null && daysSince <= 1;
    },

    getDaysSinceLastCompliance: () => {
      const state = get();
      if (!state.streak || !state.streak.lastComplianceDate) return null;

      const lastDate = new Date(state.streak.lastComplianceDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    },
  }))
);
