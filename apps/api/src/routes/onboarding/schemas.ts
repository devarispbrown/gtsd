import { z } from 'zod';

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
    gender: z.enum(['male', 'female', 'other']),

    // Goals
    primaryGoal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'improve_health']),
    targetWeight: z.number().positive('Target weight must be positive').max(500),
    targetDate: z.string().datetime('Invalid date format'),
    activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']),

    // Health metrics
    currentWeight: z.number().positive('Current weight must be positive').max(500),
    height: z.number().positive('Height must be positive').min(50).max(300),

    // Preferences
    dietaryPreferences: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([]),
    mealsPerDay: z.number().int().min(1).max(10).default(3),

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