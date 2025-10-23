/**
 * Streaks and Badges API Integration
 *
 * Provides type-safe methods for fetching streak data and user badges
 * from the GTSD API backend.
 */

import apiClient, { apiRequest, handleApiError } from './client';
import {
  GetMyStreakResponse,
  CheckComplianceRequest,
  CheckComplianceResponse,
  GetMyBadgesResponse,
  GetAvailableBadgesResponse,
  GetBadgeDetailsResponse,
  DailyComplianceStreak,
  UserBadgeWithMetadata,
  BadgeMetadata,
  BadgeType,
} from '@gtsd/shared-types';

/**
 * Streaks API methods
 */
export const streaksApi = {
  /**
   * GET /v1/streaks/me
   * Fetch current user's streak information
   *
   * @returns Promise with user's streak data
   *
   * @example
   * const response = await streaksApi.getMyStreak();
   * if (response.data) {
   *   console.log('Current streak:', response.data.streak.currentStreak);
   * }
   */
  getMyStreak: async (): Promise<{
    data?: GetMyStreakResponse;
    error?: string;
  }> => {
    return apiRequest(() =>
      apiClient.get<GetMyStreakResponse>('/v1/streaks/me')
    );
  },

  /**
   * POST /v1/streaks/check-compliance
   * Manually trigger compliance check for a date
   *
   * @param request - Optional date to check compliance for
   * @returns Promise with compliance result and any badges awarded
   *
   * @example
   * const response = await streaksApi.checkCompliance({ date: '2025-10-22' });
   * if (response.data?.badgesAwarded.newBadgesAwarded.length > 0) {
   *   console.log('New badges earned!');
   * }
   */
  checkCompliance: async (
    request?: CheckComplianceRequest
  ): Promise<{
    data?: CheckComplianceResponse;
    error?: string;
  }> => {
    return apiRequest(() =>
      apiClient.post<CheckComplianceResponse>(
        '/v1/streaks/check-compliance',
        request || {}
      )
    );
  },
};

/**
 * Badges API methods
 */
export const badgesApi = {
  /**
   * GET /v1/badges/me
   * Fetch current user's earned badges
   *
   * @returns Promise with user's badges
   *
   * @example
   * const response = await badgesApi.getMyBadges();
   * if (response.data) {
   *   console.log('Total badges earned:', response.data.totalBadges);
   * }
   */
  getMyBadges: async (): Promise<{
    data?: GetMyBadgesResponse;
    error?: string;
  }> => {
    return apiRequest(() =>
      apiClient.get<GetMyBadgesResponse>('/v1/badges/me')
    );
  },

  /**
   * GET /v1/badges/available
   * Get all available badges in the system
   *
   * @returns Promise with all available badges
   *
   * @example
   * const response = await badgesApi.getAvailableBadges();
   * if (response.data) {
   *   console.log('Total badges available:', response.data.total);
   * }
   */
  getAvailableBadges: async (): Promise<{
    data?: GetAvailableBadgesResponse;
    error?: string;
  }> => {
    return apiRequest(() =>
      apiClient.get<GetAvailableBadgesResponse>('/v1/badges/available')
    );
  },

  /**
   * GET /v1/badges/:badgeType
   * Get details for a specific badge
   *
   * @param badgeType - The type of badge to get details for
   * @returns Promise with badge details
   *
   * @example
   * const response = await badgesApi.getBadgeDetails(BadgeType.WeekWarrior);
   * if (response.data) {
   *   console.log('Badge earned:', response.data.earned);
   * }
   */
  getBadgeDetails: async (
    badgeType: BadgeType
  ): Promise<{
    data?: GetBadgeDetailsResponse;
    error?: string;
  }> => {
    return apiRequest(() =>
      apiClient.get<GetBadgeDetailsResponse>(`/v1/badges/${badgeType}`)
    );
  },
};

/**
 * Helper function to fetch streak data
 * Returns null if there's an error
 */
export const fetchStreakData = async (): Promise<DailyComplianceStreak | null> => {
  try {
    const response = await streaksApi.getMyStreak();
    if (response.data) {
      return response.data.streak;
    }
    console.error('Failed to fetch streak data:', response.error);
    return null;
  } catch (error) {
    console.error('Error fetching streak data:', handleApiError(error));
    return null;
  }
};

/**
 * Helper function to fetch user badges
 * Returns empty array if there's an error
 */
export const fetchUserBadges = async (): Promise<UserBadgeWithMetadata[]> => {
  try {
    const response = await badgesApi.getMyBadges();
    if (response.data) {
      return response.data.badges;
    }
    console.error('Failed to fetch badges:', response.error);
    return [];
  } catch (error) {
    console.error('Error fetching badges:', handleApiError(error));
    return [];
  }
};

/**
 * Helper function to check compliance and return any new badges
 * Returns null if there's an error
 */
export const checkComplianceAndAwardBadges = async (
  date?: string
): Promise<{
  newBadges: BadgeType[];
  streakUpdated: boolean;
} | null> => {
  try {
    const response = await streaksApi.checkCompliance(date ? { date } : undefined);
    if (response.data) {
      return {
        newBadges: response.data.badgesAwarded.newBadgesAwarded,
        streakUpdated: response.data.streakUpdate !== null,
      };
    }
    console.error('Failed to check compliance:', response.error);
    return null;
  } catch (error) {
    console.error('Error checking compliance:', handleApiError(error));
    return null;
  }
};

/**
 * Combined API export
 */
export const streakAndBadgeApi = {
  streaks: streaksApi,
  badges: badgesApi,

  // Helper functions
  fetchStreakData,
  fetchUserBadges,
  checkComplianceAndAwardBadges,
};

export default streakAndBadgeApi;