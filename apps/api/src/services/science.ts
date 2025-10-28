import { z } from 'zod';
import { db } from '../db/connection';
import { userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type {
  ScienceInputs,
  ComputedTargets,
  WhyItWorks,
  ActivityLevelValue,
  PrimaryGoalValue,
  GenderValue,
} from '@gtsd/shared-types';
import {
  ACTIVITY_MULTIPLIERS,
  PROTEIN_PER_KG,
  WEEKLY_RATES,
  WATER_ML_PER_KG,
  WEIGHT_LOSS_DEFICIT,
  MUSCLE_GAIN_SURPLUS,
  VALIDATION_RANGES,
  ACTIVITY_LEVELS,
  PRIMARY_GOALS,
  GENDERS,
} from '@gtsd/shared-types';

const tracer = trace.getTracer('science-service');

/**
 * Validation schema for science inputs
 * Uses validation ranges from shared-types for consistency
 */
const scienceInputsSchema = z.object({
  weight: z.number().min(VALIDATION_RANGES.weight.min).max(VALIDATION_RANGES.weight.max),
  height: z.number().min(VALIDATION_RANGES.height.min).max(VALIDATION_RANGES.height.max),
  age: z.number().int().min(VALIDATION_RANGES.age.min).max(VALIDATION_RANGES.age.max),
  gender: z.enum(GENDERS),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  primaryGoal: z.enum(PRIMARY_GOALS),
  targetWeight: z
    .number()
    .min(VALIDATION_RANGES.targetWeight.min)
    .max(VALIDATION_RANGES.targetWeight.max)
    .optional(),
});

/**
 * Comprehensive science service for BMR/TDEE calculations and plan generation
 * Implements Mifflin-St Jeor equation and evidence-based nutrition science
 */
export class ScienceService {
  /**
   * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
   * Industry standard for BMR calculation
   *
   * @param weight - Body weight in kg
   * @param height - Height in cm
   * @param age - Age in years
   * @param gender - Biological gender
   * @returns BMR in kcal/day (rounded to integer)
   *
   * @remarks
   * Formula: BMR = (10 × weight) + (6.25 × height) - (5 × age) + offset
   * - Men: offset = +5
   * - Women: offset = -161
   * - Other: average of both (-78)
   */
  calculateBMR(weight: number, height: number, age: number, gender: GenderValue): number {
    const span = tracer.startSpan('science.calculate_bmr');

    try {
      // Mifflin-St Jeor base calculation
      const baseBMR = 10 * weight + 6.25 * height - 5 * age;

      let genderOffset: number;
      switch (gender) {
        case 'male':
          genderOffset = 5;
          break;
        case 'female':
          genderOffset = -161;
          break;
        case 'other':
          // Average of male and female offsets
          genderOffset = (5 + -161) / 2;
          break;
      }

      const bmr = Math.round(baseBMR + genderOffset);

      span.setAttributes({
        'bmr.weight': weight,
        'bmr.height': height,
        'bmr.age': age,
        'bmr.gender': gender,
        'bmr.result': bmr,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return bmr;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Calculate Total Daily Energy Expenditure
   * Multiplies BMR by activity level factor
   *
   * @param bmr - Basal Metabolic Rate in kcal/day
   * @param activityLevel - User's activity level
   * @returns TDEE in kcal/day (rounded to integer)
   */
  calculateTDEE(bmr: number, activityLevel: ActivityLevelValue): number {
    const span = tracer.startSpan('science.calculate_tdee');

    try {
      const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
      const tdee = Math.round(bmr * multiplier);

      span.setAttributes({
        'tdee.bmr': bmr,
        'tdee.activity_level': activityLevel,
        'tdee.multiplier': multiplier,
        'tdee.result': tdee,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return tdee;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Calculate daily calorie target based on goal
   *
   * @param tdee - Total Daily Energy Expenditure in kcal/day
   * @param goal - User's primary goal
   * @returns Daily calorie target in kcal (rounded to integer)
   *
   * @remarks
   * - lose_weight: TDEE - 500 (safe deficit, ~0.5kg/week loss)
   * - gain_muscle: TDEE + 400 (controlled surplus for lean gains)
   * - maintain: TDEE (maintenance)
   * - improve_health: TDEE (maintenance)
   */
  calculateCalorieTarget(tdee: number, goal: PrimaryGoalValue): number {
    const span = tracer.startSpan('science.calculate_calorie_target');

    try {
      let calorieTarget: number;

      switch (goal) {
        case 'lose_weight':
          calorieTarget = Math.round(tdee - WEIGHT_LOSS_DEFICIT);
          break;
        case 'gain_muscle':
          calorieTarget = Math.round(tdee + MUSCLE_GAIN_SURPLUS);
          break;
        case 'maintain':
        case 'improve_health':
          calorieTarget = tdee;
          break;
      }

      span.setAttributes({
        'calorie_target.tdee': tdee,
        'calorie_target.goal': goal,
        'calorie_target.result': calorieTarget,
        'calorie_target.deficit': tdee - calorieTarget,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return calorieTarget;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Calculate daily protein target based on weight and goal
   *
   * @param weight - Body weight in kg
   * @param goal - User's primary goal
   * @returns Daily protein target in grams (rounded to integer)
   *
   * @remarks
   * - lose_weight: 2.2g/kg (preserve muscle during deficit)
   * - gain_muscle: 2.4g/kg (build muscle during surplus)
   * - maintain: 1.8g/kg (maintenance)
   * - improve_health: 1.8g/kg (general health)
   */
  calculateProteinTarget(weight: number, goal: PrimaryGoalValue): number {
    const span = tracer.startSpan('science.calculate_protein_target');

    try {
      const gramsPerKg = PROTEIN_PER_KG[goal];
      const proteinTarget = Math.round(weight * gramsPerKg);

      span.setAttributes({
        'protein_target.weight': weight,
        'protein_target.goal': goal,
        'protein_target.grams_per_kg': gramsPerKg,
        'protein_target.result': proteinTarget,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return proteinTarget;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Calculate daily water target based on body weight
   *
   * @param weight - Body weight in kg
   * @returns Daily water target in ml (rounded to nearest 100ml)
   *
   * @remarks
   * Standard recommendation: 35ml per kg of body weight
   * Rounded to nearest 100ml for practicality
   */
  calculateWaterTarget(weight: number): number {
    const span = tracer.startSpan('science.calculate_water_target');

    try {
      const mlPerKg = WATER_ML_PER_KG;
      const rawTarget = weight * mlPerKg;
      // Round to nearest 100ml for user-friendly targets
      const waterTarget = Math.round(rawTarget / 100) * 100;

      span.setAttributes({
        'water_target.weight': weight,
        'water_target.ml_per_kg': mlPerKg,
        'water_target.result': waterTarget,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return waterTarget;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Calculate expected weekly weight change rate
   *
   * @param goal - User's primary goal
   * @returns Weekly weight change in kg (negative for loss, positive for gain)
   *
   * @remarks
   * - lose_weight: -0.5 kg/week (safe fat loss)
   * - gain_muscle: 0.4 kg/week (lean bulk)
   * - maintain: 0 kg/week (no change)
   * - improve_health: 0 kg/week (no change)
   */
  calculateWeeklyRate(goal: PrimaryGoalValue): number {
    return WEEKLY_RATES[goal];
  }

  /**
   * Calculate timeline projection for reaching target weight
   *
   * @param currentWeight - Current weight in kg
   * @param targetWeight - Target weight in kg
   * @param weeklyRate - Expected weekly change in kg
   * @returns Projection with estimated weeks and completion date
   *
   * @remarks
   * Returns undefined values if weekly rate is 0 (maintenance goals)
   */
  calculateProjection(
    currentWeight: number,
    targetWeight: number,
    weeklyRate: number
  ):
    | { estimatedWeeks: number; projectedDate: Date }
    | { estimatedWeeks: undefined; projectedDate: undefined } {
    const span = tracer.startSpan('science.calculate_projection');

    try {
      // No projection for maintenance goals
      if (weeklyRate === 0) {
        span.setStatus({ code: SpanStatusCode.OK });
        return { estimatedWeeks: undefined, projectedDate: undefined };
      }

      const weightDifference = Math.abs(targetWeight - currentWeight);
      const estimatedWeeks = Math.ceil(weightDifference / Math.abs(weeklyRate));

      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + estimatedWeeks * 7);

      span.setAttributes({
        'projection.current_weight': currentWeight,
        'projection.target_weight': targetWeight,
        'projection.weekly_rate': weeklyRate,
        'projection.weight_difference': weightDifference,
        'projection.estimated_weeks': estimatedWeeks,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return { estimatedWeeks, projectedDate };
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Compute all health targets for a user
   * Main method that orchestrates all calculations
   *
   * @param userId - User ID
   * @returns Complete set of computed targets
   * @throws {AppError} If user or settings not found, or validation fails
   *
   * @remarks
   * - Fetches user settings from database
   * - Validates all inputs
   * - Calculates BMR, TDEE, calories, protein, water
   * - Calculates weight change projection
   * - Target performance: p95 < 300ms
   * - Logs calculations without PII (userId only)
   */
  async computeAllTargets(userId: number): Promise<ComputedTargets> {
    const span = tracer.startSpan('science.compute_all_targets');
    const startTime = performance.now();

    try {
      span.setAttributes({ 'user.id': userId });

      logger.info({ userId }, 'Computing all health targets');

      // Fetch user settings in single query
      const [settings] = await db
        .select({
          weight: userSettings.currentWeight,
          height: userSettings.height,
          dateOfBirth: userSettings.dateOfBirth,
          gender: userSettings.gender,
          activityLevel: userSettings.activityLevel,
          primaryGoal: userSettings.primaryGoal,
          targetWeight: userSettings.targetWeight,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      if (!settings) {
        throw new AppError(404, 'User settings not found');
      }

      // Extract and validate required fields
      const weight = settings.weight ? parseFloat(settings.weight.toString()) : null;
      const height = settings.height ? parseFloat(settings.height.toString()) : null;
      const targetWeight = settings.targetWeight
        ? parseFloat(settings.targetWeight.toString())
        : undefined;
      const dateOfBirth = settings.dateOfBirth;
      const gender = settings.gender as GenderValue | null;
      const activityLevel = settings.activityLevel as ActivityLevelValue | null;
      const primaryGoal = settings.primaryGoal as PrimaryGoalValue | null;

      // Validate required fields exist
      if (!weight || !height || !dateOfBirth || !gender || !activityLevel || !primaryGoal) {
        throw new AppError(400, 'User settings incomplete. Please complete onboarding.');
      }

      // Calculate age from date of birth
      const age = this.calculateAge(dateOfBirth);

      // Prepare inputs for validation
      const inputs: ScienceInputs = {
        weight,
        height,
        age,
        gender,
        activityLevel,
        primaryGoal,
        targetWeight,
      };

      // Validate all inputs
      const validationResult = scienceInputsSchema.safeParse(inputs);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        throw new AppError(400, `Invalid input parameters: ${errors.join(', ')}`);
      }

      // Calculate all targets in single pass
      const bmr = this.calculateBMR(weight, height, age, gender);
      const tdee = this.calculateTDEE(bmr, activityLevel);
      const calorieTarget = this.calculateCalorieTarget(tdee, primaryGoal);
      const proteinTarget = this.calculateProteinTarget(weight, primaryGoal);
      const waterTarget = this.calculateWaterTarget(weight);
      const weeklyRate = this.calculateWeeklyRate(primaryGoal);

      // Calculate projection if target weight is set
      const projection = targetWeight
        ? this.calculateProjection(weight, targetWeight, weeklyRate)
        : { estimatedWeeks: undefined, projectedDate: undefined };

      const targets: ComputedTargets = {
        bmr,
        tdee,
        calorieTarget,
        proteinTarget,
        waterTarget,
        weeklyRate,
        estimatedWeeks: projection.estimatedWeeks,
        projectedDate: projection.projectedDate,
      };

      const duration = performance.now() - startTime;

      span.setAttributes({
        'targets.bmr': bmr,
        'targets.tdee': tdee,
        'targets.calorie_target': calorieTarget,
        'targets.protein_target': proteinTarget,
        'targets.water_target': waterTarget,
        'targets.weekly_rate': weeklyRate,
        'performance.duration_ms': duration,
      });

      logger.info(
        {
          userId,
          bmr,
          tdee,
          calorieTarget,
          proteinTarget,
          waterTarget,
          weeklyRate,
          estimatedWeeks: projection.estimatedWeeks,
          durationMs: Math.round(duration),
        },
        'Health targets computed successfully'
      );

      // Performance warning if over target
      if (duration > 300) {
        logger.warn(
          { userId, durationMs: Math.round(duration) },
          'Target computation exceeded p95 threshold (300ms)'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return targets;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        {
          err: error,
          userId,
          errorMessage,
          durationMs: Math.round(duration),
        },
        'Error computing health targets'
      );

      // Re-throw AppError as-is, wrap others
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to compute health targets. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Generate educational explanation of why calculations work
   * Provides user-friendly science education
   *
   * @param targets - Computed targets to explain
   * @param inputs - Original science inputs
   * @returns Structured educational content
   */
  getWhyItWorksExplanation(targets: ComputedTargets, inputs: ScienceInputs): WhyItWorks {
    const span = tracer.startSpan('science.get_why_it_works');

    try {
      const activityMultiplier = ACTIVITY_MULTIPLIERS[inputs.activityLevel];
      const gramsPerKg = PROTEIN_PER_KG[inputs.primaryGoal];
      const mlPerKg = WATER_ML_PER_KG;
      const deficit = targets.tdee - targets.calorieTarget;

      const whyItWorks: WhyItWorks = {
        bmr: {
          title: 'Your Basal Metabolic Rate (BMR)',
          explanation: `Your BMR is ${targets.bmr} calories - the energy your body burns at complete rest just to keep you alive. This includes breathing, circulation, cell production, and nutrient processing. We calculate this using the Mifflin-St Jeor equation, the most accurate formula validated by modern research.`,
          formula: 'BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + gender offset',
        },
        tdee: {
          title: 'Your Total Daily Energy Expenditure (TDEE)',
          explanation: `Your TDEE is ${targets.tdee} calories - your total daily calorie burn including all activity. We multiply your BMR by ${activityMultiplier} to account for your ${inputs.activityLevel.replace('_', ' ')} lifestyle. This gives us your maintenance calories - eat this amount and your weight stays stable.`,
          activityMultiplier,
          metric: activityMultiplier,
        },
        calorieTarget: {
          title: 'Your Daily Calorie Target',
          explanation:
            deficit > 0
              ? `To ${inputs.primaryGoal.replace('_', ' ')}, you need a ${Math.abs(deficit)} calorie deficit. This creates a safe energy gap that forces your body to tap into fat stores. At this rate, you'll lose approximately ${Math.abs(targets.weeklyRate)} kg per week - sustainable and muscle-preserving.`
              : deficit < 0
                ? `To ${inputs.primaryGoal.replace('_', ' ')}, you need a ${Math.abs(deficit)} calorie surplus. This provides extra energy for muscle protein synthesis and recovery. At this rate, you'll gain approximately ${targets.weeklyRate} kg per week - mostly lean mass when paired with strength training.`
                : `To ${inputs.primaryGoal.replace('_', ' ')}, you'll eat at maintenance (${targets.calorieTarget} calories). This keeps your weight stable while you focus on body recomposition, performance, or general health improvements.`,
          deficit,
          metric: deficit,
        },
        proteinTarget: {
          title: 'Your Daily Protein Target',
          explanation: `You need ${targets.proteinTarget}g of protein daily (${gramsPerKg}g per kg of body weight). ${
            inputs.primaryGoal === 'lose_weight'
              ? 'During weight loss, high protein prevents muscle loss and keeps you feeling full. Your body needs this to maintain lean mass while in a deficit.'
              : inputs.primaryGoal === 'gain_muscle'
                ? 'For muscle building, protein provides amino acids needed for muscle protein synthesis. This higher intake supports recovery and new muscle growth.'
                : 'Adequate protein supports muscle maintenance, satiety, and overall health. It helps preserve lean mass and supports metabolic function.'
          }`,
          gramsPerKg,
          metric: gramsPerKg,
        },
        waterTarget: {
          title: 'Your Daily Hydration Target',
          explanation: `Aim for ${targets.waterTarget}ml of water daily (${mlPerKg}ml per kg). Proper hydration supports performance, recovery, appetite regulation, and metabolic function. Water helps transport nutrients, regulate temperature, and maintain energy levels throughout the day.`,
          mlPerKg,
          metric: mlPerKg,
        },
        timeline: {
          title: 'Your Projected Timeline',
          explanation: targets.estimatedWeeks
            ? `Based on a ${Math.abs(targets.weeklyRate)} kg per week rate, you'll reach your goal in approximately ${targets.estimatedWeeks} weeks. This timeline assumes consistent adherence to your calorie and protein targets. Progress isn't perfectly linear - expect some fluctuation week to week.`
            : `Since you're focused on ${inputs.primaryGoal.replace('_', ' ')}, there's no specific weight timeline. Focus on consistency with your daily habits and let your body adapt over time.`,
          weeklyRate: targets.weeklyRate,
          estimatedWeeks: targets.estimatedWeeks || 0,
          metric: targets.weeklyRate,
        },
      };

      span.setStatus({ code: SpanStatusCode.OK });
      return whyItWorks;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Calculate age from date of birth
   *
   * @param dateOfBirth - Date of birth
   * @returns Age in years
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }
}

/**
 * Singleton instance for reuse across the application
 */
export const scienceService = new ScienceService();
