# Health Profile Update - Integration Guide

## Quick Start

This guide helps you integrate the new Health Profile Update endpoint into your application.

---

## 1. Installation

No additional dependencies required. The endpoint is already registered and ready to use.

### Files Added
- `/apps/api/src/routes/auth/profile-health.ts` - Route handler
- `/apps/api/src/routes/auth/profile-health.test.ts` - Test suite

### Files Modified
- `/apps/api/src/routes/auth/index.ts` - Route registration

---

## 2. Environment Setup

No environment variables needed. Uses existing configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret

---

## 3. Database Migrations

No new migrations required. Uses existing `user_settings` table.

**Verify schema exists:**
```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
npm run db:studio
```

Check that `user_settings` table has these columns:
- `current_weight` (decimal)
- `target_weight` (decimal)
- `height` (decimal)
- `date_of_birth` (timestamp)
- `bmr`, `tdee`, `calorie_target`, `protein_target`, `water_target`

---

## 4. Running Tests

### Unit Tests

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
npm test src/routes/auth/profile-health.test.ts
```

**Expected Results:**
- ✅ 15+ tests passing
- ✅ Validation tests (7 tests)
- ✅ Success cases (3 tests)
- ✅ Error cases (5 tests)
- ✅ Edge cases (4 tests)
- ✅ Integration tests (2 tests)

### Integration Testing

```bash
# Start the server
npm run dev

# In another terminal, test the endpoint
curl -X PUT http://localhost:3000/v1/auth/profile/health \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 75.5}'
```

---

## 5. Manual Testing Workflow

### Step 1: Create Test User

```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "Test User"
  }'
```

### Step 2: Login and Get JWT

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

**Save the `accessToken` from response.**

### Step 3: Complete Onboarding (if needed)

The user must have `user_settings` record. If not, create via onboarding endpoint.

### Step 4: Update Health Metrics

```bash
curl -X PUT http://localhost:3000/v1/auth/profile/health \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWeight": 75.5,
    "targetWeight": 70.0,
    "height": 175
  }'
```

### Step 5: Verify Response

Expected response:
```json
{
  "success": true,
  "profile": {
    "currentWeight": "75.5",
    "targetWeight": "70.0",
    "height": "175",
    "dateOfBirth": null
  },
  "planUpdated": true,
  "targets": {
    "calorieTarget": 1700,
    "proteinTarget": 135,
    "waterTarget": 2625
  }
}
```

---

## 6. iOS Integration

### Add to ProfileEditViewModel.swift

The iOS app already has the method prepared:

```swift
func updateWeight(current: Double, target: Double?) async {
    isLoading = true
    errorMessage = nil

    do {
        let response = try await APIClient.shared.updateHealthMetrics(
            currentWeight: current,
            targetWeight: target
        )

        // Update local state
        self.currentWeight = response.profile.currentWeight
        self.targetWeight = response.profile.targetWeight

        if response.planUpdated, let targets = response.targets {
            // Update plan targets
            print("Plan recomputed: \(targets.calorieTarget) kcal, \(targets.proteinTarget)g protein")
        }

        isLoading = false
        showSuccessMessage = true
    } catch {
        errorMessage = error.localizedDescription
        isLoading = false
    }
}
```

### Update API Client

Ensure `APIClient.swift` has the endpoint:

```swift
func updateHealthMetrics(
    currentWeight: Double,
    targetWeight: Double? = nil,
    height: Double? = nil,
    dateOfBirth: Date? = nil
) async throws -> HealthProfileResponse {
    let endpoint = "\(baseURL)/v1/auth/profile/health"

    var body: [String: Any] = ["currentWeight": currentWeight]
    if let targetWeight = targetWeight {
        body["targetWeight"] = targetWeight
    }
    if let height = height {
        body["height"] = height
    }
    if let dateOfBirth = dateOfBirth {
        let formatter = ISO8601DateFormatter()
        body["dateOfBirth"] = formatter.string(from: dateOfBirth)
    }

    return try await request(
        endpoint: endpoint,
        method: "PUT",
        body: body
    )
}
```

---

## 7. Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid JWT | Login again to get new token |
| 404 Not Found | User settings missing | Complete onboarding first |
| 400 Bad Request | Invalid weight value | Check weight is 30-300 kg |
| 500 Server Error | Database issue | Check database connection |

### iOS Error Handling

```swift
enum HealthProfileError: LocalizedError {
    case unauthorized
    case settingsNotFound
    case invalidInput(String)
    case serverError

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Please log in again"
        case .settingsNotFound:
            return "Please complete onboarding first"
        case .invalidInput(let message):
            return message
        case .serverError:
            return "Unable to update profile. Please try again."
        }
    }
}
```

---

## 8. Monitoring

### Check Logs

```bash
# View API logs
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
npm run dev

# Logs will show:
# - Health metrics update request
# - Validation completion
# - Settings updated
# - Plan recomputed (if triggered)
# - Response time
```

### Key Metrics to Monitor

1. **Response Time**: Should be < 300ms p95
2. **Plan Recomputation Rate**: How often plans are recomputed
3. **Error Rate**: Should be < 1%
4. **Validation Failures**: Track invalid inputs

### OpenTelemetry Traces

Traces are automatically emitted:
- Span: `PUT /auth/profile/health`
- Events: `validation_completed`, `settings_updated`, `plan_recomputed`

---

## 9. Deployment Checklist

Before deploying to production:

- [ ] All tests passing (15+ tests)
- [ ] TypeScript compilation successful
- [ ] Database schema verified
- [ ] JWT authentication working
- [ ] Plan recomputation tested
- [ ] Error handling verified
- [ ] Logs checked (no PII)
- [ ] Performance < 300ms p95
- [ ] Rate limiting configured
- [ ] Monitoring setup complete

---

## 10. Troubleshooting

### Issue: "User settings not found"

**Cause:** User hasn't completed onboarding

**Solution:**
```sql
-- Check if user_settings exists
SELECT * FROM user_settings WHERE user_id = <USER_ID>;

-- If missing, user needs to complete onboarding
```

### Issue: Plan not recomputing

**Cause:** Changes too small (< 50 kcal or < 10g protein)

**Solution:** This is expected behavior. Only significant changes trigger recomputation.

### Issue: 401 Unauthorized

**Cause:** JWT token expired or invalid

**Solution:**
```bash
# Get new token
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### Issue: Slow response times (> 300ms)

**Cause:** Database connection or complex recomputation

**Solution:**
1. Check database connection pool size
2. Review database query performance
3. Check for slow queries in logs
4. Consider caching strategies

---

## 11. Testing Checklist

### Functional Tests
- [ ] Update weight only
- [ ] Update weight + target
- [ ] Update height + dateOfBirth
- [ ] Plan recomputation triggered
- [ ] Plan recomputation not triggered
- [ ] All fields updated at once

### Validation Tests
- [ ] Weight below 30 kg (should fail)
- [ ] Weight above 300 kg (should fail)
- [ ] Height below 100 cm (should fail)
- [ ] Height above 250 cm (should fail)
- [ ] Invalid date format (should fail)

### Authentication Tests
- [ ] No token (should fail)
- [ ] Invalid token (should fail)
- [ ] Expired token (should fail)
- [ ] Valid token (should succeed)

### Edge Cases
- [ ] Decimal weights (75.75 kg)
- [ ] Minimum valid values
- [ ] Maximum valid values
- [ ] Null fields in response

---

## 12. Support

### Documentation
- **API Docs**: `/apps/api/docs/profile-health-endpoint.md`
- **Code**: `/apps/api/src/routes/auth/profile-health.ts`
- **Tests**: `/apps/api/src/routes/auth/profile-health.test.ts`

### Need Help?
1. Check logs for error messages
2. Review test suite for examples
3. Verify JWT token is valid
4. Confirm user has completed onboarding
5. Check database connectivity

---

## Success!

Your Health Profile Update endpoint is now ready. The iOS app can call this endpoint to update weight metrics and receive recomputed plan targets automatically.

**Next Steps:**
1. Test in development environment
2. Verify iOS integration
3. Monitor performance metrics
4. Deploy to staging
5. Test with real users
6. Deploy to production
