import { db } from '../db/connection';
import { profileChangeAudit, SelectProfileChangeAudit } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '../config/logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('profile-audit-service');

/**
 * Metadata for audit logging
 */
export interface AuditMetadata {
  ip?: string;
  userAgent?: string;
  triggeredPlanRegeneration?: boolean;
  caloriesBefore?: number;
  caloriesAfter?: number;
  proteinBefore?: number;
  proteinAfter?: number;
}

/**
 * Service for tracking profile changes in audit log
 *
 * Provides methods to log changes, retrieve change history, and query
 * specific field changes for debugging and compliance purposes.
 */
export const profileAuditService = {
  /**
   * Log a single field change to the audit trail
   *
   * @param userId - User ID who made the change
   * @param fieldName - Name of the field that changed
   * @param oldValue - Previous value (converted to string)
   * @param newValue - New value (converted to string)
   * @param metadata - Additional context (IP, user agent, plan impact)
   *
   * @example
   * await profileAuditService.logChange(
   *   123,
   *   'currentWeight',
   *   '85.0',
   *   '82.5',
   *   { ip: '127.0.0.1', triggeredPlanRegeneration: true }
   * );
   */
  async logChange(
    userId: number,
    fieldName: string,
    oldValue: any,
    newValue: any,
    metadata: AuditMetadata = {}
  ): Promise<void> {
    const span = tracer.startSpan('profile_audit.log_change');

    try {
      span.setAttributes({
        'user.id': userId,
        'field.name': fieldName,
        'plan.regenerated': metadata.triggeredPlanRegeneration || false,
      });

      // Convert values to strings for storage
      const oldValueStr = oldValue !== undefined && oldValue !== null ? String(oldValue) : null;
      const newValueStr = newValue !== undefined && newValue !== null ? String(newValue) : null;

      // Insert audit record
      await db.insert(profileChangeAudit).values({
        userId,
        fieldName,
        oldValue: oldValueStr,
        newValue: newValueStr,
        ipAddress: metadata.ip || null,
        userAgent: metadata.userAgent || null,
        triggeredPlanRegeneration: metadata.triggeredPlanRegeneration || false,
        caloriesBefore: metadata.caloriesBefore || null,
        caloriesAfter: metadata.caloriesAfter || null,
        proteinBefore: metadata.proteinBefore || null,
        proteinAfter: metadata.proteinAfter || null,
      });

      span.addEvent('audit_record_created');

      logger.info(
        {
          userId,
          fieldName,
          triggeredPlanRegeneration: metadata.triggeredPlanRegeneration,
        },
        'Profile change logged to audit trail'
      );

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      // Log error but don't throw - audit failure shouldn't block profile update
      logger.error(
        {
          err: error,
          userId,
          fieldName,
          errorMessage,
        },
        'Failed to log profile change to audit trail'
      );
    } finally {
      span.end();
    }
  },

  /**
   * Log multiple field changes in batch (more efficient)
   *
   * @param userId - User ID who made the changes
   * @param changes - Array of field changes to log
   * @param metadata - Common metadata applied to all changes
   *
   * @example
   * await profileAuditService.logChanges(123, [
   *   { fieldName: 'currentWeight', oldValue: '85.0', newValue: '82.5' },
   *   { fieldName: 'targetWeight', oldValue: '75.0', newValue: '70.0' }
   * ], { ip: '127.0.0.1' });
   */
  async logChanges(
    userId: number,
    changes: Array<{ fieldName: string; oldValue: any; newValue: any }>,
    metadata: AuditMetadata = {}
  ): Promise<void> {
    const span = tracer.startSpan('profile_audit.log_changes');

    try {
      span.setAttributes({
        'user.id': userId,
        'changes.count': changes.length,
        'plan.regenerated': metadata.triggeredPlanRegeneration || false,
      });

      if (changes.length === 0) {
        logger.debug({ userId }, 'No changes to log');
        span.setStatus({ code: SpanStatusCode.OK });
        return;
      }

      // Prepare batch insert values
      const values = changes.map((change) => ({
        userId,
        fieldName: change.fieldName,
        oldValue:
          change.oldValue !== undefined && change.oldValue !== null
            ? String(change.oldValue)
            : null,
        newValue:
          change.newValue !== undefined && change.newValue !== null
            ? String(change.newValue)
            : null,
        ipAddress: metadata.ip || null,
        userAgent: metadata.userAgent || null,
        triggeredPlanRegeneration: metadata.triggeredPlanRegeneration || false,
        caloriesBefore: metadata.caloriesBefore || null,
        caloriesAfter: metadata.caloriesAfter || null,
        proteinBefore: metadata.proteinBefore || null,
        proteinAfter: metadata.proteinAfter || null,
      }));

      // Batch insert
      await db.insert(profileChangeAudit).values(values);

      span.addEvent('audit_records_created');

      logger.info(
        {
          userId,
          changeCount: changes.length,
          fields: changes.map((c) => c.fieldName),
          triggeredPlanRegeneration: metadata.triggeredPlanRegeneration,
        },
        'Profile changes logged to audit trail'
      );

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      // Log error but don't throw
      logger.error(
        {
          err: error,
          userId,
          changeCount: changes.length,
          errorMessage,
        },
        'Failed to log profile changes to audit trail'
      );
    } finally {
      span.end();
    }
  },

  /**
   * Get change history for a user (most recent first)
   *
   * @param userId - User ID to get history for
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Array of audit records
   *
   * @example
   * const history = await profileAuditService.getChangeHistory(123, 20);
   * console.log(`User made ${history.length} changes`);
   */
  async getChangeHistory(userId: number, limit = 50): Promise<SelectProfileChangeAudit[]> {
    const span = tracer.startSpan('profile_audit.get_change_history');

    try {
      span.setAttributes({
        'user.id': userId,
        'query.limit': limit,
      });

      const records = await db
        .select()
        .from(profileChangeAudit)
        .where(eq(profileChangeAudit.userId, userId))
        .orderBy(desc(profileChangeAudit.changedAt))
        .limit(limit);

      span.setAttributes({
        'records.count': records.length,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      return records;
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
          limit,
          errorMessage,
        },
        'Failed to retrieve profile change history'
      );

      // Return empty array on error
      return [];
    } finally {
      span.end();
    }
  },

  /**
   * Get change history for a specific field
   *
   * @param userId - User ID to get history for
   * @param fieldName - Specific field to filter by
   * @returns Array of audit records for that field
   *
   * @example
   * const weightHistory = await profileAuditService.getFieldHistory(123, 'currentWeight');
   * console.log(`Weight changed ${weightHistory.length} times`);
   */
  async getFieldHistory(userId: number, fieldName: string): Promise<SelectProfileChangeAudit[]> {
    const span = tracer.startSpan('profile_audit.get_field_history');

    try {
      span.setAttributes({
        'user.id': userId,
        'field.name': fieldName,
      });

      const records = await db
        .select()
        .from(profileChangeAudit)
        .where(
          and(eq(profileChangeAudit.userId, userId), eq(profileChangeAudit.fieldName, fieldName))
        )
        .orderBy(desc(profileChangeAudit.changedAt));

      span.setAttributes({
        'records.count': records.length,
      });

      span.setStatus({ code: SpanStatusCode.OK });

      return records;
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
          fieldName,
          errorMessage,
        },
        'Failed to retrieve field change history'
      );

      // Return empty array on error
      return [];
    } finally {
      span.end();
    }
  },
};
