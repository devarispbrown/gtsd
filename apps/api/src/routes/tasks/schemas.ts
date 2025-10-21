import { z } from 'zod';
import { TaskType, EvidenceType } from '@gtsd/shared-types';

/**
 * Task type enum for validation
 */
export const taskTypeEnum = z.nativeEnum(TaskType);

/**
 * Evidence type enum
 */
export const evidenceTypeEnum = z.nativeEnum(EvidenceType);

/**
 * Query parameters for GET /v1/tasks/today
 */
export const getTodayTasksQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .describe('Target date in YYYY-MM-DD format (defaults to today in user timezone)'),

  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .default('50')
    .describe('Maximum number of tasks to return'),

  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0))
    .default('0')
    .describe('Number of tasks to skip for pagination'),

  type: taskTypeEnum.optional().describe('Filter by specific task type'),
});

/**
 * Evidence data schemas for different types
 */
const textLogDataSchema = z.object({
  text: z.string().min(1).max(2000),
});

const metricsDataSchema = z.object({
  metrics: z.record(z.string(), z.union([z.number(), z.string()])),
});

const photoReferenceDataSchema = z.object({
  photoUrl: z.string().url('Invalid photo URL'),
});

/**
 * Body schema for POST /v1/evidence
 */
export const createEvidenceSchema = z
  .object({
    taskId: z.number().int().positive('Task ID must be a positive integer'),
    type: evidenceTypeEnum,
    data: z.union([textLogDataSchema, metricsDataSchema, photoReferenceDataSchema]),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      // Validate data matches evidence type
      if (data.type === 'text_log') {
        return 'text' in data.data;
      }
      if (data.type === 'metrics') {
        return 'metrics' in data.data;
      }
      if (data.type === 'photo_reference') {
        return 'photoUrl' in data.data;
      }
      return false;
    },
    {
      message: 'Evidence data must match the specified type',
      path: ['data'],
    }
  );

/**
 * TypeScript types inferred from schemas
 */
export type GetTodayTasksQuery = z.infer<typeof getTodayTasksQuerySchema>;
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;

// Re-export TaskType and EvidenceType for local use
export { TaskType, EvidenceType };
