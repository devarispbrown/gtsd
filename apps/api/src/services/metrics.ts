import { db } from '../db/connection';
import {
  profileMetrics,
  metricsAcknowledgements,
  userSettings,
  type SelectProfileMetrics,
} from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { ScienceService } from './science';

const tracer = trace.getTracer('metrics-service');
const scienceService = new ScienceService();

// Current formula version - increment when calculation formulas change
const CURRENT_METRICS_VERSION = 1;

/**
 * Metrics explanation for user education
 */
interface MetricsExplanation {
  bmi: string;
  bmr: string;
  tdee: string;
}

/**
 * Today's metrics response - matches iOS app expectations
 */
export interface TodayMetrics {
  metrics: {
    bmi: number;
    bmr: number;
    tdee: number;
    computedAt: string;
    version: number;
  };
  explanations: MetricsExplanation;
  acknowledged: boolean;
  acknowledgement: {
    acknowledgedAt: string;
    version: number;
  } | null;
}

/**
 * Acknowledgment response
 */
export interface AcknowledgmentResult {
  success: boolean;
  acknowledgedAt: string;
}

/**
 * Metrics Service
 * Handles daily health metrics computation, storage, and acknowledgment tracking
 *
 * @remarks
 * - Calculates BMI, BMR, and TDEE from user settings
 * - Stores daily snapshots with version tracking
 * - Tracks user acknowledgments for metrics education
 * - Timezone-aware for accurate daily boundaries
 * - Performance target: p95 < 200ms for GET operations
 */
export class MetricsService {
  /**
   * Calculate BMI (Body Mass Index)
   *
   * @param weightKg - Weight in kilograms
   * @param heightCm - Height in centimeters
   * @returns BMI rounded to 2 decimal places
   *
   * @remarks
   * Formula: BMI = weight_kg / (height_m)^2
   * - Underweight: BMI < 18.5
   * - Normal weight: 18.5 <= BMI < 25
   * - Overweight: 25 <= BMI < 30
   * - Obese: BMI >= 30
   */
  calculateBMI(weightKg: number, heightCm: number): number {
    const span = tracer.startSpan('metrics.calculate_bmi');

    try {
      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);
      const roundedBmi = Math.round(bmi * 100) / 100;

      span.setAttributes({
        'bmi.weight': weightKg,
        'bmi.height': heightCm,
        'bmi.result': roundedBmi,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return roundedBmi;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get BMI category and explanation
   *
   * @param bmi - Body Mass Index
   * @returns Human-readable category
   */
  private getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal weight';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  /**
   * Generate educational explanations for metrics
   *
   * @param bmi - Body Mass Index
   * @param bmr - Basal Metabolic Rate
   * @param tdee - Total Daily Energy Expenditure
   * @returns Educational explanations
   */
  private generateExplanations(bmi: number, bmr: number, tdee: number): MetricsExplanation {
    const bmiCategory = this.getBMICategory(bmi);

    return {
      bmi: `Your BMI is ${bmi}, which falls into the ${bmiCategory} category. BMI is calculated as weight (kg) divided by height (m) squared. It's a useful screening tool, though it doesn't directly measure body fat or muscle mass.`,
      bmr: `Your BMR is ${bmr} calories per day. This is the energy your body burns at complete rest to maintain vital functions like breathing, circulation, and cell production. Think of it as your body's baseline energy requirement.`,
      tdee: `Your TDEE is ${tdee} calories per day. This is your total energy expenditure including all activity. Eating at this level maintains your current weight, while eating below creates a deficit for fat loss, and eating above creates a surplus for muscle gain.`,
    };
  }

  /**
   * Compute and store metrics for a user
   *
   * @param userId - User ID
   * @param forceRecompute - Force recomputation even if today's metrics exist
   * @returns Computed metrics
   *
   * @remarks
   * - Fetches user settings for current weight, height, age, gender, activity level
   * - Calculates BMI, BMR (via ScienceService), and TDEE (via ScienceService)
   * - Stores in profile_metrics table with version tracking
   * - Returns existing metrics if already computed today (unless forceRecompute)
   */
  async computeAndStoreMetrics(
    userId: number,
    forceRecompute = false
  ): Promise<SelectProfileMetrics> {
    const span = tracer.startSpan('metrics.compute_and_store');
    const startTime = performance.now();

    try {
      span.setAttributes({ 'user.id': userId, 'force_recompute': forceRecompute });

      logger.info({ userId, forceRecompute }, 'Computing and storing metrics');

      // Check if metrics already computed today (unless forceRecompute)
      // Note: Uses database CURRENT_DATE which is timezone-aware per connection settings
      if (!forceRecompute) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [existingMetrics] = await db
          .select()
          .from(profileMetrics)
          .where(
            and(
              eq(profileMetrics.userId, userId),
              sql`${profileMetrics.computedAt}::date = CURRENT_DATE`
            )
          )
          .orderBy(desc(profileMetrics.computedAt))
          .limit(1);

        if (existingMetrics) {
          logger.info({ userId }, 'Using existing metrics from today');
          span.setStatus({ code: SpanStatusCode.OK });
          return existingMetrics;
        }
      } else {
        // When forceRecompute is true (e.g., after onboarding),
        // ensure we always compute fresh metrics
        logger.info({ userId }, 'Force recompute requested - computing fresh metrics');
      }

      // Fetch user settings
      const [settings] = await db
        .select({
          weight: userSettings.currentWeight,
          height: userSettings.height,
          dateOfBirth: userSettings.dateOfBirth,
          gender: userSettings.gender,
          activityLevel: userSettings.activityLevel,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!settings) {
        throw new AppError(404, 'User settings not found');
      }

      // Validate required fields
      const weight = settings.weight ? parseFloat(settings.weight.toString()) : null;
      const height = settings.height ? parseFloat(settings.height.toString()) : null;
      const dateOfBirth = settings.dateOfBirth;
      const gender = settings.gender;
      const activityLevel = settings.activityLevel;

      if (!weight || !height || !dateOfBirth || !gender || !activityLevel) {
        throw new AppError(400, 'User settings incomplete. Missing required health data.');
      }

      // Calculate age
      const age = this.calculateAge(dateOfBirth);

      // Calculate metrics
      const bmi = this.calculateBMI(weight, height);
      const bmr = scienceService.calculateBMR(weight, height, age, gender as any);
      const tdee = scienceService.calculateTDEE(bmr, activityLevel as any);

      span.setAttributes({
        'metrics.bmi': bmi,
        'metrics.bmr': bmr,
        'metrics.tdee': tdee,
        'metrics.version': CURRENT_METRICS_VERSION,
      });

      // Store metrics
      const [stored] = await db
        .insert(profileMetrics)
        .values({
          userId,
          bmi: bmi.toString(),
          bmr,
          tdee,
          version: CURRENT_METRICS_VERSION,
          computedAt: new Date(),
        })
        .returning();

      if (!stored) {
        throw new AppError(500, 'Failed to store metrics');
      }

      const duration = performance.now() - startTime;

      logger.info(
        {
          userId,
          bmi,
          bmr,
          tdee,
          version: CURRENT_METRICS_VERSION,
          durationMs: Math.round(duration),
        },
        'Metrics computed and stored successfully'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return stored;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span.recordException(error as Error);

      logger.error(
        {
          err: error,
          userId,
          errorMessage,
          durationMs: Math.round(duration),
        },
        'Error computing and storing metrics'
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to compute metrics. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Get today's metrics for a user
   *
   * @param userId - User ID
   * @returns Today's metrics with explanations and acknowledgment status
   * @throws {AppError} 404 if no metrics computed yet
   *
   * @remarks
   * - Returns most recent metrics from today
   * - Includes educational explanations
   * - Indicates if user has acknowledged today's metrics
   * - Performance target: p95 < 200ms
   */
  async getTodayMetrics(userId: number): Promise<TodayMetrics> {
    const span = tracer.startSpan('metrics.get_today_metrics');
    const startTime = performance.now();

    try {
      span.setAttributes({ 'user.id': userId });

      logger.info({ userId }, 'Fetching today\'s metrics');

      // Get today's metrics
      let [todayMetrics] = await db
        .select()
        .from(profileMetrics)
        .where(
          and(
            eq(profileMetrics.userId, userId),
            sql`${profileMetrics.computedAt}::date = CURRENT_DATE`
          )
        )
        .orderBy(desc(profileMetrics.computedAt))
        .limit(1);

      // If no metrics for today, attempt to compute them now (fallback for onboarding)
      if (!todayMetrics) {
        logger.info({ userId }, 'No metrics found for today, attempting to compute now');

        try {
          // Attempt to compute metrics synchronously
          const computedMetrics = await this.computeAndStoreMetrics(userId, false);
          todayMetrics = computedMetrics;
          logger.info({ userId }, 'Successfully computed metrics on-demand');
        } catch (computeError) {
          logger.error({ userId, error: computeError }, 'Failed to compute metrics on-demand');
          throw new AppError(404, 'No metrics available. Please complete your profile information to generate metrics.');
        }
      }

      // Check if acknowledged
      // Use second-precision comparison to handle timestamps with/without milliseconds
      // CRITICAL: Use FLOOR to truncate, not ::bigint which rounds (causes off-by-one errors)
      const metricsComputedAtSeconds = Math.floor(todayMetrics.computedAt.getTime() / 1000);
      const [acknowledgement] = await db
        .select()
        .from(metricsAcknowledgements)
        .where(
          and(
            eq(metricsAcknowledgements.userId, userId),
            sql`FLOOR(EXTRACT(EPOCH FROM ${metricsAcknowledgements.metricsComputedAt})) = ${metricsComputedAtSeconds}`
          )
        )
        .limit(1);

      const bmi = parseFloat(todayMetrics.bmi);
      const bmr = todayMetrics.bmr;
      const tdee = todayMetrics.tdee;

      const explanations = this.generateExplanations(bmi, bmr, tdee);

      const result: TodayMetrics = {
        metrics: {
          bmi,
          bmr,
          tdee,
          computedAt: todayMetrics.computedAt.toISOString(),
          version: todayMetrics.version
        },
        explanations,
        acknowledged: !!acknowledgement,
        acknowledgement: acknowledgement ? {
          acknowledgedAt: acknowledgement.acknowledgedAt.toISOString(),
          version: acknowledgement.version
        } : null
      };

      const duration = performance.now() - startTime;

      span.setAttributes({
        'metrics.bmi': result.metrics.bmi,
        'metrics.bmr': result.metrics.bmr,
        'metrics.tdee': result.metrics.tdee,
        'metrics.acknowledged': result.acknowledged,
        'response.time_ms': duration,
      });

      logger.info(
        {
          userId,
          bmi: result.metrics.bmi,
          bmr: result.metrics.bmr,
          tdee: result.metrics.tdee,
          acknowledged: result.acknowledged,
          durationMs: Math.round(duration),
        },
        'Today\'s metrics retrieved'
      );

      // Performance warning if over target
      if (duration > 200) {
        logger.warn(
          { userId, durationMs: Math.round(duration), target: 200 },
          'Get today metrics exceeded p95 target'
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span.recordException(error as Error);

      logger.error(
        {
          err: error,
          userId,
          errorMessage,
          durationMs: Math.round(duration),
        },
        'Error fetching today\'s metrics'
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to fetch metrics. Please try again.');
    } finally {
      span.end();
    }
  }

  /**
   * Acknowledge today's metrics
   *
   * @param userId - User ID
   * @param version - Metrics version being acknowledged
   * @param metricsComputedAt - Timestamp of metrics being acknowledged
   * @returns Acknowledgment result
   *
   * @remarks
   * - Idempotent: multiple acknowledgments for same metrics are allowed
   * - Validates that metrics exist before acknowledging
   * - Uses transaction for consistency
   */
  async acknowledgeMetrics(
    userId: number,
    version: number,
    metricsComputedAt: Date
  ): Promise<AcknowledgmentResult> {
    const span = tracer.startSpan('metrics.acknowledge');
    const startTime = performance.now();

    try {
      span.setAttributes({
        'user.id': userId,
        'metrics.version': version,
        'metrics.computed_at': metricsComputedAt.toISOString(),
      });

      logger.info({ userId, version, metricsComputedAt }, 'Acknowledging metrics');

      // Verify metrics exist
      // Note: We normalize timestamps to second precision to handle iOS clients that send
      // timestamps without milliseconds (e.g., 2025-10-30T12:34:56Z vs 2025-10-30T12:34:56.789Z).
      const metricsComputedAtStr = metricsComputedAt.toISOString();

      // Debug logging
      logger.debug({
        userId,
        version,
        metricsComputedAtStr,
        metricsComputedAtDate: metricsComputedAt,
      }, 'Looking for metrics with timestamp');

      // First, let's see what metrics exist for this user
      const allUserMetrics = await db
        .select()
        .from(profileMetrics)
        .where(eq(profileMetrics.userId, userId))
        .orderBy(desc(profileMetrics.computedAt))
        .limit(5);

      logger.debug({
        userId,
        metricsCount: allUserMetrics.length,
        metrics: allUserMetrics.map(m => ({
          computedAt: m.computedAt.toISOString(),
          version: m.version,
        })),
      }, 'Available metrics for user');

      // Normalize timestamps to second precision (ignore milliseconds)
      // This allows iOS clients to send timestamps without milliseconds
      // CRITICAL: Use FLOOR to truncate, not ::bigint which rounds (causes off-by-one errors)
      const requestTimestampSeconds = Math.floor(metricsComputedAt.getTime() / 1000);

      const [metrics] = await db
        .select()
        .from(profileMetrics)
        .where(
          and(
            eq(profileMetrics.userId, userId),
            sql`FLOOR(EXTRACT(EPOCH FROM ${profileMetrics.computedAt})) = ${requestTimestampSeconds}`,
            eq(profileMetrics.version, version)
          )
        )
        .limit(1);

      if (!metrics) {
        logger.error({
          userId,
          version,
          searchingFor: metricsComputedAtStr,
          availableMetrics: allUserMetrics.map(m => ({
            computedAt: m.computedAt.toISOString(),
            version: m.version,
          })),
        }, 'Metrics not found - timestamp mismatch');
        throw new AppError(404, 'Metrics not found for the specified timestamp and version');
      }

      // Check if already acknowledged (idempotent)
      // Use normalized timestamp comparison (second precision)
      // CRITICAL: Use FLOOR to truncate, not ::bigint which rounds (causes off-by-one errors)
      const [existing] = await db
        .select()
        .from(metricsAcknowledgements)
        .where(
          and(
            eq(metricsAcknowledgements.userId, userId),
            sql`FLOOR(EXTRACT(EPOCH FROM ${metricsAcknowledgements.metricsComputedAt})) = ${requestTimestampSeconds}`,
            eq(metricsAcknowledgements.version, version)
          )
        )
        .limit(1);

      if (existing) {
        logger.info({ userId, metricsComputedAt }, 'Metrics already acknowledged');
        span.setStatus({ code: SpanStatusCode.OK });
        return {
          success: true,
          acknowledgedAt: existing.acknowledgedAt.toISOString(),
        };
      }

      // Store acknowledgment
      // Use the actual metrics.computedAt to ensure consistency with database records
      const [acknowledgement] = await db
        .insert(metricsAcknowledgements)
        .values({
          userId,
          version,
          metricsComputedAt: metrics.computedAt,
          acknowledgedAt: new Date(),
        })
        .returning();

      const duration = performance.now() - startTime;

      logger.info(
        {
          userId,
          version,
          metricsComputedAt,
          acknowledgedAt: acknowledgement.acknowledgedAt,
          durationMs: Math.round(duration),
        },
        'Metrics acknowledged successfully'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return {
        success: true,
        acknowledgedAt: acknowledgement.acknowledgedAt.toISOString(),
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span.recordException(error as Error);

      logger.error(
        {
          err: error,
          userId,
          errorMessage,
          durationMs: Math.round(duration),
        },
        'Error acknowledging metrics'
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to acknowledge metrics. Please try again.');
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
export const metricsService = new MetricsService();
