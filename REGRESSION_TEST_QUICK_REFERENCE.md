# Regression Test Quick Reference

## Quick Start

**Before every deployment, run these commands:**

```bash
# 1. Run all tests
cd apps/api && npm test

# 2. Check coverage
npm run test:coverage

# 3. Run pre-deployment checks
./scripts/pre-deploy-checks.sh

# 4. Manual testing (see checklist below)
```

---

## Critical Test Cases (Must Pass Before Release)

### 1. Dietary Preferences (DP-001)

```bash
# Test: Create preferences -> Navigate away -> Return -> Verify persistence
✓ Preferences persist after navigation
✓ Database matches UI
✓ API response matches UI
```

### 2. Metrics Acknowledgment (MA-001)

```bash
# Test: View metrics -> Acknowledge -> Verify no 404 errors
✓ GET /v1/profile/metrics/today returns 200
✓ POST /v1/profile/metrics/acknowledge returns 200 (NOT 404!)
✓ Acknowledgment persists across sessions
```

### 3. Dark Mode Picker (DM-001)

```bash
# Test: Tap dark mode -> Verify immediate change -> Restart app -> Verify persistence
✓ Picker responds to taps
✓ Theme changes immediately
✓ Preference persists across app restarts
```

### 4. Photo Upload (PU-001)

```bash
# Test: Request presign -> Upload to S3 -> Confirm -> Verify in gallery
✓ Presign request succeeds
✓ S3 upload succeeds
✓ Confirm request succeeds (NOT 404!)
✓ Photo appears in gallery
```

---

## Fast Manual Verification (5 min)

**Use this for quick smoke testing:**

### Step 1: Test Preferences (1 min)

1. Login to app
2. Go to Profile > Preferences
3. Add dietary preference: "vegetarian"
4. Navigate to home
5. Return to preferences
6. **VERIFY**: "vegetarian" still there ✓

### Step 2: Test Metrics (1 min)

1. View today's metrics
2. Tap "Got It" or acknowledge
3. **VERIFY**: No 404 error ✓
4. Navigate away and return
5. **VERIFY**: Shows as acknowledged ✓

### Step 3: Test Dark Mode (1 min)

1. Go to Settings
2. Tap "Dark" in appearance picker
3. **VERIFY**: App immediately turns dark ✓
4. Force quit app
5. Reopen app
6. **VERIFY**: Still in dark mode ✓

### Step 4: Test Photo Upload (2 min)

1. Go to Progress Photos
2. Tap "Add Photo"
3. Select a photo
4. Wait for upload
5. **VERIFY**: No errors, photo appears in gallery ✓

---

## Common Issues and Quick Fixes

### Issue: Preferences Not Persisting

**Root Cause**: User settings record not created
**Quick Fix**: Ensure user completed onboarding
**Test**:

```bash
curl -X GET http://localhost:3000/auth/profile/preferences \
  -H "Authorization: Bearer $TOKEN"

# Should return 200 with preferences, NOT 404
```

### Issue: Metrics Acknowledgment 404

**Root Cause**: Metrics not computed OR wrong version/timestamp
**Quick Fix**: Verify metrics exist first
**Test**:

```bash
# 1. Check metrics exist
curl -X GET http://localhost:3000/v1/profile/metrics/today \
  -H "Authorization: Bearer $TOKEN"

# 2. Use exact version and computedAt from response
curl -X POST http://localhost:3000/v1/profile/metrics/acknowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version": 1, "metricsComputedAt": "2025-10-30T00:05:00.000Z"}'

# Should return 200, NOT 404
```

### Issue: Dark Mode Picker Not Working

**Root Cause**: AppStorage binding issue OR missing onChange handler
**Quick Fix**: Check Picker binding and onChange implementation
**Code Check**:

```swift
// CORRECT:
Picker("Appearance", selection: $appearanceMode) {
    ForEach(AppearanceMode.allCases, id: \.self) { mode in
        Text(mode.displayName).tag(mode)
    }
}
.onChange(of: appearanceMode) { oldValue, newValue in
    darkModeEnabled = (newValue == .dark)
}

// ❌ WRONG: Missing onChange or incorrect binding
```

### Issue: Photo Upload Errors

**Root Cause**: S3 permissions OR fileKey ownership validation
**Quick Fix**: Check S3 credentials and fileKey format
**Test**:

```bash
# 1. Request presign
curl -X POST http://localhost:3000/v1/progress/photo/presign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.jpg", "contentType": "image/jpeg", "fileSize": 2048576}'

# 2. Upload to S3 (use uploadUrl from response)
curl -X PUT "$UPLOAD_URL" \
  --upload-file test.jpg \
  -H "Content-Type: image/jpeg"

# 3. Confirm (use fileKey from presign response)
curl -X POST http://localhost:3000/v1/progress/photo/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileKey": "progress-photos/123/uuid-test.jpg", "fileSize": 2048576, "contentType": "image/jpeg"}'

# Should return 201, NOT 403 or 404
```

---

## Test Failure Triage

### If test fails, check these in order:

1. **Environment Issues**
   - [ ] Database running?
   - [ ] Redis running?
   - [ ] S3 credentials configured?
   - [ ] Environment variables set?

2. **Data Issues**
   - [ ] User exists?
   - [ ] User completed onboarding?
   - [ ] User settings record exists?
   - [ ] Metrics computed for today?

3. **Code Issues**
   - [ ] Recent code changes?
   - [ ] TypeScript compilation errors?
   - [ ] Database migrations applied?
   - [ ] Dependency updates?

4. **Test Issues**
   - [ ] Test data cleanup?
   - [ ] Race conditions?
   - [ ] Flaky test?
   - [ ] Test needs update?

---

## Emergency Rollback Criteria

**Immediately rollback if ANY of these fail:**

- ❌ User cannot save preferences
- ❌ Metrics acknowledgment returns 404
- ❌ Dark mode picker unresponsive
- ❌ Photo uploads consistently fail
- ❌ App crashes on any critical flow
- ❌ Data loss detected

**Rollback command:**

```bash
# Rollback to previous version
git revert <commit-hash>
git push origin main --force-with-lease

# Notify team
slack send "#engineering" "ROLLBACK: Critical regression detected in <feature>"
```

---

## Test Coverage Targets

| Feature                | Current | Target | Status |
| ---------------------- | ------- | ------ | ------ |
| Dietary Preferences    | 95%     | 90%    | ✅     |
| Metrics Acknowledgment | 98%     | 90%    | ✅     |
| Settings UI            | 85%     | 90%    | ⚠️     |
| Photo Upload           | 92%     | 90%    | ✅     |

---

## Contact Information

**QA Lead**: qa-lead@gtsd.app
**Engineering Lead**: eng-lead@gtsd.app
**On-Call**: oncall@gtsd.app

**Slack Channels**:

- #qa-alerts - Test failures
- #engineering - General questions
- #incidents - Production issues

---

## Useful Links

- **Full Test Plan**: [REGRESSION_TEST_PLAN.md](/Users/devarisbrown/Code/projects/gtsd/REGRESSION_TEST_PLAN.md)
- **API Documentation**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/README.md`
- **iOS Testing Strategy**: `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_TESTING_STRATEGY.md`
- **Test Results Dashboard**: https://dashboard.gtsd.app/qa

---

## Quick Test Snippets

### Test Preferences API

```javascript
const response = await fetch('http://localhost:3000/auth/profile/preferences', {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    dietaryPreferences: ['vegetarian'],
    allergies: ['peanuts'],
    mealsPerDay: 4,
  }),
});
console.log(response.status); // Should be 200
```

### Test Metrics Acknowledgment

```javascript
// 1. Get metrics
const metrics = await fetch('http://localhost:3000/v1/profile/metrics/today', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// 2. Acknowledge
const ack = await fetch('http://localhost:3000/v1/profile/metrics/acknowledge', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    version: 1,
    metricsComputedAt: metrics.data.computedAt,
  }),
});
console.log(ack.status); // Should be 200, NOT 404!
```

### Test Photo Presign

```javascript
const presign = await fetch('http://localhost:3000/v1/progress/photo/presign', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileName: 'test-photo.jpg',
    contentType: 'image/jpeg',
    fileSize: 2048576,
  }),
});
const data = await presign.json();
console.log(data.data.uploadUrl); // Should have S3 presigned URL
```

---

**Last Updated**: 2025-10-30
**Version**: 1.0
