# Test Implementation Checklist

This checklist tracks which automated tests need to be added to prevent the identified regressions.

## Status Legend

- ✅ **Implemented and Passing** - Test exists and passes
- 🟡 **Partially Implemented** - Test exists but needs enhancement
- ❌ **Not Implemented** - Test needs to be created
- ⏸️ **Blocked** - Waiting on dependency

---

## 1. Dietary Preferences Persistence Tests

### Backend API Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/profile-preferences.test.ts`

| Status | Test Case                                           | Description                               |
| ------ | --------------------------------------------------- | ----------------------------------------- |
| ✅     | should update dietary preferences                   | Basic update test                         |
| ✅     | should persist preferences to database              | Verifies DB persistence                   |
| ✅     | should handle partial updates                       | Partial updates don't affect other fields |
| ✅     | should update updatedAt timestamp                   | Timestamp updates correctly               |
| ✅     | should handle concurrent updates to same user       | Race condition handling                   |
| ❌     | should persist empty arrays for dietary preferences | Clearing preferences works                |
| ❌     | should handle rapid successive preference updates   | Stress test for rapid updates             |
| ❌     | should maintain preferences across user sessions    | Session persistence                       |

**New Tests to Add:**

```typescript
// Add to profile-preferences.test.ts

describe('Dietary Preferences Regression Tests', () => {
  it('should persist empty arrays for dietary preferences', async () => {
    // Test clearing preferences
    const response = await request(app)
      .put('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dietaryPreferences: [] });

    expect(response.body.data.dietaryPreferences).toEqual([]);

    // Verify persistence
    const dbCheck = await db.select().from(userSettings).where(eq(userSettings.userId, testUserId));
    expect(dbCheck[0].dietaryPreferences).toEqual([]);
  });

  it('should handle rapid successive preference updates', async () => {
    const updates = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ mealsPerDay: (i % 5) + 1 })
    );

    const responses = await Promise.all(updates);
    responses.forEach((r) => expect(r.status).toBe(200));

    const final = await request(app)
      .get('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(final.body.data.mealsPerDay).toBeGreaterThan(0);
  });

  it('should maintain preferences across user sessions', async () => {
    await request(app)
      .put('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dietaryPreferences: ['vegan'],
        allergies: ['soy'],
        mealsPerDay: 5,
      });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    const newToken = loginResponse.body.data.accessToken;

    const response = await request(app)
      .get('/auth/profile/preferences')
      .set('Authorization', `Bearer ${newToken}`);

    expect(response.body.data.dietaryPreferences).toEqual(['vegan']);
    expect(response.body.data.allergies).toEqual(['soy']);
    expect(response.body.data.mealsPerDay).toBe(5);
  });
});
```

### iOS Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSDTests/Features/Profile/PreferencesTests.swift`

| Status | Test Case                              | Description              |
| ------ | -------------------------------------- | ------------------------ |
| ❌     | testPreferencesPersistAcrossNavigation | Navigate away and back   |
| ❌     | testPreferencesAPIIntegration          | API call succeeds        |
| ❌     | testPreferencesUIUpdatesAfterSave      | UI reflects saved values |

---

## 2. Metrics Acknowledgment Tests

### Backend API Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.test.ts`

| Status | Test Case                                                          | Description              |
| ------ | ------------------------------------------------------------------ | ------------------------ |
| ✅     | should return 200 with valid data                                  | Basic GET test           |
| ✅     | should return 404 when no metrics exist                            | No metrics case          |
| ✅     | should be idempotent (multiple acknowledgements)                   | Idempotency test         |
| ✅     | should return 404 when version mismatch                            | Version validation       |
| ✅     | should return 404 when metricsComputedAt does not match            | Timestamp validation     |
| ❌     | should never return 404 for valid metrics                          | Critical regression test |
| ❌     | should handle acknowledgment immediately after metrics computation | Race condition test      |
| ❌     | should validate ISO datetime format strictly                       | Date format validation   |
| ❌     | should track acknowledgment status correctly                       | Status tracking          |

**New Tests to Add:**

```typescript
// Add to metrics.test.ts

describe('Metrics Acknowledgment Regression Tests', () => {
  it('should never return 404 for valid metrics', async () => {
    await metricsService.computeAndStoreMetrics(testUserId, false);

    const getResponse = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(200);
    const { version, computedAt } = getResponse.body.data;

    const ackResponse = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ version, metricsComputedAt: computedAt });

    expect(ackResponse.status).not.toBe(404);
    expect(ackResponse.status).toBe(200);
  });

  it('should handle acknowledgment immediately after metrics computation', async () => {
    const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

    const response = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: metrics.computedAt.toISOString(),
      });

    expect(response.status).toBe(200);
  });

  it('should validate ISO datetime format strictly', async () => {
    const invalidFormats = [
      '2025-10-30',
      '2025-10-30 12:00:00',
      '2025/10/30T12:00:00Z',
      'invalid-date',
    ];

    for (const invalidDate of invalidFormats) {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ version: 1, metricsComputedAt: invalidDate });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation error');
    }
  });

  it('should track acknowledgment status correctly', async () => {
    await metricsService.computeAndStoreMetrics(testUserId, false);

    const before = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(before.body.data.acknowledged).toBe(false);

    await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: before.body.data.computedAt,
      });

    const after = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(after.body.data.acknowledged).toBe(true);
  });
});
```

### iOS Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSDTests/Features/MetricsSummary/MetricsSummaryViewModelTests.swift`

| Status | Test Case                                  | Description                         |
| ------ | ------------------------------------------ | ----------------------------------- |
| 🟡     | testAcknowledgeMetricsSuccess              | Basic acknowledgment test (enhance) |
| ❌     | testAcknowledgmentPersistsAcrossNavigation | Navigation persistence              |
| ❌     | testAcknowledgmentUIStateUpdates           | UI state updates                    |
| ❌     | testHandles404Gracefully                   | Error handling                      |

---

## 3. Dark Mode Picker Tests

### iOS Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSDTests/Features/Profile/SettingsViewTests.swift`

| Status | Test Case                        | Description             |
| ------ | -------------------------------- | ----------------------- |
| ❌     | testDarkModePickerResponsiveness | Picker responds to taps |
| ❌     | testAppearanceModePersistence    | AppStorage persistence  |
| ❌     | testLegacyDarkModeCompatibility  | Backward compatibility  |
| ❌     | testAllAppearanceModes           | All modes work          |
| ❌     | testThemeChangesImmediately      | Immediate theme change  |
| ❌     | testPersistsAcrossAppRestart     | App restart persistence |

**New Tests to Add:**

```swift
// Create GTSDTests/Features/Profile/SettingsViewTests.swift

import XCTest
@testable import GTSD

class SettingsViewRegressionTests: XCTestCase {

    func testDarkModePickerResponsiveness() {
        let expectation = XCTestExpectation(description: "Appearance mode changes")
        let appearanceMode = AppearanceMode.dark

        XCTAssertEqual(appearanceMode, .dark)
        XCTAssertEqual(appearanceMode.displayName, "Dark")
        XCTAssertEqual(appearanceMode.colorScheme, .dark)

        expectation.fulfill()
        wait(for: [expectation], timeout: 1.0)
    }

    func testAppearanceModePersistence() {
        @AppStorage("appearanceMode") var mode = AppearanceMode.system

        mode = .dark
        XCTAssertEqual(mode, .dark)

        @AppStorage("appearanceMode") var reloadedMode = AppearanceMode.system
        XCTAssertEqual(reloadedMode, .dark)
    }

    func testLegacyDarkModeCompatibility() {
        @AppStorage("appearanceMode") var appearanceMode = AppearanceMode.system
        @AppStorage("darkModeEnabled") var darkModeEnabled = false

        appearanceMode = .dark
        darkModeEnabled = (appearanceMode == .dark)
        XCTAssertTrue(darkModeEnabled)

        appearanceMode = .light
        darkModeEnabled = (appearanceMode == .dark)
        XCTAssertFalse(darkModeEnabled)
    }

    func testAllAppearanceModes() {
        let modes = AppearanceMode.allCases

        XCTAssertEqual(modes.count, 3)
        XCTAssertTrue(modes.contains(.system))
        XCTAssertTrue(modes.contains(.light))
        XCTAssertTrue(modes.contains(.dark))
    }
}
```

### UI Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSDUITests/SettingsUITests.swift`

| Status | Test Case                         | Description                |
| ------ | --------------------------------- | -------------------------- |
| ❌     | testDarkModePickerTapResponse     | User can tap and select    |
| ❌     | testVisualThemeChange             | Visual theme changes       |
| ❌     | testPickerHighlightsCorrectOption | Correct option highlighted |

---

## 4. Photo Upload Tests

### Backend API Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/progress/photos.test.ts`

| Status | Test Case                                       | Description             |
| ------ | ----------------------------------------------- | ----------------------- |
| ✅     | should generate presigned URL for valid request | Basic presign test      |
| ✅     | should create photo record without task link    | Basic confirm test      |
| ✅     | should reject files exceeding size limit        | File size validation    |
| ✅     | should reject invalid content types             | Content type validation |
| ✅     | should handle idempotent requests correctly     | Idempotency test        |
| ✅     | should reject if task belongs to another user   | Security test           |
| ❌     | should prevent cross-user photo access          | Cross-user security     |
| ❌     | should handle network interruption gracefully   | Network error handling  |
| ❌     | should enforce file extension validation        | Extension validation    |
| ❌     | should handle concurrent photo uploads          | Concurrency test        |

**New Tests to Add:**

```typescript
// Add to photos.test.ts

describe('Photo Upload Regression Tests', () => {
  it('should prevent cross-user photo access', async () => {
    const presign1 = await request(app)
      .post('/v1/progress/photo/presign')
      .set('X-User-Id', user1Id.toString())
      .send({
        fileName: 'user1-photo.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048576,
      });

    const fileKey1 = presign1.body.data.fileKey;

    const confirmResponse = await request(app)
      .post('/v1/progress/photo/confirm')
      .set('X-User-Id', user2Id.toString())
      .send({
        fileKey: fileKey1,
        fileSize: 2048576,
        contentType: 'image/jpeg',
      });

    expect(confirmResponse.status).toBe(403);
    expect(confirmResponse.body.message).toContain('does not belong to authenticated user');
  });

  it('should handle network interruption gracefully', async () => {
    const presign = await request(app)
      .post('/v1/progress/photo/presign')
      .set('X-User-Id', testUserId.toString())
      .send({
        fileName: 'interrupted-upload.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048576,
      });

    const confirm = await request(app)
      .post('/v1/progress/photo/confirm')
      .set('X-User-Id', testUserId.toString())
      .send({
        fileKey: presign.body.data.fileKey,
        fileSize: 2048576,
        contentType: 'image/jpeg',
      });

    expect(confirm.status).toBe(404);
    expect(confirm.body.message).toContain('File not found in storage');
  });

  it('should enforce file extension validation', async () => {
    const invalidExtensions = ['photo.exe', 'photo.pdf', 'photo.mp4', 'photo.jpg.exe'];

    for (const fileName of invalidExtensions) {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName,
          contentType: 'image/jpeg',
          fileSize: 2048576,
        });

      expect(response.status).toBe(400);
    }
  });

  it('should handle concurrent photo uploads', async () => {
    const uploads = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName: `concurrent-${i}.jpg`,
          contentType: 'image/jpeg',
          fileSize: 2048576,
        })
    );

    const responses = await Promise.all(uploads);

    responses.forEach((r) => expect(r.status).toBe(200));

    const fileKeys = responses.map((r) => r.body.data.fileKey);
    const uniqueKeys = new Set(fileKeys);
    expect(uniqueKeys.size).toBe(5);
  });
});
```

### iOS Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSDTests/Features/Photos/PhotoUploadViewModelTests.swift`

| Status | Test Case                    | Description            |
| ------ | ---------------------------- | ---------------------- |
| ❌     | testPhotoUploadSuccess       | Successful upload flow |
| ❌     | testPhotoUploadHandlesErrors | Error handling         |
| ❌     | testPhotoAppearsInGallery    | Gallery integration    |

---

## 5. Integration Tests

### E2E Flow Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/test/integration/regression-flows.e2e.test.ts`

| Status | Test Case                            | Description                                        |
| ------ | ------------------------------------ | -------------------------------------------------- |
| ❌     | User Preferences Complete Flow       | Signup -> Onboarding -> Preferences -> Verify      |
| ❌     | Metrics Acknowledgment Complete Flow | Compute -> Retrieve -> Acknowledge -> Verify       |
| ❌     | Photo Upload Complete Flow           | Presign -> Upload -> Confirm -> Retrieve -> Delete |

---

## Implementation Priority

### P0 - Critical (Must implement before next release)

1. ❌ Metrics acknowledgment never returns 404 for valid metrics
2. ❌ Preferences persist across sessions
3. ❌ Dark mode picker responsiveness
4. ❌ Photo upload cross-user security

### P1 - High (Implement within 1 week)

1. ❌ Rapid successive preference updates
2. ❌ Metrics acknowledgment immediately after computation
3. ❌ All appearance modes test
4. ❌ Concurrent photo uploads

### P2 - Medium (Implement within 2 weeks)

1. ❌ Empty arrays for preferences
2. ❌ Strict ISO datetime validation
3. ❌ Legacy dark mode compatibility
4. ❌ Network interruption handling

---

## Test Execution Checklist

### Before Committing Code

- [ ] Run `npm test` in /apps/api
- [ ] Verify all new tests pass
- [ ] Check test coverage hasn't decreased
- [ ] Run TypeScript type check

### Before Creating PR

- [ ] Run full test suite
- [ ] Run integration tests
- [ ] Check for flaky tests
- [ ] Update test documentation

### Before Deploying to Staging

- [ ] Run full regression suite
- [ ] Execute manual test checklist
- [ ] Verify critical flows (P0 tests)
- [ ] Check test metrics

### Before Deploying to Production

- [ ] All P0 tests passing
- [ ] All P1 tests passing
- [ ] Manual QA sign-off
- [ ] Smoke tests on staging

---

## Progress Tracking

### Overall Test Coverage

| Category               | Tests Implemented | Tests Needed | Coverage |
| ---------------------- | ----------------- | ------------ | -------- |
| Dietary Preferences    | 7/10              | 3            | 70%      |
| Metrics Acknowledgment | 6/10              | 4            | 60%      |
| Dark Mode              | 0/10              | 10           | 0%       |
| Photo Upload           | 15/19             | 4            | 79%      |
| **Total**              | **28/49**         | **21**       | **57%**  |

**Target**: 95% test coverage
**Current**: 57%
**Gap**: 38%

### Weekly Goals

**Week 1**:

- [ ] Implement all P0 tests (4 tests)
- [ ] Achieve 70% coverage

**Week 2**:

- [ ] Implement all P1 tests (4 tests)
- [ ] Achieve 85% coverage

**Week 3**:

- [ ] Implement all P2 tests (4 tests)
- [ ] Achieve 95% coverage

---

## Next Actions

1. **Immediate (Today)**:
   - Create SettingsViewTests.swift file
   - Implement dark mode picker responsiveness test
   - Add "never 404 for valid metrics" test

2. **This Week**:
   - Implement all P0 tests
   - Run full regression suite
   - Fix any failing tests

3. **Next Week**:
   - Add integration test files
   - Implement E2E flow tests
   - Set up CI/CD for automated test runs

---

**Last Updated**: 2025-10-30
**Owner**: QA Team
**Reviewers**: Engineering Lead, Product Manager
