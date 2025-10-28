import { db } from '../../db/connection';
import { plans, userSettings, initialPlanSnapshot, SelectUserSettings } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { scienceService } from '../../services/science';
import { startOfWeek, endOfWeek, subDays, format } from 'date-fns';
import type {
  PlanGenerationResponse,
  ComputedTargets,
  WhyItWorks,
  ScienceInputs,
  PrimaryGoalValue,
  ActivityLevelValue,
  GenderValue,
} from '@gtsd/shared-types';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('plans-service');

/**
 * Result of user recomputation
 */
export interface RecomputeResult {
  success: boolean;
  updated: boolean;
  previousCalories?: number;
  newCalories?: number;
  previousProtein?: number;
  newProtein?: number;
  reason?: string;
}

/**
 * Plans service for generating and managing weekly plans
 * Handles plan generation, target computation, and weekly recomputation
 */
export class PlansService {
  /**
   * Generate a weekly plan for a user
   *
   * @param userId - User ID to generate plan for
   * @param forceRecompute - Force recomputation even if recent plan exists
   * @returns Plan generation response with targets and educational content
   * @throws {AppError} If user settings not found or onboarding incomplete
   *
   * @remarks
   * - Checks for existing plan within last 7 days
   * - Computes all health targets using ScienceService
   * - Updates user_settings with new BMR/TDEE/targets
   * - Updates initial_plan_snapshot with projection
   * - Creates new plan in plans table
   * - Performance target: p95 < 300ms
   * - Logs without PII (userId only)
   */
  async generatePlan(userId: number, forceRecompute = false): Promise<PlanGenerationResponse> {
    const span = tracer.startSpan('plans.generate_plan');
    const startTime = performance.now();

    try {
      span.setAttributes({
        'user.id': userId,
        'plan.force_recompute': forceRecompute,
      });

      logger.info({ userId, forceRecompute }, 'Generating weekly plan');

      // 1. Check if user has settings and onboarding completed
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!settings) {
        throw new AppError(404, 'User settings not found');
      }

      if (!settings.onboardingCompleted) {
        throw new AppError(400, 'Please complete onboarding before generating a plan');
      }

      span.addEvent('settings_validated');

      // 2. Check for recent plan (within last 7 days)
      if (!forceRecompute) {
        const sevenDaysAgo = subDays(new Date(), 7);

        const [recentPlan] = await db
          .select()
          .from(plans)
          .where(sql`${plans.userId} = ${userId} AND ${plans.startDate} >= ${sevenDaysAgo}`)
          .orderBy(desc(plans.createdAt))
          .limit(1);

        if (recentPlan) {
          logger.info(
            { userId, planId: recentPlan.id, planStartDate: recentPlan.startDate },
            'Returning existing recent plan'
          );

          // Get current targets from settings
          const currentTargets: ComputedTargets = {
            bmr: settings.bmr || 0,
            tdee: settings.tdee || 0,
            calorieTarget: settings.calorieTarget || 0,
            proteinTarget: settings.proteinTarget || 0,
            waterTarget: settings.waterTarget || 0,
            weeklyRate: 0, // Will be calculated from goal
          };

          // Calculate weekly rate from goal
          const primaryGoal = settings.primaryGoal as PrimaryGoalValue;
          if (primaryGoal) {
            currentTargets.weeklyRate = scienceService.calculateWeeklyRate(primaryGoal);
          }

          // Get WhyItWorks explanation
          const scienceInputs = this.buildScienceInputs(settings);
          const whyItWorks = scienceService.getWhyItWorksExplanation(currentTargets, scienceInputs);

          const duration = performance.now() - startTime;
          span.setAttributes({ 'response.time_ms': duration });
          span.setStatus({ code: SpanStatusCode.OK });

          return {
            plan: {
              id: recentPlan.id,
              userId: recentPlan.userId,
              name: recentPlan.name,
              description: recentPlan.description || '',
              startDate: recentPlan.startDate,
              endDate: recentPlan.endDate,
              status: recentPlan.status,
            },
            targets: currentTargets,
            whyItWorks,
            recomputed: false,
          };
        }
      }

      span.addEvent('no_recent_plan_or_force_recompute');

      // 3. Compute all targets using ScienceService
      const previousTargets: ComputedTargets | undefined = settings.calorieTarget
        ? {
            bmr: settings.bmr || 0,
            tdee: settings.tdee || 0,
            calorieTarget: settings.calorieTarget || 0,
            proteinTarget: settings.proteinTarget || 0,
            waterTarget: settings.waterTarget || 0,
            weeklyRate: 0,
          }
        : undefined;

      const newTargets = await scienceService.computeAllTargets(userId);

      span.addEvent('targets_computed');

      // Prepare values before transaction
      const currentWeight = settings.currentWeight
        ? parseFloat(settings.currentWeight.toString())
        : 0;
      const snapshotTargetWeight = settings.targetWeight
        ? parseFloat(settings.targetWeight.toString())
        : currentWeight;

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday
      const weekLabel = format(weekStart, 'MMM d, yyyy');

      const scienceInputs = this.buildScienceInputs(settings);
      const whyItWorks = scienceService.getWhyItWorksExplanation(newTargets, scienceInputs);
      const description = this.buildPlanDescription(whyItWorks, newTargets);

      // 4-6. Execute all database updates in a transaction for data consistency
      const newPlan = await db.transaction(async (tx) => {
        // 4. Update user_settings with new targets
        await tx
          .update(userSettings)
          .set({
            bmr: newTargets.bmr,
            tdee: newTargets.tdee,
            calorieTarget: newTargets.calorieTarget,
            proteinTarget: newTargets.proteinTarget,
            waterTarget: newTargets.waterTarget,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId));

        span.addEvent('settings_updated');

        // 5. Update or create initial_plan_snapshot
        await tx
          .insert(initialPlanSnapshot)
          .values({
            userId,
            startWeight: currentWeight.toString(),
            targetWeight: snapshotTargetWeight.toString(),
            startDate: new Date(),
            targetDate: newTargets.projectedDate || new Date(),
            weeklyWeightChangeRate: newTargets.weeklyRate.toString(),
            estimatedWeeks: newTargets.estimatedWeeks || null,
            projectedCompletionDate: newTargets.projectedDate || null,
            calorieTarget: newTargets.calorieTarget,
            proteinTarget: newTargets.proteinTarget,
            waterTarget: newTargets.waterTarget,
            primaryGoal: settings.primaryGoal || 'maintain',
            activityLevel: settings.activityLevel || 'sedentary',
          })
          .onConflictDoUpdate({
            target: initialPlanSnapshot.userId,
            set: {
              targetWeight: snapshotTargetWeight.toString(),
              weeklyWeightChangeRate: newTargets.weeklyRate.toString(),
              estimatedWeeks: newTargets.estimatedWeeks || null,
              projectedCompletionDate: newTargets.projectedDate || null,
              calorieTarget: newTargets.calorieTarget,
              proteinTarget: newTargets.proteinTarget,
              waterTarget: newTargets.waterTarget,
              primaryGoal: settings.primaryGoal || 'maintain',
              activityLevel: settings.activityLevel || 'sedentary',
            },
          });

        span.addEvent('snapshot_updated');

        // 6. Create new plan in plans table
        const [plan] = await tx
          .insert(plans)
          .values({
            userId,
            name: `Weekly Plan - week of ${weekLabel}`,
            description,
            planType: 'weekly',
            startDate: weekStart,
            endDate: weekEnd,
            status: 'active',
            totalTasks: 0,
            completedTasks: 0,
            completionPercentage: '0',
          })
          .returning();

        return plan;
      });

      span.addEvent('plan_created');

      const duration = performance.now() - startTime;

      span.setAttributes({
        'plan.id': newPlan.id,
        'plan.start_date': newPlan.startDate.toISOString(),
        'plan.end_date': newPlan.endDate.toISOString(),
        'targets.calories': newTargets.calorieTarget,
        'targets.protein': newTargets.proteinTarget,
        'response.time_ms': duration,
      });

      logger.info(
        {
          userId,
          planId: newPlan.id,
          calories: newTargets.calorieTarget,
          protein: newTargets.proteinTarget,
          recomputed: forceRecompute,
          durationMs: Math.round(duration),
        },
        'Plan generated successfully'
      );

      // Warn if exceeds p95 target
      if (duration > 300) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 300 },
          'Plan generation exceeded p95 target'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });

      return {
        plan: {
          id: newPlan.id,
          userId: newPlan.userId,
          name: newPlan.name,
          description: newPlan.description || '',
          startDate: newPlan.startDate,
          endDate: newPlan.endDate,
          status: newPlan.status,
        },
        targets: newTargets,
        whyItWorks,
        recomputed: forceRecompute,
        previousTargets: forceRecompute ? previousTargets : undefined,
      };
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
        'Error generating plan'
      );

      // Re-throw AppError as-is, wrap others
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to generate plan. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Recompute targets for a user and update if changed significantly
   *
   * @param userId - User ID to recompute for
   * @returns Recompute result with update status and changes
   *
   * @remarks
   * - Fetches current user_settings
   * - Computes new targets using ScienceService
   * - Compares with current targets
   * - Updates if changed by >50 calories OR >10g protein OR weight changed
   * - Logs changes without PII
   */
  async recomputeForUser(userId: number): Promise<RecomputeResult> {
    const span = tracer.startSpan('plans.recompute_for_user');

    try {
      span.setAttributes({ 'user.id': userId });

      logger.info({ userId }, 'Recomputing targets for user');

      // 1. Fetch current user_settings
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!settings || !settings.onboardingCompleted) {
        return {
          success: true,
          updated: false,
          reason: 'User has no settings or onboarding not completed',
        };
      }

      // Store previous values
      const previousCalories = settings.calorieTarget || 0;
      const previousProtein = settings.proteinTarget || 0;

      // 2. Compute new targets
      const newTargets = await scienceService.computeAllTargets(userId);

      span.addEvent('targets_computed');

      // 3. Compare with current targets
      const caloriesDiff = Math.abs(newTargets.calorieTarget - previousCalories);
      const proteinDiff = Math.abs(newTargets.proteinTarget - previousProtein);

      // Check if changes are significant
      const shouldUpdate = caloriesDiff > 50 || proteinDiff > 10;

      if (!shouldUpdate) {
        logger.info({ userId, caloriesDiff, proteinDiff }, 'No significant changes in targets');

        span.setStatus({ code: SpanStatusCode.OK });
        return {
          success: true,
          updated: false,
        };
      }

      // 4. Update user_settings
      await db
        .update(userSettings)
        .set({
          bmr: newTargets.bmr,
          tdee: newTargets.tdee,
          calorieTarget: newTargets.calorieTarget,
          proteinTarget: newTargets.proteinTarget,
          waterTarget: newTargets.waterTarget,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));

      span.addEvent('settings_updated');

      // 5. Update initial_plan_snapshot
      await db
        .update(initialPlanSnapshot)
        .set({
          weeklyWeightChangeRate: newTargets.weeklyRate.toString(),
          estimatedWeeks: newTargets.estimatedWeeks || null,
          projectedCompletionDate: newTargets.projectedDate || null,
          calorieTarget: newTargets.calorieTarget,
          proteinTarget: newTargets.proteinTarget,
          waterTarget: newTargets.waterTarget,
        })
        .where(eq(initialPlanSnapshot.userId, userId));

      span.addEvent('snapshot_updated');

      // 6. Build reason string
      const reasons: string[] = [];
      if (caloriesDiff > 50) {
        reasons.push(`calories changed by ${caloriesDiff}kcal`);
      }
      if (proteinDiff > 10) {
        reasons.push(`protein changed by ${proteinDiff}g`);
      }

      const reason = reasons.join(', ');

      logger.info(
        {
          userId,
          previousCalories,
          newCalories: newTargets.calorieTarget,
          previousProtein,
          newProtein: newTargets.proteinTarget,
          reason,
        },
        'User targets updated during recompute'
      );

      span.setAttributes({
        'recompute.calories_diff': caloriesDiff,
        'recompute.protein_diff': proteinDiff,
        'recompute.updated': true,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      return {
        success: true,
        updated: true,
        previousCalories,
        newCalories: newTargets.calorieTarget,
        previousProtein,
        newProtein: newTargets.proteinTarget,
        reason,
      };
    } catch (error) {
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
        },
        'Error recomputing targets for user'
      );

      return {
        success: false,
        updated: false,
        reason: errorMessage,
      };
    } finally {
      span.end();
    }
  }

  /**
   * Build science inputs from user settings
   * @private
   */
  private buildScienceInputs(settings: SelectUserSettings): ScienceInputs {
    const weight = settings.currentWeight ? parseFloat(settings.currentWeight.toString()) : 0;
    const height = settings.height ? parseFloat(settings.height.toString()) : 0;
    const targetWeight = settings.targetWeight
      ? parseFloat(settings.targetWeight.toString())
      : undefined;

    // Calculate age from date of birth
    const age = settings.dateOfBirth ? this.calculateAge(settings.dateOfBirth) : 0;

    return {
      weight,
      height,
      age,
      gender: (settings.gender as GenderValue) || 'other',
      activityLevel: (settings.activityLevel as ActivityLevelValue) || 'sedentary',
      primaryGoal: (settings.primaryGoal as PrimaryGoalValue) || 'maintain',
      targetWeight,
    };
  }

  /**
   * Calculate age from date of birth
   * @private
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

  /**
   * Build plan description from WhyItWorks explanation
   * @private
   */
  private buildPlanDescription(whyItWorks: WhyItWorks, targets: ComputedTargets): string {
    const parts: string[] = [];

    // Add calorie target explanation
    parts.push(whyItWorks.calorieTarget.explanation);

    // Add protein explanation
    parts.push(`You'll consume ${targets.proteinTarget}g of protein daily to support your goals.`);

    // Add hydration target
    parts.push(`Stay hydrated with ${targets.waterTarget}ml of water throughout the day.`);

    return parts.join(' ');
  }
}
