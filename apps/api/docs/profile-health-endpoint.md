# Health Profile Update Endpoint

## Overview

The Health Profile Update endpoint allows authenticated users to update their health metrics (weight, target weight, height, date of birth). When weight is updated, the system automatically recomputes the user's personalized plan targets (calories, protein, water).

**Endpoint**: `PUT /v1/auth/profile/health`

**Authentication**: Required (JWT Bearer token)

**Performance Target**: p95 < 300ms

---

## Request Specification

### Headers

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

### Request Body

```json
{
  "currentWeight": 75.5,      // Required: number (kg)
  "targetWeight": 70.0,       // Optional: number (kg)
  "height": 175,              // Optional: number (cm)
  "dateOfBirth": "1990-01-01T00:00:00.000Z"  // Optional: ISO 8601 datetime
}
```

### Validation Rules

| Field | Type | Required | Min | Max | Description |
|-------|------|----------|-----|-----|-------------|
| `currentWeight` | number | Yes | 30 | 300 | Current body weight in kilograms |
| `targetWeight` | number | No | 30 | 300 | Target body weight in kilograms |
| `height` | number | No | 100 | 250 | Height in centimeters |
| `dateOfBirth` | string | No | - | - | ISO 8601 datetime string |

---

## Response Specification

### Success Response (200 OK)

#### When Plan is Recomputed

```json
{
  "success": true,
  "profile": {
    "currentWeight": "75.5",
    "targetWeight": "70.0",
    "height": "175",
    "dateOfBirth": "1990-01-01T00:00:00.000Z"
  },
  "planUpdated": true,
  "targets": {
    "calorieTarget": 1700,
    "proteinTarget": 135,
    "waterTarget": 2625
  }
}
```

#### When Plan is NOT Recomputed

```json
{
  "success": true,
  "profile": {
    "currentWeight": "75.5",
    "targetWeight": "70.0",
    "height": "175",
    "dateOfBirth": "1990-01-01T00:00:00.000Z"
  },
  "planUpdated": false
}
```

**Note**: Plan recomputation only occurs when changes are significant:
- Calorie target changes by more than 50 kcal, OR
- Protein target changes by more than 10g

---

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": "Validation error: Weight must be at least 30 kg"
}
```

**Common Validation Errors:**
- Weight below 30 kg or above 300 kg
- Height below 100 cm or above 250 cm
- Target weight below 30 kg or above 300 kg
- Invalid dateOfBirth format (must be ISO 8601)

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required. Please provide a valid JWT token."
}
```

**Causes:**
- Missing Authorization header
- Invalid or expired JWT token
- Token signature verification failure

### 404 Not Found

```json
{
  "success": false,
  "error": "User settings not found. Please complete onboarding first."
}
```

**Cause:** User has not completed onboarding flow

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to update health metrics. Please try again."
}
```

**Causes:**
- Database connection failure
- Unexpected server error
- Service unavailability

---

## cURL Examples

### Update Current Weight Only

```bash
curl -X PUT http://localhost:3000/v1/auth/profile/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentWeight": 75.5
  }'
```

### Update Weight and Target Weight

```bash
curl -X PUT http://localhost:3000/v1/auth/profile/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentWeight": 75.5,
    "targetWeight": 70.0
  }'
```

### Complete Profile Update

```bash
curl -X PUT http://localhost:3000/v1/auth/profile/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentWeight": 75.5,
    "targetWeight": 70.0,
    "height": 175,
    "dateOfBirth": "1990-01-01T00:00:00.000Z"
  }'
```

---

## Integration Points

### Database Tables Updated

1. **user_settings**
   - `current_weight` - Updated with new weight value
   - `target_weight` - Updated if provided
   - `height` - Updated if provided
   - `date_of_birth` - Updated if provided
   - `updated_at` - Timestamp of update

### Services Called

1. **PlansService.recomputeForUser(userId)**
   - Recalculates BMR using Mifflin-St Jeor equation
   - Recalculates TDEE based on activity level
   - Updates calorie target based on primary goal
   - Updates protein target based on goal and weight
   - Updates water target (35ml per kg body weight)
   - Updates `user_settings` table with new targets
   - Updates `initial_plan_snapshot` table with projections

### Plan Recomputation Logic

The system recomputes targets when:
- **Calorie difference** > 50 kcal, OR
- **Protein difference** > 10g

If recomputation occurs, the following are updated:
- BMR (Basal Metabolic Rate)
- TDEE (Total Daily Energy Expenditure)
- Daily calorie target
- Daily protein target (g)
- Daily water target (ml)
- Weekly weight change rate (kg/week)
- Estimated weeks to goal
- Projected completion date

---

## Testing

### Manual Testing Steps

1. **Obtain JWT Token**
   ```bash
   # Login first to get token
   curl -X POST http://localhost:3000/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234!"
     }'
   ```

2. **Update Health Metrics**
   ```bash
   # Use the access token from login response
   curl -X PUT http://localhost:3000/v1/auth/profile/health \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "currentWeight": 75.5,
       "targetWeight": 70.0
     }'
   ```

3. **Verify Plan Recomputation**
   - Check if `planUpdated` is `true` in response
   - Verify new `targets` object is present
   - Confirm calorie and protein targets are reasonable

### Test Scenarios

#### Valid Updates
- ✅ Update weight only
- ✅ Update weight and target weight
- ✅ Update all fields
- ✅ Partial updates (any combination)
- ✅ Decimal weight values (e.g., 75.75)

#### Validation Errors
- ❌ Weight below 30 kg
- ❌ Weight above 300 kg
- ❌ Height below 100 cm
- ❌ Height above 250 cm
- ❌ Invalid date format
- ❌ Missing required fields

#### Authentication Errors
- ❌ No Authorization header
- ❌ Invalid JWT token
- ❌ Expired JWT token

#### Edge Cases
- ✅ Minimum valid values (30 kg, 100 cm)
- ✅ Maximum valid values (300 kg, 250 cm)
- ✅ User with no previous settings
- ✅ Plan recomputation triggered
- ✅ Plan recomputation not triggered

---

## Performance Considerations

### Expected Performance
- **p95 Latency**: < 300ms
- **Database Queries**: 2-3 queries
  1. SELECT user_settings
  2. UPDATE user_settings
  3. UPDATE initial_plan_snapshot (if recomputed)

### Optimization Features
- Connection pooling enabled (max 10 connections)
- Indexed queries on user_id
- Transaction batching for plan updates
- OpenTelemetry tracing for monitoring

### Monitoring

The endpoint emits the following traces:
- `PUT /auth/profile/health` - Main span
- `validation_completed` - Event after input validation
- `settings_fetched` - Event after database read
- `settings_updated` - Event after database update
- `plan_recomputed` - Event after plan recalculation

Log without PII:
```javascript
{
  userId: 123,
  updatedFields: ['currentWeight', 'targetWeight'],
  previousCalories: 2000,
  newCalories: 1950,
  planUpdated: true,
  durationMs: 245
}
```

---

## Mobile Integration

### iOS Swift Example

```swift
func updateHealthMetrics(
    currentWeight: Double,
    targetWeight: Double? = nil
) async throws -> HealthProfileResponse {
    let url = URL(string: "\(baseURL)/v1/auth/profile/health")!
    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    var body: [String: Any] = ["currentWeight": currentWeight]
    if let targetWeight = targetWeight {
        body["targetWeight"] = targetWeight
    }

    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw HealthProfileError.updateFailed
    }

    return try JSONDecoder().decode(HealthProfileResponse.self, from: data)
}
```

### iOS Response Models

```swift
struct HealthProfileResponse: Codable {
    let success: Bool
    let profile: HealthProfile
    let planUpdated: Bool
    let targets: PlanTargets?
}

struct HealthProfile: Codable {
    let currentWeight: String
    let targetWeight: String?
    let height: String?
    let dateOfBirth: String?
}

struct PlanTargets: Codable {
    let calorieTarget: Int
    let proteinTarget: Int
    let waterTarget: Int
}
```

---

## Security Considerations

### Authentication
- JWT token required for all requests
- Token must be valid and not expired
- Token signature verified with secret key

### Authorization
- Users can only update their own profile
- userId extracted from JWT token, not request body
- No ability to update other users' data

### Input Validation
- All inputs validated against safe ranges
- Prevents unrealistic or dangerous values
- Protection against injection attacks
- Type-safe validation with Zod

### Privacy
- Logs do not contain PII
- Only userId logged for debugging
- Sensitive data excluded from traces
- No email or personal info in logs

### Rate Limiting
- Standard rate limiting applies (configured in middleware)
- Prevents abuse and excessive updates
- Protects database from overload

---

## Database Schema Reference

### user_settings Table

```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  current_weight DECIMAL(5,2),        -- Updated by this endpoint
  target_weight DECIMAL(5,2),         -- Updated by this endpoint
  height DECIMAL(5,2),                -- Updated by this endpoint
  date_of_birth TIMESTAMP,            -- Updated by this endpoint
  bmr INTEGER,                        -- Recomputed automatically
  tdee INTEGER,                       -- Recomputed automatically
  calorie_target INTEGER,             -- Recomputed automatically
  protein_target INTEGER,             -- Recomputed automatically
  water_target INTEGER,               -- Recomputed automatically
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Changelog

### Version 1.0 (2025-10-28)
- Initial implementation
- JWT authentication support
- Plan recomputation integration
- Comprehensive validation
- Full test coverage (15+ tests)
- OpenTelemetry tracing
- Performance optimization

---

## Support

For issues or questions:
- Check logs in CloudWatch/stdout
- Review OpenTelemetry traces
- Verify JWT token validity
- Confirm user has completed onboarding
- Check database connectivity

Common issues:
1. **401 Unauthorized** - Regenerate JWT token
2. **404 Not Found** - Complete onboarding first
3. **400 Bad Request** - Verify input ranges
4. **500 Server Error** - Check database connection
