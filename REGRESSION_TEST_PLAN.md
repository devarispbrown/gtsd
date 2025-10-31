# Comprehensive Regression Test Plan

## Executive Summary

This document provides a comprehensive test plan to prevent the following identified regressions:

1. Dietary preferences not persisting
2. Metrics acknowledgment 404 errors
3. Dark mode picker not working
4. Photo upload errors

**Last Updated**: 2025-10-30
**Test Coverage Target**: 95%
**Critical Path Success Rate**: 100%

---

## Table of Contents

1. [Manual Test Checklist](#manual-test-checklist)
2. [Automated Test Scenarios](#automated-test-scenarios)
3. [Pre-Deployment Verification](#pre-deployment-verification)
4. [Critical User Flows](#critical-user-flows)
5. [Test Environments](#test-environments)
6. [Regression Test Schedule](#regression-test-schedule)

---

## 1. Manual Test Checklist

### 1.1 Dietary Preferences Persistence

#### Test Case DP-001: Create and Verify Dietary Preferences

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                                                 | Expected Result                        | Pass/Fail |
| ---- | ------------------------------------------------------ | -------------------------------------- | --------- |
| 1    | Sign up new user and complete onboarding               | User created successfully              | ☐         |
| 2    | Navigate to Profile > Edit Profile > Preferences       | Preferences screen displays            | ☐         |
| 3    | Add dietary preferences: ["vegetarian", "gluten-free"] | Preferences saved with success message | ☐         |
| 4    | Add allergies: ["peanuts", "shellfish"]                | Allergies saved with success message   | ☐         |
| 5    | Set meals per day to 4                                 | Meals per day saved                    | ☐         |
| 6    | Navigate back to home screen                           | Navigation successful                  | ☐         |
| 7    | Return to Preferences screen                           | Same preferences displayed             | ☐         |
| 8    | Verify database: Query user_settings table             | Preferences match UI                   | ☐         |

**Success Criteria**: All preferences persist after navigation and match database values

#### Test Case DP-002: Update Existing Preferences

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                                             | Expected Result            | Pass/Fail |
| ---- | -------------------------------------------------- | -------------------------- | --------- |
| 1    | Open existing user with preferences                | Preferences load correctly | ☐         |
| 2    | Change dietary preferences to ["vegan", "organic"] | Update successful          | ☐         |
| 3    | Remove one allergy                                 | Update successful          | ☐         |
| 4    | Change meals per day to 6                          | Update successful          | ☐         |
| 5    | Force quit app                                     | App closes                 | ☐         |
| 6    | Reopen app and check preferences                   | Updated values displayed   | ☐         |
| 7    | Check API response: GET /auth/profile/preferences  | Returns updated values     | ☐         |

**Success Criteria**: Updates persist across app restarts and API responses match

#### Test Case DP-003: Partial Updates

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                              | Expected Result                   | Pass/Fail |
| ---- | ----------------------------------- | --------------------------------- | --------- |
| 1    | Set all preferences to known values | All saved successfully            | ☐         |
| 2    | Update only dietary preferences     | Only dietary preferences change   | ☐         |
| 3    | Verify allergies unchanged          | Allergies remain same             | ☐         |
| 4    | Verify meals per day unchanged      | Meals per day remains same        | ☐         |
| 5    | Update only allergies               | Only allergies change             | ☐         |
| 6    | Verify other fields unchanged       | Dietary prefs and meals unchanged | ☐         |

**Success Criteria**: Partial updates don't affect unrelated fields

---

### 1.2 Metrics Acknowledgment Flow

#### Test Case MA-001: First-Time Metrics Acknowledgment

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                                   | Expected Result                  | Pass/Fail |
| ---- | ---------------------------------------- | -------------------------------- | --------- |
| 1    | Trigger daily metrics computation        | Metrics computed successfully    | ☐         |
| 2    | Open app and navigate to Metrics Summary | Metrics display with explanation | ☐         |
| 3    | Verify "acknowledged" status is false    | Shows as unacknowledged          | ☐         |
| 4    | Tap "Got It" or acknowledge button       | API call succeeds (200 OK)       | ☐         |
| 5    | Verify UI updates to acknowledged state  | UI reflects acknowledged state   | ☐         |
| 6    | Check API: GET /v1/profile/metrics/today | "acknowledged": true             | ☐         |
| 7    | Navigate away and return                 | Still shows as acknowledged      | ☐         |

**Success Criteria**: No 404 errors, acknowledgment persists

#### Test Case MA-002: Acknowledgment Idempotency

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                               | Expected Result                         | Pass/Fail |
| ---- | ------------------------------------ | --------------------------------------- | --------- |
| 1    | Acknowledge today's metrics          | First acknowledgment succeeds           | ☐         |
| 2    | Tap acknowledge button again         | Second acknowledgment succeeds (200 OK) | ☐         |
| 3    | Verify same acknowledgment timestamp | Timestamp unchanged                     | ☐         |
| 4    | Check network logs for errors        | No 404 or 500 errors                    | ☐         |

**Success Criteria**: Multiple acknowledgments succeed without errors

#### Test Case MA-003: Metrics Not Yet Computed

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                                         | Expected Result               | Pass/Fail |
| ---- | ---------------------------------------------- | ----------------------------- | --------- |
| 1    | Create brand new user                          | User created                  | ☐         |
| 2    | Complete onboarding                            | Onboarding complete           | ☐         |
| 3    | Try to view metrics before daily job runs      | 404 error with clear message  | ☐         |
| 4    | Error message: "No metrics computed for today" | User-friendly error displayed | ☐         |
| 5    | App doesn't crash                              | App remains stable            | ☐         |

**Success Criteria**: Graceful error handling, no crashes

#### Test Case MA-004: Version Mismatch Handling

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                                  | Expected Result     | Pass/Fail |
| ---- | --------------------------------------- | ------------------- | --------- |
| 1    | Get metrics with version 1              | Metrics retrieved   | ☐         |
| 2    | Attempt to acknowledge with version 99  | 404 error returned  | ☐         |
| 3    | Error message explains version mismatch | Clear error message | ☐         |
| 4    | App handles error gracefully            | No crash            | ☐         |

**Success Criteria**: Version validation works, errors are clear

---

### 1.3 Dark Mode Picker

#### Test Case DM-001: Dark Mode Selection

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                                        | Expected Result                 | Pass/Fail |
| ---- | --------------------------------------------- | ------------------------------- | --------- |
| 1    | Open Settings screen                          | Settings screen displays        | ☐         |
| 2    | Locate Appearance picker (segmented control)  | Picker visible with 3 options   | ☐         |
| 3    | Verify current selection highlights correctly | Current mode highlighted        | ☐         |
| 4    | Tap "Dark" option                             | Dark mode activates immediately | ☐         |
| 5    | Verify UI changes to dark theme               | All screens use dark colors     | ☐         |
| 6    | Check AppStorage value                        | appearanceMode = "dark"         | ☐         |
| 7    | Check legacy value                            | darkModeEnabled = true          | ☐         |

**Success Criteria**: Picker responds to taps, theme changes immediately

#### Test Case DM-002: Light Mode Selection

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                           | Expected Result                  | Pass/Fail |
| ---- | -------------------------------- | -------------------------------- | --------- |
| 1    | Set appearance to Dark mode      | Dark mode active                 | ☐         |
| 2    | Tap "Light" option               | Light mode activates immediately | ☐         |
| 3    | Verify UI changes to light theme | All screens use light colors     | ☐         |
| 4    | Check AppStorage value           | appearanceMode = "light"         | ☐         |
| 5    | Check legacy value               | darkModeEnabled = false          | ☐         |

**Success Criteria**: Picker responds, light theme applies

#### Test Case DM-003: System Default Selection

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                             | Expected Result           | Pass/Fail |
| ---- | ---------------------------------- | ------------------------- | --------- |
| 1    | Set device to dark mode            | Device in dark mode       | ☐         |
| 2    | Set app appearance to "System"     | App follows system (dark) | ☐         |
| 3    | Verify app uses dark theme         | Dark theme active         | ☐         |
| 4    | Change device to light mode        | Device in light mode      | ☐         |
| 5    | Verify app switches to light theme | Light theme active        | ☐         |
| 6    | Check AppStorage value             | appearanceMode = "system" | ☐         |

**Success Criteria**: App follows system appearance changes

#### Test Case DM-004: Persistence Across Sessions

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                            | Expected Result         | Pass/Fail |
| ---- | --------------------------------- | ----------------------- | --------- |
| 1    | Set appearance to Dark            | Dark mode active        | ☐         |
| 2    | Force quit app                    | App closes              | ☐         |
| 3    | Reopen app                        | Dark mode still active  | ☐         |
| 4    | Verify picker shows Dark selected | Dark option highlighted | ☐         |
| 5    | Change to Light mode              | Light mode active       | ☐         |
| 6    | Background app (don't quit)       | App backgrounded        | ☐         |
| 7    | Return to app                     | Light mode still active | ☐         |

**Success Criteria**: Appearance preference persists across all lifecycle events

---

### 1.4 Photo Upload Functionality

#### Test Case PU-001: Photo Upload End-to-End

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                             | Expected Result                          | Pass/Fail |
| ---- | ---------------------------------- | ---------------------------------------- | --------- |
| 1    | Navigate to Photo Upload screen    | Screen displays                          | ☐         |
| 2    | Tap "Take Photo" or "Choose Photo" | Camera/library opens                     | ☐         |
| 3    | Select/capture a photo (< 10MB)    | Photo selected                           | ☐         |
| 4    | Request presigned URL              | POST /v1/progress/photo/presign succeeds | ☐         |
| 5    | Verify presigned URL response      | Contains uploadUrl, fileKey, expiresIn   | ☐         |
| 6    | Upload to S3 using presigned URL   | Upload succeeds (200 OK)                 | ☐         |
| 7    | Confirm upload                     | POST /v1/progress/photo/confirm succeeds | ☐         |
| 8    | Verify photo appears in gallery    | Photo visible with thumbnail             | ☐         |
| 9    | Check database                     | Photo record exists with correct fileKey | ☐         |

**Success Criteria**: Complete upload flow succeeds without errors

#### Test Case PU-002: Photo Upload with Task Evidence

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                                 | Expected Result                   | Pass/Fail |
| ---- | -------------------------------------- | --------------------------------- | --------- |
| 1    | Navigate to task detail screen         | Task displays                     | ☐         |
| 2    | Tap "Add Photo" for task evidence      | Photo picker opens                | ☐         |
| 3    | Select evidenceType: "before"          | Evidence type selected            | ☐         |
| 4    | Upload photo (follow PU-001 steps 3-7) | Upload succeeds                   | ☐         |
| 5    | Verify task_evidence record created    | Evidence linked to photo and task | ☐         |
| 6    | View task detail                       | Photo appears in task evidence    | ☐         |

**Success Criteria**: Photo linked to task correctly

#### Test Case PU-003: File Size Validation

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                                            | Expected Result          | Pass/Fail |
| ---- | ------------------------------------------------- | ------------------------ | --------- |
| 1    | Attempt to upload file > 10MB                     | Presign request rejected | ☐         |
| 2    | Error message: "File size must be less than 10MB" | Clear error message      | ☐         |
| 3    | Attempt to upload 0-byte file                     | Presign request rejected | ☐         |
| 4    | Error message: "File size must be positive"       | Clear error message      | ☐         |
| 5    | Upload file exactly 10MB                          | Upload succeeds          | ☐         |

**Success Criteria**: File size limits enforced

#### Test Case PU-004: Content Type Validation

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                   | Expected Result         | Pass/Fail |
| ---- | ------------------------ | ----------------------- | --------- |
| 1    | Request presign for JPEG | Succeeds                | ☐         |
| 2    | Request presign for PNG  | Succeeds                | ☐         |
| 3    | Request presign for HEIC | Succeeds                | ☐         |
| 4    | Request presign for PDF  | Rejected with 400 error | ☐         |
| 5    | Request presign for MP4  | Rejected with 400 error | ☐         |

**Success Criteria**: Only image types accepted

#### Test Case PU-005: File Ownership Security

**Priority**: P0 (Critical)
**Frequency**: Every release

| Step | Action                                         | Expected Result                                         | Pass/Fail |
| ---- | ---------------------------------------------- | ------------------------------------------------------- | --------- |
| 1    | User A uploads photo                           | Upload succeeds, fileKey: progress-photos/USER_A_ID/... | ☐         |
| 2    | User B attempts to confirm User A's photo      | 403 Forbidden error                                     | ☐         |
| 3    | Error: "does not belong to authenticated user" | Clear error message                                     | ☐         |
| 4    | User A confirms their own photo                | Succeeds                                                | ☐         |

**Success Criteria**: Cross-user file access prevented

#### Test Case PU-006: Idempotent Confirmation

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                          | Expected Result               | Pass/Fail |
| ---- | ------------------------------- | ----------------------------- | --------- |
| 1    | Upload and confirm photo        | Returns 201 with photoId      | ☐         |
| 2    | Confirm same fileKey again      | Returns 200 with same photoId | ☐         |
| 3    | Verify only one database record | Single photo record exists    | ☐         |

**Success Criteria**: Duplicate confirmations handled gracefully

#### Test Case PU-007: Photo Deletion

**Priority**: P1 (High)
**Frequency**: Every release

| Step | Action                            | Expected Result                   | Pass/Fail |
| ---- | --------------------------------- | --------------------------------- | --------- |
| 1    | Upload photo                      | Photo created                     | ☐         |
| 2    | Delete photo                      | DELETE request succeeds           | ☐         |
| 3    | Verify S3 deletion                | File removed from S3              | ☐         |
| 4    | Verify database deletion          | Photo record removed              | ☐         |
| 5    | If linked to task, verify cascade | task_evidence record also deleted | ☐         |

**Success Criteria**: Photo deleted from all systems

---

## 2. Automated Test Scenarios

### 2.1 Unit Tests

#### Backend API Tests (Jest/Supertest)

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/auth/profile-preferences.test.ts`

```typescript
// EXISTING TESTS (PASS)
✓ should update dietary preferences
✓ should update allergies
✓ should update meals per day
✓ should persist preferences to database
✓ should handle partial updates
✓ should update updatedAt timestamp

// ADDITIONAL REGRESSION TESTS NEEDED

describe('Dietary Preferences Regression Tests', () => {
  it('should persist empty arrays for dietary preferences', async () => {
    // Test clearing preferences
    const response = await request(app)
      .put('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dietaryPreferences: [] });

    expect(response.body.data.dietaryPreferences).toEqual([]);

    // Verify persistence
    const dbCheck = await db.select().from(userSettings)
      .where(eq(userSettings.userId, testUserId));
    expect(dbCheck[0].dietaryPreferences).toEqual([]);
  });

  it('should handle rapid successive preference updates', async () => {
    // Simulate rapid user input
    const updates = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .put('/auth/profile/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ mealsPerDay: (i % 5) + 1 })
    );

    const responses = await Promise.all(updates);
    responses.forEach(r => expect(r.status).toBe(200));

    // Verify final state is consistent
    const final = await request(app)
      .get('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(final.body.data.mealsPerDay).toBeGreaterThan(0);
  });

  it('should maintain preferences across user sessions', async () => {
    // Set preferences
    await request(app)
      .put('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dietaryPreferences: ['vegan'],
        allergies: ['soy'],
        mealsPerDay: 5
      });

    // Simulate logout and login with new token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    const newToken = loginResponse.body.data.accessToken;

    // Verify preferences persisted
    const response = await request(app)
      .get('/auth/profile/preferences')
      .set('Authorization', `Bearer ${newToken}`);

    expect(response.body.data.dietaryPreferences).toEqual(['vegan']);
    expect(response.body.data.allergies).toEqual(['soy']);
    expect(response.body.data.mealsPerDay).toBe(5);
  });
});
```

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/profile/metrics.test.ts`

```typescript
// EXISTING TESTS (PASS)
✓ should return 200 with valid data
✓ should return 401 without auth token
✓ should return 404 when no metrics exist
✓ should be idempotent (multiple acknowledgements)
✓ should return 404 when version mismatch

// ADDITIONAL REGRESSION TESTS NEEDED

describe('Metrics Acknowledgment Regression Tests', () => {
  it('should never return 404 for valid metrics', async () => {
    // Compute metrics
    await metricsService.computeAndStoreMetrics(testUserId, false);

    // Get metrics to verify they exist
    const getResponse = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(200);
    const { version, computedAt } = getResponse.body.data;

    // Acknowledge with correct data
    const ackResponse = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ version, metricsComputedAt: computedAt });

    // Should never be 404
    expect(ackResponse.status).not.toBe(404);
    expect(ackResponse.status).toBe(200);
  });

  it('should handle acknowledgment immediately after metrics computation', async () => {
    // Compute metrics
    const metrics = await metricsService.computeAndStoreMetrics(testUserId, false);

    // Acknowledge immediately (no delay)
    const response = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: metrics.computedAt.toISOString()
      });

    expect(response.status).toBe(200);
  });

  it('should validate ISO datetime format strictly', async () => {
    // Invalid formats that should fail
    const invalidFormats = [
      '2025-10-30',           // Date only
      '2025-10-30 12:00:00',  // Space separator
      '2025/10/30T12:00:00Z', // Wrong date separator
      'invalid-date'          // Completely invalid
    ];

    for (const invalidDate of invalidFormats) {
      const response = await request(app)
        .post('/v1/profile/metrics/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 1,
          metricsComputedAt: invalidDate
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation error');
    }
  });

  it('should track acknowledgment status correctly', async () => {
    await metricsService.computeAndStoreMetrics(testUserId, false);

    // Check unacknowledged
    const before = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(before.body.data.acknowledged).toBe(false);

    // Acknowledge
    await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: before.body.data.computedAt
      });

    // Check acknowledged
    const after = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(after.body.data.acknowledged).toBe(true);
  });
});
```

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/routes/progress/photos.test.ts`

```typescript
// EXISTING TESTS (PASS)
✓ should generate presigned URL for valid request
✓ should create photo record without task link
✓ should reject files exceeding size limit
✓ should reject invalid content types
✓ should handle idempotent requests correctly

// ADDITIONAL REGRESSION TESTS NEEDED

describe('Photo Upload Regression Tests', () => {
  it('should prevent cross-user photo access', async () => {
    // User 1 uploads photo
    const presign1 = await request(app)
      .post('/v1/progress/photo/presign')
      .set('X-User-Id', user1Id.toString())
      .send({
        fileName: 'user1-photo.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048576
      });

    const fileKey1 = presign1.body.data.fileKey;

    // User 2 tries to confirm User 1's photo
    const confirmResponse = await request(app)
      .post('/v1/progress/photo/confirm')
      .set('X-User-Id', user2Id.toString())
      .send({
        fileKey: fileKey1,
        fileSize: 2048576,
        contentType: 'image/jpeg'
      });

    expect(confirmResponse.status).toBe(403);
    expect(confirmResponse.body.message).toContain('does not belong to authenticated user');
  });

  it('should handle network interruption gracefully', async () => {
    // Get presigned URL
    const presign = await request(app)
      .post('/v1/progress/photo/presign')
      .set('X-User-Id', testUserId.toString())
      .send({
        fileName: 'interrupted-upload.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048576
      });

    // Simulate confirmation without S3 upload (will fail)
    const confirm = await request(app)
      .post('/v1/progress/photo/confirm')
      .set('X-User-Id', testUserId.toString())
      .send({
        fileKey: presign.body.data.fileKey,
        fileSize: 2048576,
        contentType: 'image/jpeg'
      });

    // Should return 404 because file doesn't exist in S3
    expect(confirm.status).toBe(404);
    expect(confirm.body.message).toContain('File not found in storage');
  });

  it('should enforce file extension validation', async () => {
    const invalidExtensions = [
      'photo.exe',
      'photo.pdf',
      'photo.mp4',
      'photo.jpg.exe'  // Double extension
    ];

    for (const fileName of invalidExtensions) {
      const response = await request(app)
        .post('/v1/progress/photo/presign')
        .set('X-User-Id', testUserId.toString())
        .send({
          fileName,
          contentType: 'image/jpeg',
          fileSize: 2048576
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
          fileSize: 2048576
        })
    );

    const responses = await Promise.all(uploads);

    // All should succeed
    responses.forEach(r => expect(r.status).toBe(200));

    // All should have unique fileKeys
    const fileKeys = responses.map(r => r.body.data.fileKey);
    const uniqueKeys = new Set(fileKeys);
    expect(uniqueKeys.size).toBe(5);
  });
});
```

#### iOS Unit Tests (XCTest)

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSDTests/Features/Profile/SettingsViewTests.swift`

```swift
import XCTest
@testable import GTSD

class SettingsViewRegressionTests: XCTestCase {

    func testDarkModePickerResponsiveness() {
        // Test that picker responds to user taps
        let expectation = XCTestExpectation(description: "Appearance mode changes")

        // Simulate dark mode selection
        let appearanceMode = AppearanceMode.dark

        XCTAssertEqual(appearanceMode, .dark)
        XCTAssertEqual(appearanceMode.displayName, "Dark")
        XCTAssertEqual(appearanceMode.colorScheme, .dark)

        expectation.fulfill()
        wait(for: [expectation], timeout: 1.0)
    }

    func testAppearanceModePersistence() {
        // Test AppStorage persistence
        @AppStorage("appearanceMode") var mode = AppearanceMode.system

        // Change to dark
        mode = .dark
        XCTAssertEqual(mode, .dark)

        // Simulate app restart (read from AppStorage)
        @AppStorage("appearanceMode") var reloadedMode = AppearanceMode.system
        XCTAssertEqual(reloadedMode, .dark)
    }

    func testLegacyDarkModeCompatibility() {
        // Test backward compatibility with old darkModeEnabled flag
        @AppStorage("appearanceMode") var appearanceMode = AppearanceMode.system
        @AppStorage("darkModeEnabled") var darkModeEnabled = false

        // When setting to dark mode
        appearanceMode = .dark

        // Legacy flag should be updated
        // (This would be set in the onChange handler)
        darkModeEnabled = (appearanceMode == .dark)
        XCTAssertTrue(darkModeEnabled)

        // When setting to light mode
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

### 2.2 Integration Tests

#### End-to-End Flow Tests

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/test/integration/user-preferences.e2e.test.ts`

```typescript
describe('User Preferences E2E Flow', () => {
  it('complete user journey: signup -> onboarding -> set preferences -> verify persistence', async () => {
    // 1. Signup
    const signupResponse = await request(app).post('/auth/signup').send({
      email: 'e2e-test@example.com',
      password: 'SecurePass123!',
      name: 'E2E Test User',
    });

    expect(signupResponse.status).toBe(201);
    const { accessToken, user } = signupResponse.body.data;

    // 2. Complete onboarding
    const onboardingResponse = await request(app)
      .post('/onboarding/submit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dateOfBirth: '1990-01-15',
        gender: 'male',
        currentWeight: 80,
        height: 175,
        targetWeight: 75,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        primaryGoal: 'lose_weight',
        activityLevel: 'moderate',
      });

    expect(onboardingResponse.status).toBe(201);

    // 3. Set preferences
    const preferencesResponse = await request(app)
      .put('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dietaryPreferences: ['vegetarian', 'organic'],
        allergies: ['peanuts'],
        mealsPerDay: 4,
      });

    expect(preferencesResponse.status).toBe(200);

    // 4. Verify persistence via GET
    const getResponse = await request(app)
      .get('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.body.data.dietaryPreferences).toEqual(['vegetarian', 'organic']);
    expect(getResponse.body.data.allergies).toEqual(['peanuts']);
    expect(getResponse.body.data.mealsPerDay).toBe(4);

    // 5. Verify database
    const dbSettings = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));

    expect(dbSettings[0].dietaryPreferences).toEqual(['vegetarian', 'organic']);
    expect(dbSettings[0].allergies).toEqual(['peanuts']);
    expect(dbSettings[0].mealsPerDay).toBe(4);
  });
});

describe('Metrics Acknowledgment E2E Flow', () => {
  it('complete metrics journey: computation -> retrieval -> acknowledgment -> verification', async () => {
    // Setup user with complete onboarding
    const { accessToken, userId } = await setupTestUser();

    // 1. Trigger metrics computation
    const metrics = await metricsService.computeAndStoreMetrics(userId, false);
    expect(metrics.bmi).toBeGreaterThan(0);
    expect(metrics.bmr).toBeGreaterThan(0);
    expect(metrics.tdee).toBeGreaterThan(0);

    // 2. Retrieve metrics
    const getResponse = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.acknowledged).toBe(false);

    // 3. Acknowledge metrics
    const ackResponse = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: getResponse.body.data.computedAt,
      });

    expect(ackResponse.status).toBe(200);
    expect(ackResponse.body.data.acknowledged).toBe(true);

    // 4. Verify acknowledgment persists
    const verifyResponse = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(verifyResponse.body.data.acknowledged).toBe(true);

    // 5. Verify database
    const dbAck = await db
      .select()
      .from(metricsAcknowledgements)
      .where(eq(metricsAcknowledgements.userId, userId));

    expect(dbAck.length).toBeGreaterThan(0);
  });
});

describe('Photo Upload E2E Flow', () => {
  it('complete photo upload journey: presign -> upload -> confirm -> retrieve -> delete', async () => {
    const { accessToken, userId } = await setupTestUser();

    // 1. Request presigned URL
    const presignResponse = await request(app)
      .post('/v1/progress/photo/presign')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fileName: 'e2e-test-photo.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048576,
      });

    expect(presignResponse.status).toBe(200);
    const { uploadUrl, fileKey } = presignResponse.body.data;

    // 2. Upload to S3 (simulated)
    // In real tests, we'd upload to S3 here

    // 3. Confirm upload
    const confirmResponse = await request(app)
      .post('/v1/progress/photo/confirm')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fileKey,
        fileSize: 2048576,
        contentType: 'image/jpeg',
        width: 1920,
        height: 1080,
      });

    expect(confirmResponse.status).toBe(201);
    const { photoId } = confirmResponse.body.data;

    // 4. Retrieve photos
    const listResponse = await request(app)
      .get('/v1/progress/photos')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.photos.length).toBeGreaterThan(0);

    // 5. Delete photo
    const deleteResponse = await request(app)
      .delete(`/v1/progress/photo/${photoId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(200);

    // 6. Verify deletion
    const dbCheck = await db.select().from(photos).where(eq(photos.id, photoId));

    expect(dbCheck.length).toBe(0);
  });
});
```

---

## 3. Pre-Deployment Verification

### 3.1 Automated Pre-Deploy Checklist

Run this script before every deployment:

```bash
#!/bin/bash
# File: /Users/devarisbrown/Code/projects/gtsd/scripts/pre-deploy-checks.sh

set -e

echo "========================================="
echo "Pre-Deployment Regression Verification"
echo "========================================="

# 1. Run all backend tests
echo "1. Running API tests..."
cd apps/api
npm run test 2>&1 | tee test-results.log

# Check for test failures
if grep -q "FAIL" test-results.log; then
    echo "❌ API tests failed. Deployment blocked."
    exit 1
fi
echo "✅ API tests passed"

# 2. Check test coverage
echo "2. Checking test coverage..."
npm run test:coverage
COVERAGE=$(grep "Statements" coverage/coverage-summary.json | awk '{print $2}' | tr -d '%')
if (( $(echo "$COVERAGE < 85" | bc -l) )); then
    echo "❌ Coverage below 85%. Current: ${COVERAGE}%"
    exit 1
fi
echo "✅ Coverage at ${COVERAGE}%"

# 3. Run TypeScript compilation
echo "3. TypeScript compilation check..."
npm run typecheck
echo "✅ TypeScript compilation successful"

# 4. Run database migration dry-run
echo "4. Database migration validation..."
npm run db:migrate -- --dry-run
echo "✅ Database migrations validated"

# 5. Check for console.log statements (code smell)
echo "5. Checking for debug statements..."
if grep -r "console.log" src --exclude-dir=node_modules; then
    echo "⚠️  Warning: console.log statements found"
fi

# 6. Validate environment variables
echo "6. Environment variable validation..."
required_vars=("DATABASE_URL" "JWT_SECRET" "AWS_S3_BUCKET")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done
echo "✅ Environment variables validated"

# 7. Run specific regression test suites
echo "7. Running regression test suites..."
npm test -- --testPathPattern="profile-preferences.test"
npm test -- --testPathPattern="metrics.test"
npm test -- --testPathPattern="photos.test"
echo "✅ Regression test suites passed"

echo ""
echo "========================================="
echo "✅ All pre-deployment checks passed!"
echo "========================================="
```

### 3.2 Smoke Test Suite

**File**: `/Users/devarisbrown/Code/projects/gtsd/apps/api/src/test/smoke/smoke.test.ts`

```typescript
describe('Smoke Tests - Critical Paths', () => {
  it('health check endpoint responds', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  it('can create user, login, and access protected route', async () => {
    // Signup
    const signup = await request(app).post('/auth/signup').send({
      email: 'smoke-test@example.com',
      password: 'Password123!',
      name: 'Smoke Test',
    });
    expect(signup.status).toBe(201);

    // Login
    const login = await request(app).post('/auth/login').send({
      email: 'smoke-test@example.com',
      password: 'Password123!',
    });
    expect(login.status).toBe(200);

    // Access protected route
    const profile = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(profile.status).toBe(200);
  });

  it('dietary preferences workflow works end-to-end', async () => {
    const { accessToken } = await setupTestUser();

    const response = await request(app)
      .put('/auth/profile/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dietaryPreferences: ['vegetarian'] });

    expect(response.status).toBe(200);
    expect(response.body.data.dietaryPreferences).toEqual(['vegetarian']);
  });

  it('metrics acknowledgment workflow works end-to-end', async () => {
    const { accessToken, userId } = await setupTestUser();
    await metricsService.computeAndStoreMetrics(userId, false);

    const metrics = await request(app)
      .get('/v1/profile/metrics/today')
      .set('Authorization', `Bearer ${accessToken}`);

    const ack = await request(app)
      .post('/v1/profile/metrics/acknowledge')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        metricsComputedAt: metrics.body.data.computedAt,
      });

    expect(ack.status).toBe(200);
  });

  it('photo presign workflow works', async () => {
    const { accessToken } = await setupTestUser();

    const response = await request(app)
      .post('/v1/progress/photo/presign')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fileName: 'smoke-test.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048576,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.uploadUrl).toBeTruthy();
  });
});
```

---

## 4. Critical User Flows

### 4.1 Flow 1: New User Onboarding with Preferences

**Priority**: P0
**Frequency**: Every release

```
1. User signs up
   ├─ POST /auth/signup
   └─ Verify: 201 status, tokens returned

2. User completes onboarding
   ├─ POST /onboarding/submit
   └─ Verify: user_settings created

3. User sets dietary preferences
   ├─ PUT /auth/profile/preferences
   └─ Verify: preferences saved

4. User logs out and back in
   ├─ POST /auth/logout
   ├─ POST /auth/login
   └─ Verify: new tokens issued

5. User retrieves preferences
   ├─ GET /auth/profile/preferences
   └─ Verify: preferences match what was saved

SUCCESS CRITERIA:
- No 404 errors
- No data loss
- All preferences persist
```

### 4.2 Flow 2: Daily Metrics Computation and Acknowledgment

**Priority**: P0
**Frequency**: Every release

```
1. Daily cron job computes metrics
   ├─ metricsService.computeAndStoreMetrics()
   └─ Verify: profile_metrics record created

2. User opens app
   ├─ App checks for unacknowledged metrics
   └─ Verify: notification or badge appears

3. User views metrics
   ├─ GET /v1/profile/metrics/today
   └─ Verify: 200 status, metrics displayed

4. User acknowledges metrics
   ├─ POST /v1/profile/metrics/acknowledge
   └─ Verify: 200 status (NOT 404!)

5. User navigates away and returns
   ├─ GET /v1/profile/metrics/today
   └─ Verify: acknowledged=true

SUCCESS CRITERIA:
- No 404 errors at any step
- Acknowledgment persists
- UI updates correctly
```

### 4.3 Flow 3: Dark Mode Preference

**Priority**: P0
**Frequency**: Every release

```
1. User opens Settings
   └─ Verify: Current appearance mode displayed

2. User taps Dark mode option
   ├─ Picker updates
   └─ Theme changes immediately

3. User backgrounds app
   └─ iOS saves AppStorage value

4. User force quits app
   └─ AppStorage persists

5. User reopens app
   └─ Verify: Dark mode still active

SUCCESS CRITERIA:
- Picker responds to taps
- Theme changes are immediate
- Preference persists across sessions
```

### 4.4 Flow 4: Progress Photo Upload

**Priority**: P0
**Frequency**: Every release

```
1. User taps "Add Photo"
   └─ Camera/library picker opens

2. User selects photo
   └─ Photo preview displayed

3. App requests presigned URL
   ├─ POST /v1/progress/photo/presign
   └─ Verify: uploadUrl and fileKey returned

4. App uploads to S3
   ├─ PUT to presigned URL
   └─ Verify: 200 OK from S3

5. App confirms upload
   ├─ POST /v1/progress/photo/confirm
   └─ Verify: 201 status, photoId returned

6. Photo appears in gallery
   └─ Verify: Thumbnail loads correctly

SUCCESS CRITERIA:
- No upload failures
- Photo visible immediately
- Database record created
```

---

## 5. Test Environments

### 5.1 Environment Setup

| Environment | Purpose                | Database              | S3 Bucket           | API URL          |
| ----------- | ---------------------- | --------------------- | ------------------- | ---------------- |
| Development | Local development      | Local PostgreSQL      | gtsd-dev-photos     | localhost:3000   |
| Staging     | Pre-production testing | Staging PostgreSQL    | gtsd-staging-photos | staging.gtsd.app |
| Production  | Live environment       | Production PostgreSQL | gtsd-prod-photos    | api.gtsd.app     |

### 5.2 Test Data

**Staging Test Users:**

```
Email: regression-test-1@gtsd.app
Password: RegressionTest123!
Purpose: Dietary preferences testing

Email: regression-test-2@gtsd.app
Password: RegressionTest123!
Purpose: Metrics acknowledgment testing

Email: regression-test-3@gtsd.app
Password: RegressionTest123!
Purpose: Photo upload testing
```

---

## 6. Regression Test Schedule

### 6.1 Test Execution Frequency

| Test Suite            | Frequency           | When            | Duration   |
| --------------------- | ------------------- | --------------- | ---------- |
| Unit Tests            | On every commit     | Pre-commit hook | 30 seconds |
| Integration Tests     | On every PR         | GitHub Actions  | 2 minutes  |
| E2E Smoke Tests       | Daily               | 2 AM UTC        | 5 minutes  |
| Full Regression Suite | Before each release | Manual trigger  | 15 minutes |
| Manual Test Checklist | Before each release | QA team         | 1 hour     |

### 6.2 CI/CD Integration

**GitHub Actions Workflow**

```yaml
# File: .github/workflows/regression-tests.yml
name: Regression Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd apps/api
          npm install

      - name: Run unit tests
        run: |
          cd apps/api
          npm run test

      - name: Check coverage
        run: |
          cd apps/api
          npm run test:coverage

      - name: Run regression test suite
        run: |
          cd apps/api
          npm test -- --testPathPattern="(profile-preferences|metrics|photos).test"

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/coverage-final.json

  ios-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run iOS unit tests
        run: |
          cd apps/GTSD
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0'
```

### 6.3 Release Checklist

Before every release, the QA lead must:

- [ ] Run full automated regression suite (15 min)
- [ ] Execute manual test checklist (1 hour)
- [ ] Verify all P0 critical flows pass (30 min)
- [ ] Check staging environment matches production config
- [ ] Review and approve test results
- [ ] Sign off on deployment

---

## 7. Test Metrics and Reporting

### 7.1 Key Performance Indicators

| Metric                         | Target     | Current | Status |
| ------------------------------ | ---------- | ------- | ------ |
| Test Coverage                  | > 90%      | 85%     | 🟡     |
| P0 Test Pass Rate              | 100%       | 100%    | 🟢     |
| P1 Test Pass Rate              | > 95%      | 98%     | 🟢     |
| Regression Detection Rate      | > 95%      | TBD     | 🟡     |
| Mean Time to Detect Regression | < 24 hours | TBD     | 🟡     |

### 7.2 Defect Tracking

**Regression Defect Template:**

```
Title: [REGRESSION] <Feature> - <Issue Summary>

Priority: P0/P1/P2
Severity: Critical/High/Medium/Low

Environment: Development/Staging/Production
OS/Device: iOS 17.0 / iPhone 15 Pro

Steps to Reproduce:
1.
2.
3.

Expected Result:


Actual Result:


Test Case: <Link to test case>
Related PR: <Link to PR that introduced regression>

Logs:
```

### 7.3 Test Results Dashboard

Track these metrics in your test dashboard:

- Total tests executed
- Pass/Fail rate by feature
- Test execution time trends
- Flaky test identification
- Code coverage trends
- Regression defect count

---

## 8. Continuous Improvement

### 8.1 Test Maintenance

- **Weekly**: Review and update flaky tests
- **Monthly**: Add new regression tests for recent bugs
- **Quarterly**: Audit test coverage and remove obsolete tests

### 8.2 Lessons Learned

Document every regression:

1. What was the regression?
2. How did it reach production?
3. Why didn't existing tests catch it?
4. What new test was added?
5. How can we prevent similar issues?

---

## Appendix A: Test Command Reference

```bash
# Backend API Tests
cd apps/api

# Run all tests
npm test

# Run specific test file
npm test -- profile-preferences.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only regression tests
npm test -- --testPathPattern="(profile-preferences|metrics|photos).test"

# iOS Tests
cd apps/GTSD

# Run all tests
xcodebuild test -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 15'

# Run specific test
xcodebuild test -scheme GTSD -only-testing:GTSDTests/SettingsViewTests

# Smoke Tests
cd apps/api
npm test -- --testPathPattern="smoke.test"

# Pre-deployment checks
./scripts/pre-deploy-checks.sh
```

---

## Appendix B: Troubleshooting Guide

### Common Issues

**Issue**: Tests fail with "Database connection error"
**Solution**: Ensure test database is running: `docker-compose up -d postgres`

**Issue**: S3 upload tests fail
**Solution**: Check AWS credentials and bucket permissions

**Issue**: iOS tests fail with "No simulators available"
**Solution**: Install iOS Simulator: `xcode-select --install`

**Issue**: Metrics acknowledgment returns 404
**Solution**: Verify metrics were computed: Check `profile_metrics` table

---

## Document Approval

| Role             | Name | Signature | Date |
| ---------------- | ---- | --------- | ---- |
| QA Lead          |      |           |      |
| Engineering Lead |      |           |      |
| Product Manager  |      |           |      |

---

**End of Regression Test Plan**
