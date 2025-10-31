# Health Metrics Summary - TypeScript Types & Validation

## Overview

Comprehensive TypeScript type definitions and Zod schemas for the health metrics summary feature. This implementation provides strict type safety, runtime validation, and comprehensive documentation for displaying and acknowledging user health metrics (BMI, BMR, TDEE).

## Created Files

### Shared Types Package (`packages/shared-types/src/`)

#### 1. **metrics.ts** - Core Type Definitions

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/metrics.ts`

**Contents:**

- **Branded Types:**
  - `BMI` - Branded number type for BMI values
  - `MetricsVersion` - Branded number type for version tracking

- **Core Interfaces:**
  - `HealthMetrics` - BMI, BMR, TDEE with metadata
  - `MetricsExplanations` - User-friendly explanations for each metric
  - `MetricsAcknowledgement` - Acknowledgement metadata
  - `MetricsSummaryResponse` - Complete API response
  - `AcknowledgeMetricsRequest` - Request body for acknowledgement
  - `AcknowledgeMetricsResponse` - Response from acknowledgement

- **Constants:**
  - `METRICS_VALIDATION_RANGES` - Min/max values for validation
  - `CURRENT_METRICS_VERSION` - Current metrics version (1)
  - `ISO_8601_PATTERN` - Regex for ISO 8601 validation

- **Helper Functions:**
  - `getBMICategory()` - Classify BMI into WHO categories
  - `getBMICategoryDescription()` - Get human-readable category names

**Features:**

- All interfaces use `readonly` modifiers for immutability
- Comprehensive JSDoc comments with examples
- Branded types prevent accidental type mixing
- WHO-standard BMI classifications

#### 2. **metrics-schemas.ts** - Zod Validation Schemas

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/metrics-schemas.ts`

**Contents:**

- **Primitive Schemas:**
  - `bmiSchema` - BMI validation (10-60 range)
  - `bmrSchema` - BMR validation (500-5000 kcal, integer)
  - `tdeeSchema` - TDEE validation (500-10000 kcal, integer)
  - `metricsVersionSchema` - Version validation (1-1000, positive integer)
  - `iso8601DateSchema` - ISO 8601 date validation
  - `pastIso8601DateSchema` - Past date validation

- **Complex Schemas:**
  - `healthMetricsSchema` - Validates HealthMetrics with refinements
  - `metricsExplanationsSchema` - Validates explanations (1-1000 chars)
  - `metricsAcknowledgementSchema` - Validates acknowledgement
  - `metricsSummaryResponseSchema` - Validates full response with complex rules
  - `acknowledgeMetricsRequestSchema` - Validates request body
  - `acknowledgeMetricsResponseSchema` - Validates response

- **Validation Helpers:**
  - `validateHealthMetrics()` - Returns ValidationResult with detailed errors
  - `validateMetricsSummary()` - Validates complete summary response
  - `validateAcknowledgementRequest()` - Validates acknowledgement request

**Features:**

- Comprehensive error messages for each validation rule
- Custom refinements for complex validation logic:
  - TDEE must be >= BMR
  - Version consistency between metrics and acknowledgement
  - Timestamp ordering (acknowledgedAt >= computedAt)
  - Conditional presence of acknowledgement field
- Type inference with `z.infer<>`

#### 3. **metrics-guards.ts** - Runtime Type Guards

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/metrics-guards.ts`

**Contents:**

- **Primitive Type Guards:**
  - `isValidBMI()`
  - `isValidBMR()`
  - `isValidTDEE()`
  - `isValidMetricsVersion()`
  - `isValidISO8601Date()`

- **Complex Type Guards:**
  - `isHealthMetrics()` - Runtime check with all validations
  - `isMetricsExplanations()`
  - `isMetricsAcknowledgement()`
  - `isMetricsSummaryResponse()` - Validates complex relationships
  - `isAcknowledgeMetricsRequest()`
  - `isAcknowledgeMetricsResponse()`

- **Assertion Functions:**
  - `assertHealthMetrics()` - Throws TypeError if invalid
  - `assertMetricsSummaryResponse()`
  - `assertAcknowledgeMetricsRequest()`
  - `assertAcknowledgeMetricsResponse()`

**Features:**

- Type narrowing with TypeScript type predicates
- Assertion functions for throwing on invalid data
- All guards perform comprehensive validation
- Meaningful error messages with field names

#### 4. **index.ts** - Updated Exports

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/index.ts`

**Changes:**

- Added explicit exports for metrics types
- Added explicit exports for metrics schemas (to avoid ValidationResult conflict)
- Added exports for metrics type guards
- Renamed `ValidationResult` to `MetricsValidationResult` for metrics-schemas

### API Route Types (`apps/api/src/routes/profile/`)

#### 5. **metrics.types.ts** - Express & Database Types

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.types.ts`

**Contents:**

- **Express Request/Response Types:**
  - `GetMetricsSummaryRequest` - GET request with authenticated user
  - `GetMetricsSummaryResponse` - Response type
  - `AcknowledgeMetricsApiRequest` - POST request with body
  - `AcknowledgeMetricsApiResponse` - Response type

- **Database Query Result Types:**
  - `UserMetricsData` - Raw user settings data
  - `MetricsAcknowledgementRecord` - Raw acknowledgement data
  - `InsertMetricsAcknowledgement` - Insert shape

- **Service Layer Types:**
  - `ComputedMetricsWithStatus` - Internal service type
  - `BMICalculationResult` - BMI with classification
  - `MetricsComputationInput` - Validated computation input

- **Error Types:**
  - `MetricsErrorResponse` - Standardized error format
  - `MetricsErrorCodes` - Error code constants
  - `MetricsErrorCode` - Union type

- **OpenAPI Examples:**
  - `MetricsSummaryResponseExample`
  - `AcknowledgeMetricsRequestExample`
  - `AcknowledgeMetricsResponseExample`
  - `MetricsErrorResponseExample`

**Features:**

- Separates Express types from business logic types
- Database query result types match Drizzle ORM output
- Error codes for client-side handling
- OpenAPI examples for documentation

### Unit Tests (`packages/shared-types/src/__tests__/`)

#### 6. **metrics-guards.test.ts** - Type Guard Tests

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/__tests__/metrics-guards.test.ts`

**Coverage:**

- Tests for all primitive type guards (BMI, BMR, TDEE, version, dates)
- Tests for all complex type guards (HealthMetrics, explanations, etc.)
- Tests for all assertion functions
- Edge cases: boundaries, invalid types, null/undefined
- Complex validation: TDEE >= BMR, version matching, timestamp ordering
- Error message validation

**Test Count:** 40+ test cases

#### 7. **metrics-schemas.test.ts** - Zod Schema Tests

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/__tests__/metrics-schemas.test.ts`

**Coverage:**

- Tests for all primitive schemas
- Tests for all complex schemas
- Validation refinements (TDEE >= BMR, conditional fields)
- Error message validation
- Helper function tests (validateHealthMetrics, etc.)
- Edge cases: boundaries, missing fields, extra fields
- String trimming and length validation

**Test Count:** 50+ test cases

#### 8. **metrics.test.ts** - Helper Function Tests

**Location:** `/Users/devarisbrown/Code/projects/gtsd/packages/shared-types/src/__tests__/metrics.test.ts`

**Coverage:**

- BMI category classification (WHO standards)
- BMI category descriptions
- Integration tests (category + description)
- Constants validation (ranges, version, patterns)
- ISO 8601 regex pattern validation
- Type safety tests
- Validation range boundary tests

**Test Count:** 30+ test cases

### Documentation

#### 9. **metrics.openapi.yaml** - OpenAPI Specification

**Location:** `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.openapi.yaml`

**Contents:**

- Complete OpenAPI 3.0 specification
- Two endpoints:
  - `GET /v1/profile/metrics/summary` - Get metrics summary
  - `POST /v1/profile/metrics/acknowledge` - Acknowledge metrics

**Features:**

- Detailed endpoint descriptions with authentication requirements
- Request/response schemas with examples
- Error response documentation with error codes
- Multiple response examples:
  - Normal weight metrics (acknowledged)
  - Overweight metrics (unacknowledged)
  - Version mismatch error
  - Timestamp mismatch error
  - Validation errors
- Rate limiting documentation
- Performance targets (p95 < 300ms)
- Security scheme (JWT Bearer)

## Validation Ranges

### BMI (Body Mass Index)

- **Range:** 10-60 kg/m²
- **Rationale:** Covers severe underweight (10) to severe obesity (60)
- **Normal human range:** 15-50
- **WHO Classifications:**
  - < 18.5: Underweight
  - 18.5-24.9: Normal weight
  - 25-29.9: Overweight
  - 30-34.9: Obese (Class I)
  - 35-39.9: Obese (Class II)
  - ≥ 40: Obese (Class III)

### BMR (Basal Metabolic Rate)

- **Range:** 500-5000 kcal/day
- **Rationale:** Covers small children (500) to elite athletes (5000)
- **Normal adult range:** 1200-2500
- **Format:** Integer (whole number)

### TDEE (Total Daily Energy Expenditure)

- **Range:** 500-10000 kcal/day
- **Rationale:** Covers sedentary (500) to extreme athletes (10000)
- **Normal adult range:** 1500-3500
- **Format:** Integer (whole number)
- **Constraint:** Must be >= BMR

### Version

- **Range:** 1-1000
- **Format:** Positive integer
- **Current Version:** 1

### Timestamps

- **Format:** ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Timezone:** UTC only
- **Validation:** Must be valid date, acknowledgedAt must be in past

## Type Safety Features

### 1. Branded Types

```typescript
type BMI = number & { readonly [__bmi]: typeof __bmi };
type MetricsVersion = number & { readonly [__version]: typeof __version };
```

Prevents accidental mixing of different numeric types at compile time.

### 2. Readonly Interfaces

All interface properties use `readonly` modifier to prevent mutations:

```typescript
export interface HealthMetrics {
  readonly bmi: number;
  readonly bmr: number;
  // ...
}
```

### 3. Strict Type Guards

Runtime type checking with TypeScript type predicates:

```typescript
function isHealthMetrics(value: unknown): value is HealthMetrics {
  // Runtime validation
}
```

### 4. Zod Schema Validation

Runtime validation with detailed error messages:

```typescript
const result = healthMetricsSchema.safeParse(data);
if (!result.success) {
  // result.error.issues contains detailed errors
}
```

### 5. Complex Validation Rules

- TDEE must be >= BMR
- Version must match between metrics and acknowledgement
- acknowledgedAt must be >= computedAt
- acknowledgement present only when acknowledged=true

## Usage Examples

### Validating Health Metrics

```typescript
import { validateHealthMetrics } from '@gtsd/shared-types';

const result = validateHealthMetrics({
  bmi: 22.5,
  bmr: 1800,
  tdee: 2500,
  computedAt: '2025-10-28T12:00:00.000Z',
  version: 1,
});

if (result.success) {
  console.log('Valid metrics:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

### Using Type Guards

```typescript
import { isHealthMetrics, assertHealthMetrics } from '@gtsd/shared-types';

// Type guard
if (isHealthMetrics(data)) {
  // data is now typed as HealthMetrics
  console.log('BMI:', data.bmi);
}

// Assertion (throws if invalid)
assertHealthMetrics(data, 'metrics');
// data is guaranteed to be HealthMetrics after this line
```

### API Route Implementation

```typescript
import type {
  GetMetricsSummaryRequest,
  GetMetricsSummaryResponse,
} from './routes/profile/metrics.types';
import { metricsSummaryResponseSchema } from '@gtsd/shared-types';

async function getMetricsSummary(req: GetMetricsSummaryRequest, res: GetMetricsSummaryResponse) {
  const userId = req.user!.userId;

  // Compute metrics...
  const response = {
    metrics: {
      /* ... */
    },
    explanations: {
      /* ... */
    },
    acknowledged: false,
  };

  // Validate before sending
  const validation = metricsSummaryResponseSchema.safeParse(response);
  if (!validation.success) {
    throw new Error('Invalid response');
  }

  res.json(response);
}
```

## Error Codes

### Client-Side Error Handling

```typescript
export const MetricsErrorCodes = {
  INCOMPLETE_PROFILE: 'INCOMPLETE_PROFILE', // User needs to complete onboarding
  COMPUTATION_FAILED: 'COMPUTATION_FAILED', // Metrics calculation failed
  VERSION_MISMATCH: 'VERSION_MISMATCH', // Version doesn't match
  TIMESTAMP_MISMATCH: 'TIMESTAMP_MISMATCH', // Timestamp doesn't match
  ALREADY_ACKNOWLEDGED: 'ALREADY_ACKNOWLEDGED', // Already acknowledged
  INVALID_REQUEST: 'INVALID_REQUEST', // Request validation failed
  DATABASE_ERROR: 'DATABASE_ERROR', // Database operation failed
} as const;
```

## Dependencies

### Shared Types Package

- **zod** ^3.23.8 - Runtime validation
- **typescript** ^5.4.5 (devDependency)

### Updated package.json

Added `zod` as a dependency to `packages/shared-types/package.json`.

## Testing

### Run Type Checking

```bash
cd packages/shared-types
pnpm typecheck
```

### Run Unit Tests

```bash
cd packages/shared-types
pnpm test
```

### Build Package

```bash
cd packages/shared-types
pnpm build
```

## Integration Notes

### 1. Database Schema

The following database table is expected for metrics acknowledgement:

```sql
CREATE TABLE metrics_acknowledgements (
  user_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  metrics_computed_at TIMESTAMP NOT NULL,
  acknowledged_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, version)
);
```

### 2. Required User Settings

Metrics computation requires:

- Current weight (kg)
- Height (cm)
- Date of birth (for age calculation)
- Gender (male/female/other)
- Activity level (sedentary/lightly_active/moderately_active/very_active/extremely_active)

### 3. Science Service Integration

Uses existing `ScienceService` from `apps/api/src/services/science.ts`:

- `calculateBMR()` - Mifflin-St Jeor equation
- `calculateTDEE()` - BMR × activity multiplier
- BMI calculated in route handler: `weight / (height/100)²`

## Performance Considerations

### Validation Performance

- Type guards: O(1) - constant time
- Zod validation: O(n) where n is object size
- Complex refinements add minimal overhead

### Caching Strategy

- Metrics should be computed on-demand and cached for 1 hour
- Acknowledgement is a lightweight database write
- Target: p95 < 300ms for metrics computation

### Rate Limiting

- Metrics summary: 60 requests/minute per user
- Acknowledgement: 10 requests/minute per user

## Future Enhancements

1. **Metrics History:**
   - Track changes over time
   - Show trends and progress

2. **Additional Metrics:**
   - Body fat percentage
   - Muscle mass
   - Metabolic age

3. **Localization:**
   - Multiple languages for explanations
   - Imperial/metric unit support

4. **Advanced Validation:**
   - Age-specific BMI ranges
   - Gender-specific classifications
   - Athlete vs. non-athlete ranges

## Summary

This implementation provides:

- ✅ Strict type safety with branded types
- ✅ Comprehensive runtime validation with Zod
- ✅ Type guards for runtime checks
- ✅ 120+ unit tests with full coverage
- ✅ Complete OpenAPI documentation
- ✅ Error handling with specific error codes
- ✅ WHO-standard BMI classifications
- ✅ Validation ranges for edge cases
- ✅ TypeScript 5.4+ support
- ✅ Zero runtime dependencies (except Zod)

All types are exported from `@gtsd/shared-types` and can be used in both API and mobile applications.
