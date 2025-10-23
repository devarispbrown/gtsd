# Manual Testing Guide: Science BMR/TDEE Feature

This guide walks through manual testing of the science service, plan generation, and weekly recompute functionality.

## Prerequisites

1. Database running on `localhost:5434`
2. API server running: `pnpm --filter @gtsd/api dev`
3. Seed science profiles: `pnpm --filter @gtsd/api db:seed:science`

## Test Scenario 1: Generate Initial Plan

### Step 1: Authenticate as Test User

```bash
# Get auth token (replace with actual login endpoint)
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.jones@example.com",
    "password": "test-password"
  }'

# Save the token from response
export AUTH_TOKEN="<token_from_response>"
```

### Step 2: Generate Initial Plan

```bash
curl -X POST http://localhost:3000/v1/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "forceRecompute": false
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 1,
      "userId": 1,
      "name": "Weekly Plan - week of 2025-01-20",
      "description": "...",
      "planType": "weekly",
      "startDate": "2025-01-20T00:00:00.000Z",
      "endDate": "2025-01-26T23:59:59.999Z",
      "status": "active"
    },
    "targets": {
      "bmr": 1450,
      "tdee": 1740,
      "calorieTarget": 1240,
      "proteinTarget": 165,
      "waterTarget": 2600,
      "weeklyRate": -0.5,
      "estimatedWeeks": 20,
      "projectedDate": "2025-06-09T00:00:00.000Z"
    },
    "whyItWorks": {
      "bmr": {
        "title": "Your Basal Metabolic Rate (BMR)",
        "explanation": "...",
        "formula": "Mifflin-St Jeor Equation"
      },
      "tdee": {
        "title": "Total Daily Energy Expenditure (TDEE)",
        "explanation": "...",
        "activityMultiplier": 1.2
      },
      ...
    },
    "recomputed": false
  }
}
```

**Validation Checklist:**
- ✅ HTTP 201 Created status
- ✅ Plan created with correct week boundaries (Monday-Sunday)
- ✅ BMR calculated correctly for female, 26yo, 75kg, 165cm (~1450 kcal)
- ✅ TDEE = BMR × 1.2 (sedentary) = ~1740 kcal
- ✅ Calorie target = TDEE - 500 = ~1240 kcal
- ✅ Protein target = 75kg × 2.2g/kg = 165g
- ✅ Water target = 75kg × 35ml/kg = 2625ml → rounded to 2600ml
- ✅ Weekly rate = -0.5 kg/week (weight loss)
- ✅ Estimated weeks = (75-65)/0.5 = 20 weeks
- ✅ WhyItWorks contains educational explanations
- ✅ Response time < 300ms

### Step 3: Verify Plan Reuse (No Recompute)

```bash
curl -X POST http://localhost:3000/v1/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "forceRecompute": false
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "plan": { ... },  // Same plan as before
    "targets": { ... },  // Same targets
    "whyItWorks": { ... },
    "recomputed": false
  }
}
```

**Validation Checklist:**
- ✅ HTTP 200 OK status (not 201)
- ✅ Same plan ID returned
- ✅ `recomputed: false`
- ✅ No `previousTargets` in response
- ✅ Response time < 100ms (cached)

## Test Scenario 2: Update Weight and Recompute

### Step 1: Update User Weight

```bash
# Update weight from 75kg to 70kg (progress!)
curl -X PATCH http://localhost:3000/v1/users/me/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "currentWeight": 70
  }' | jq .
```

### Step 2: Force Recompute Plan

```bash
curl -X POST http://localhost:3000/v1/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "forceRecompute": true
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 2,  // New plan
      ...
    },
    "targets": {
      "bmr": 1400,  // Lower BMR (less weight)
      "tdee": 1680,  // Lower TDEE
      "calorieTarget": 1180,  // Lower target
      "proteinTarget": 154,  // Lower protein
      "waterTarget": 2500,  // Lower water
      "weeklyRate": -0.5,  // Same rate
      "estimatedWeeks": 10,  // Fewer weeks needed (closer to goal)
      "projectedDate": "2025-03-24T00:00:00.000Z"  // Sooner date
    },
    "whyItWorks": { ... },
    "recomputed": true,
    "previousTargets": {
      "bmr": 1450,
      "tdee": 1740,
      "calorieTarget": 1240,
      "proteinTarget": 165,
      "waterTarget": 2600,
      ...
    }
  }
}
```

**Validation Checklist:**
- ✅ HTTP 201 Created status
- ✅ New plan ID (different from previous)
- ✅ `recomputed: true`
- ✅ `previousTargets` included showing old values
- ✅ BMR decreased (lighter weight = lower BMR)
- ✅ TDEE decreased proportionally
- ✅ Calorie target decreased (TDEE - 500)
- ✅ Protein target decreased (70kg × 2.2 = 154g)
- ✅ Water target decreased (70kg × 35 = 2450 → 2500ml rounded)
- ✅ Estimated weeks decreased (now 10 weeks to lose 5kg)
- ✅ Projected date moved earlier

## Test Scenario 3: Weekly Recompute Job

### Step 1: Run Weekly Recompute Job Manually

```bash
# Create a script to trigger the job
cat > /tmp/trigger-recompute.ts << 'EOF'
import { weeklyRecomputeJob } from '../src/jobs/weekly-recompute';

async function run() {
  const result = await weeklyRecomputeJob.run();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

run();
EOF

# Run the job
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
tsx /tmp/trigger-recompute.ts
```

**Expected Output:**
```json
{
  "totalUsers": 10,
  "successCount": 10,
  "errorCount": 0,
  "updates": [
    {
      "userId": 1,
      "previousCalories": 1240,
      "newCalories": 1180,
      "previousProtein": 165,
      "newProtein": 154,
      "reason": "Weight changed from 75kg to 70kg"
    }
  ]
}
```

**Validation Checklist:**
- ✅ All seeded users processed (totalUsers = 10)
- ✅ No errors (errorCount = 0)
- ✅ Updates only for users with significant changes (>50 cal or >10g protein)
- ✅ Reason explains why targets changed
- ✅ User settings updated in database
- ✅ Initial plan snapshot updated
- ✅ Logs don't contain PII (only userId, no email/name)

### Step 2: Verify Database Updates

```bash
# Check user settings were updated
psql postgresql://gtsd:gtsd_dev_password@localhost:5434/gtsd_test << EOF
SELECT
  user_id,
  current_weight,
  bmr,
  tdee,
  calorie_target,
  protein_target,
  water_target
FROM user_settings
WHERE user_id = 1;
EOF
```

**Expected Result:**
```
 user_id | current_weight | bmr  | tdee | calorie_target | protein_target | water_target
---------+----------------+------+------+----------------+----------------+--------------
       1 | 70.00          | 1400 | 1680 |           1180 |            154 |         2500
```

**Validation Checklist:**
- ✅ Weight updated to 70kg
- ✅ BMR recalculated and updated
- ✅ TDEE recalculated and updated
- ✅ All targets updated correctly

## Test Scenario 4: Different User Profiles

Test with various seeded profiles to validate calculations:

### Male, 44yo, 85kg, 180cm, Moderate Activity, Muscle Gain

```bash
# Login as john.smith@example.com
# Generate plan

# Expected:
# BMR: ~1850 kcal (Mifflin-St Jeor for males)
# TDEE: 1850 × 1.55 = 2868 kcal
# Calorie Target: 2868 + 400 = 3268 kcal
# Protein: 85kg × 2.4g/kg = 204g
# Water: 85kg × 35ml/kg = 2975 → 3000ml
# Weekly Rate: +0.4 kg/week
# Estimated Weeks: (90-85)/0.4 = 13 weeks
```

### Female, 55yo, 68kg, 160cm, Light Activity, Maintain

```bash
# Login as maria.garcia@example.com
# Generate plan

# Expected:
# BMR: ~1280 kcal
# TDEE: 1280 × 1.375 = 1760 kcal
# Calorie Target: 1760 (maintain = no change)
# Protein: 68kg × 1.8g/kg = 122g
# Water: 68kg × 35ml/kg = 2380 → 2400ml
# Weekly Rate: 0 kg/week
# Estimated Weeks: undefined (maintenance)
```

### Non-Binary, 32yo, 70kg, 172cm, Extreme Activity, Muscle Gain

```bash
# Login as jordan.taylor@example.com
# Generate plan

# Expected:
# BMR: ~1630 kcal (average of male and female formulas)
# TDEE: 1630 × 1.9 = 3097 kcal
# Calorie Target: 3097 + 400 = 3497 kcal
# Protein: 70kg × 2.4g/kg = 168g
# Water: 70kg × 35ml/kg = 2450 → 2500ml
# Weekly Rate: +0.4 kg/week
# Estimated Weeks: (75-70)/0.4 = 13 weeks
```

## Performance Benchmarks

Run each endpoint 10 times and check p95 latency:

```bash
# Benchmark plan generation
for i in {1..10}; do
  time curl -s -X POST http://localhost:3000/v1/plans/generate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{"forceRecompute": false}' > /dev/null
done
```

**Performance Targets:**
- ✅ p50 < 150ms
- ✅ p95 < 300ms
- ✅ p99 < 500ms

## Security Tests

### Test 1: Authentication Required

```bash
# Without auth token
curl -X POST http://localhost:3000/v1/plans/generate \
  -H "Content-Type: application/json" \
  -d '{"forceRecompute": false}'

# Expected: 401 Unauthorized
```

### Test 2: Input Validation

```bash
# Invalid input
curl -X POST http://localhost:3000/v1/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"forceRecompute": "not a boolean"}'

# Expected: 400 Bad Request with validation error
```

## Success Criteria

All tests should pass with:
- ✅ Correct BMR/TDEE calculations per Mifflin-St Jeor
- ✅ Appropriate calorie adjustments for goals
- ✅ Correct protein and water targets
- ✅ Accurate timeline projections
- ✅ Plan generation working correctly
- ✅ Recompute detecting and updating changed targets
- ✅ Weekly job processing all users
- ✅ Performance < 300ms p95
- ✅ Proper authentication and validation
- ✅ No PII in logs
- ✅ Educational "Why it works" copy generated

## Cleanup

After testing:

```bash
# Reset test database
psql postgresql://gtsd:gtsd_dev_password@localhost:5434/gtsd_test << EOF
TRUNCATE TABLE plans CASCADE;
DELETE FROM user_settings WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%example.com');
DELETE FROM users WHERE email LIKE '%example.com';
EOF
```
