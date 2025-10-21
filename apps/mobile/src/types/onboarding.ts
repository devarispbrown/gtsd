/**
 * Re-export onboarding types from shared-types package
 * This maintains backward compatibility while using shared types
 */
export type {
  Gender,
  ActivityLevel,
  PrimaryGoal,
  DietaryPreference,
  RelationshipType,
  AccountabilityPartner,
  PartnerInput,
  OnboardingData,
  OnboardingStep,
  OnboardingProgress,
  OnboardingApiRequest,
  OnboardingApiResponse,
  HealthCalculations,
  OnboardingValidation,
} from '@gtsd/shared-types';

// Re-export enums for easy access
export {
  Gender as GenderEnum,
  ActivityLevel as ActivityLevelEnum,
  PrimaryGoal as PrimaryGoalEnum,
  DietaryPreference as DietaryPreferenceEnum,
  RelationshipType as RelationshipTypeEnum,
} from '@gtsd/shared-types';