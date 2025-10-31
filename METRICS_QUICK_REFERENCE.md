# Health Metrics Types - Quick Reference Guide

## Import Statements

### Basic Types

```typescript
import type {
  HealthMetrics,
  MetricsExplanations,
  MetricsAcknowledgement,
  MetricsSummaryResponse,
  AcknowledgeMetricsRequest,
  AcknowledgeMetricsResponse,
  BMICategory,
} from '@gtsd/shared-types';
```

### Validation & Type Guards

```typescript
import {
  // Zod schemas
  healthMetricsSchema,
  metricsSummaryResponseSchema,
  acknowledgeMetricsRequestSchema,

  // Validation helpers
  validateHealthMetrics,
  validateMetricsSummary,
  validateAcknowledgementRequest,

  // Type guards
  isHealthMetrics,
  isMetricsSummaryResponse,
  isAcknowledgeMetricsRequest,

  // Assertion functions
  assertHealthMetrics,
  assertMetricsSummaryResponse,
} from '@gtsd/shared-types';
```

### Helper Functions

```typescript
import {
  getBMICategory,
  getBMICategoryDescription,
  METRICS_VALIDATION_RANGES,
  CURRENT_METRICS_VERSION,
} from '@gtsd/shared-types';
```

### API Route Types

```typescript
import type {
  GetMetricsSummaryRequest,
  GetMetricsSummaryResponse,
  AcknowledgeMetricsApiRequest,
  AcknowledgeMetricsApiResponse,
  MetricsErrorResponse,
  MetricsErrorCode,
  MetricsErrorCodes,
} from './routes/profile/metrics.types';
```

## Common Usage Patterns

### 1. Validate Health Metrics

```typescript
const result = validateHealthMetrics(data);
if (!result.success) {
  return res.status(400).json({
    error: 'Invalid metrics',
    details: result.errors,
  });
}
// result.data is now typed as HealthMetrics
const metrics = result.data;
```

### 2. Validate API Response

```typescript
const response: MetricsSummaryResponse = {
  metrics: {
    bmi: 22.5,
    bmr: 1800,
    tdee: 2500,
    computedAt: new Date().toISOString(),
    version: CURRENT_METRICS_VERSION,
  },
  explanations: {
    bmi: '...',
    bmr: '...',
    tdee: '...',
  },
  acknowledged: false,
};

// Validate before sending
const validation = metricsSummaryResponseSchema.safeParse(response);
if (!validation.success) {
  throw new Error('Invalid response format');
}

res.json(response);
```

### 3. Use Type Guards in Conditional Logic

```typescript
function processMetrics(data: unknown) {
  if (isHealthMetrics(data)) {
    // data is now typed as HealthMetrics
    console.log(`BMI: ${data.bmi}`);
    console.log(`BMR: ${data.bmr}`);
    console.log(`TDEE: ${data.tdee}`);
  } else {
    console.error('Invalid metrics data');
  }
}
```

### 4. Calculate and Classify BMI

```typescript
const bmi = weight / Math.pow(height / 100, 2);
const category = getBMICategory(bmi);
const description = getBMICategoryDescription(category);

console.log(`BMI: ${bmi.toFixed(1)}`);
console.log(`Category: ${description}`);
// Output: "BMI: 22.5"
//         "Category: Normal Weight"
```

### 5. Express Route Handler with Types

```typescript
import type {
  GetMetricsSummaryRequest,
  GetMetricsSummaryResponse,
} from './routes/profile/metrics.types';

export async function getMetricsSummary(
  req: GetMetricsSummaryRequest,
  res: GetMetricsSummaryResponse
) {
  const userId = req.user!.userId;

  // Fetch and compute metrics...
  const metrics = await computeMetrics(userId);

  // Check acknowledgement status...
  const acknowledged = await isAcknowledged(userId, metrics.version);

  const response: MetricsSummaryResponse = {
    metrics,
    explanations: generateExplanations(metrics),
    acknowledged,
    acknowledgement: acknowledged ? await getAcknowledgement(userId) : undefined,
  };

  res.json(response);
}
```

### 6. Handle Validation Errors

```typescript
const validation = acknowledgeMetricsRequestSchema.safeParse(req.body);
if (!validation.success) {
  const errors = validation.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );

  return res.status(400).json({
    error: 'Invalid request',
    statusCode: 400,
    code: MetricsErrorCodes.INVALID_REQUEST,
    details: errors,
  } as MetricsErrorResponse);
}
```

### 7. Assert Valid Data (Throws on Invalid)

```typescript
try {
  // Will throw TypeError if invalid
  assertHealthMetrics(data, 'metrics');

  // data is guaranteed to be valid HealthMetrics here
  await saveMetrics(data);
} catch (error) {
  if (error instanceof TypeError) {
    console.error('Invalid metrics:', error.message);
  }
}
```

## Validation Rules

### HealthMetrics

- ✅ bmi: 10-60 (finite number)
- ✅ bmr: 500-5000 (integer)
- ✅ tdee: 500-10000 (integer)
- ✅ tdee >= bmr (enforced)
- ✅ computedAt: ISO 8601 format
- ✅ version: 1-1000 (positive integer)

### MetricsSummaryResponse

- ✅ All HealthMetrics validations
- ✅ Explanations: 1-1000 chars each
- ✅ acknowledged: boolean
- ✅ If acknowledged=true, acknowledgement must exist
- ✅ If acknowledged=false, acknowledgement must not exist
- ✅ acknowledgement.version must match metrics.version
- ✅ acknowledgement.acknowledgedAt >= metrics.computedAt

### AcknowledgeMetricsRequest

- ✅ version: 1-1000 (positive integer)
- ✅ metricsComputedAt: ISO 8601 format

### AcknowledgeMetricsResponse

- ✅ success: must be true
- ✅ acknowledgedAt: ISO 8601 format (past or present)

## BMI Classifications

```typescript
const classifications = {
  underweight: 'BMI < 18.5',
  normal: 'BMI 18.5-24.9',
  overweight: 'BMI 25-29.9',
  obese_class_1: 'BMI 30-34.9',
  obese_class_2: 'BMI 35-39.9',
  obese_class_3: 'BMI >= 40',
};
```

## Error Codes

```typescript
const errorCodes = {
  INCOMPLETE_PROFILE: 'User settings incomplete',
  COMPUTATION_FAILED: 'Metrics computation failed',
  VERSION_MISMATCH: 'Version does not match',
  TIMESTAMP_MISMATCH: 'Timestamp does not match',
  ALREADY_ACKNOWLEDGED: 'Already acknowledged',
  INVALID_REQUEST: 'Request validation failed',
  DATABASE_ERROR: 'Database operation failed',
};
```

## Constants

```typescript
CURRENT_METRICS_VERSION = 1;

METRICS_VALIDATION_RANGES = {
  bmi: { min: 10, max: 60 },
  bmr: { min: 500, max: 5000 },
  tdee: { min: 500, max: 10000 },
  version: { min: 1, max: 1000 },
};
```

## Type Reference Table

| Type                         | Purpose                       | Location             |
| ---------------------------- | ----------------------------- | -------------------- |
| `HealthMetrics`              | Core metrics (BMI, BMR, TDEE) | `metrics.ts`         |
| `MetricsExplanations`        | User-friendly explanations    | `metrics.ts`         |
| `MetricsAcknowledgement`     | Acknowledgement metadata      | `metrics.ts`         |
| `MetricsSummaryResponse`     | Complete API response         | `metrics.ts`         |
| `AcknowledgeMetricsRequest`  | Acknowledgement request body  | `metrics.ts`         |
| `AcknowledgeMetricsResponse` | Acknowledgement response      | `metrics.ts`         |
| `healthMetricsSchema`        | Zod schema for validation     | `metrics-schemas.ts` |
| `isHealthMetrics()`          | Runtime type guard            | `metrics-guards.ts`  |
| `assertHealthMetrics()`      | Assertion function            | `metrics-guards.ts`  |
| `GetMetricsSummaryRequest`   | Express request type          | `metrics.types.ts`   |
| `MetricsErrorResponse`       | Error response format         | `metrics.types.ts`   |

## Testing

### Test File Locations

- `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/__tests__/metrics.test.ts`
- `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/__tests__/metrics-guards.test.ts`
- `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/__tests__/metrics-schemas.test.ts`

### Run Tests

```bash
cd packages/shared-types
pnpm test
```

## Documentation

### OpenAPI Spec

- **Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.openapi.yaml`
- **Endpoints:**
  - `GET /v1/profile/metrics/summary`
  - `POST /v1/profile/metrics/acknowledge`

## Files Created

1. ✅ `packages/shared-types/src/metrics.ts` (11KB, 490 lines)
2. ✅ `packages/shared-types/src/metrics-schemas.ts` (14KB, 540 lines)
3. ✅ `packages/shared-types/src/metrics-guards.ts` (12KB, 415 lines)
4. ✅ `packages/shared-types/src/index.ts` (updated)
5. ✅ `packages/shared-types/package.json` (updated)
6. ✅ `apps/api/src/routes/profile/metrics.types.ts` (12KB, 510 lines)
7. ✅ `apps/api/src/routes/profile/metrics.openapi.yaml` (15KB, 500 lines)
8. ✅ `packages/shared-types/src/__tests__/metrics.test.ts` (6KB, 250 lines)
9. ✅ `packages/shared-types/src/__tests__/metrics-guards.test.ts` (9KB, 340 lines)
10. ✅ `packages/shared-types/src/__tests__/metrics-schemas.test.ts` (10KB, 380 lines)

**Total:** 10 files created/updated, ~100KB of code, 120+ test cases

## Build & Verify

```bash
# Type check
cd packages/shared-types
pnpm typecheck  # ✅ Passes

# Build
pnpm build  # ✅ Successful

# Install dependencies
pnpm install  # ✅ Zod added
```

## Next Steps

1. Implement API route handlers using these types
2. Create database migration for `metrics_acknowledgements` table
3. Implement service layer for metrics computation
4. Add integration tests for API endpoints
5. Update mobile app to consume these types
6. Add metrics display UI components
7. Implement acknowledgement flow in UI
