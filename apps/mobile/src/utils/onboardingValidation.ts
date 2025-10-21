import { z } from 'zod';

// Validation schemas for each step

// Account Basics Schema
export const accountBasicsSchema = z.object({
  dateOfBirth: z
    .date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 13 && age <= 120;
      },
      {
        message: 'Age must be between 13 and 120 years',
      }
    ),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'] as const),
});

// Goals Schema
export const goalsSchema = z.object({
  primaryGoal: z
    .string()
    .min(3, 'Goal must be at least 3 characters')
    .max(200, 'Goal must be less than 200 characters'),
  targetWeight: z
    .number()
    .min(30, 'Target weight must be at least 30 kg')
    .max(300, 'Target weight must be less than 300 kg'),
  targetDate: z
    .date()
    .min(new Date(), 'Target date must be in the future')
    .refine(
      (date) => {
        const monthsAhead = (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAhead <= 24; // Max 2 years
      },
      {
        message: 'Target date must be within 2 years',
      }
    ),
});

// Health Metrics Schema
export const healthMetricsSchema = z.object({
  currentWeight: z
    .number()
    .min(30, 'Weight must be at least 30 kg')
    .max(300, 'Weight must be less than 300 kg'),
  height: z
    .number()
    .min(100, 'Height must be at least 100 cm')
    .max(250, 'Height must be less than 250 cm'),
});

// Activity Level Schema
export const activityLevelSchema = z.object({
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extremely_active',
  ] as const),
});

// Preferences Schema
export const preferencesSchema = z.object({
  dietaryPreferences: z.array(
    z.enum([
      'none',
      'vegetarian',
      'vegan',
      'pescatarian',
      'keto',
      'paleo',
      'gluten_free',
      'dairy_free',
      'halal',
      'kosher',
      'other',
    ] as const)
  ).min(1, 'Select at least one dietary preference'),
  allergies: z.array(z.string()),
  mealsPerDay: z
    .number()
    .min(1, 'Must have at least 1 meal per day')
    .max(6, 'Maximum 6 meals per day'),
});

// Partner Schema
const partnerSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  relationship: z.enum([
    'spouse',
    'partner',
    'friend',
    'family',
    'coach',
    'colleague',
    'other',
  ] as const),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone number is required',
    path: ['email'],
  }
);

// Partners Schema
export const partnersSchema = z.object({
  partners: z
    .array(partnerSchema)
    .max(5, 'Maximum 5 accountability partners allowed'),
});

// Complete Onboarding Schema
export const completeOnboardingSchema = accountBasicsSchema
  .merge(goalsSchema)
  .merge(healthMetricsSchema)
  .merge(activityLevelSchema)
  .merge(preferencesSchema)
  .merge(partnersSchema);

// Type inference from schemas
export type AccountBasicsFormData = z.infer<typeof accountBasicsSchema>;
export type GoalsFormData = z.infer<typeof goalsSchema>;
export type HealthMetricsFormData = z.infer<typeof healthMetricsSchema>;
export type ActivityLevelFormData = z.infer<typeof activityLevelSchema>;
export type PreferencesFormData = z.infer<typeof preferencesSchema>;
export type PartnersFormData = z.infer<typeof partnersSchema>;
export type CompleteOnboardingFormData = z.infer<typeof completeOnboardingSchema>;

// Validation helper functions
export const validateStep = (
  step: string,
  data: any
): { success: boolean; errors?: Record<string, string> } => {
  try {
    switch (step) {
      case 'accountBasics':
        accountBasicsSchema.parse(data);
        break;
      case 'goals':
        goalsSchema.parse(data);
        break;
      case 'healthMetrics':
        healthMetricsSchema.parse(data);
        break;
      case 'activityLevel':
        activityLevelSchema.parse(data);
        break;
      case 'preferences':
        preferencesSchema.parse(data);
        break;
      case 'partners':
        partnersSchema.parse(data);
        break;
      default:
        return { success: false, errors: { general: 'Invalid step' } };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation error' } };
  }
};