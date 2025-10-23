import { z } from 'zod';

/**
 * Schema for plan generation request body
 * Validates the input for POST /v1/plans/generate
 */
export const planGenerationSchema = z.object({
  forceRecompute: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force plan recomputation even if a recent plan exists'),
});

/**
 * TypeScript type inferred from plan generation schema
 */
export type PlanGenerationInput = z.infer<typeof planGenerationSchema>;
