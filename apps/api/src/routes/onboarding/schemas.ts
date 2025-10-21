import { z } from 'zod';
import {
  Gender,
  ActivityLevel,
  PrimaryGoal,
  OnboardingValidation
} from '@gtsd/shared-types';

export const partnerSchema = z.object({
  name: z.string().trim().min(1, 'Partner name is required').max(100),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  relationship: z.string().trim().max(50).optional(),
});

export const onboardingSchema = z
  .object({
    // Account basics
    dateOfBirth: z.string().datetime('Invalid date format'),
    gender: z.nativeEnum(Gender),

    // Goals
    primaryGoal: z.nativeEnum(PrimaryGoal),
    targetWeight: z.number().positive('Target weight must be positive').max(OnboardingValidation.MAX_WEIGHT),
    targetDate: z.string().datetime('Invalid date format'),
    activityLevel: z.nativeEnum(ActivityLevel),

    // Health metrics
    currentWeight: z.number().positive('Current weight must be positive').max(OnboardingValidation.MAX_WEIGHT),
    height: z.number().positive('Height must be positive').min(OnboardingValidation.MIN_HEIGHT).max(OnboardingValidation.MAX_HEIGHT),

    // Preferences
    dietaryPreferences: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([]),
    mealsPerDay: z.number().int().min(OnboardingValidation.MIN_MEALS_PER_DAY).max(OnboardingValidation.MAX_MEALS_PER_DAY).default(3),

    // Partners (optional)
    partners: z.array(partnerSchema).default([]),
  })
  .refine(
    (data) => {
      const target = new Date(data.targetDate);
      const now = new Date();
      return target > now;
    },
    {
      message: 'Target date must be in the future',
      path: ['targetDate'],
    }
  )
  .refine(
    (data) => {
      const dob = new Date(data.dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      return age >= 13 && age <= 120;
    },
    {
      message: 'You must be between 13 and 120 years old',
      path: ['dateOfBirth'],
    }
  )
  .refine(
    (data) => {
      // At least one contact method for partners
      return data.partners.every((p) => p.email || p.phone);
    },
    {
      message: 'Partners must have at least an email or phone number',
      path: ['partners'],
    }
  );

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type PartnerInput = z.infer<typeof partnerSchema>;