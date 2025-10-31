# Comprehensive Verification Plan: How to Confirm Each Fix Works

## Core Verification Philosophy

**Three Levels of Verification**:

1. **Code Level**: Is the fix in the source code?
2. **Deployment Level**: Is the fix in the running application?
3. **Behavioral Level**: Does the fix solve the user's problem?

All three must pass for a fix to be considered successful.

## Master Verification Checklist

```markdown
## Pre-Fix Verification

- [ ] Issue reproduced in clean environment
- [ ] Exact error message documented
- [ ] Network requests captured
- [ ] Screenshots taken
- [ ] Console logs saved

## Code Verification

- [ ] Fix implemented in correct file
- [ ] Fix committed to git
- [ ] No uncommitted changes (`git status --porcelain` is empty)
- [ ] Fix includes verification stamp
- [ ] Unit tests written (if applicable)

## Deployment Verification

- [ ] Clean build performed
- [ ] Build timestamp verified
- [ ] Verification stamp appears in console
- [ ] Correct version running

## Behavioral Verification

- [ ] Original issue cannot be reproduced
- [ ] Fix works on first attempt
- [ ] Fix survives app restart
- [ ] No side effects introduced
- [ ] User flow completes successfully

## Documentation

- [ ] Test results logged
- [ ] Success criteria met
- [ ] Known limitations documented
- [ ] Rollback plan ready
```

## Fix-Specific Verification Plans

### 1. Photo Selection Fix Verification

#### Code Verification

```bash
# Verify the fix is in code
grep -n "photoLibrary: .shared()" apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift
# Should return: No results (line removed)

grep -n "PhotosPicker" apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift
# Should show PhotosPicker without photoLibrary parameter
```

#### Deployment Verification

```swift
// Add to ProfileEditView.swift
PhotosPicker(selection: $viewModel.selectedPhoto, matching: .images) {
    // UI code
}
.onAppear {
    print("✅ PHOTO FIX DEPLOYED: v1.0-20251030")
}
```

#### Behavioral Verification Test Script

```bash
#!/bin/bash
# test_photo_fix.sh

echo "=== Testing Photo Selection Fix ==="

# 1. Launch app
xcrun simctl launch booted com.gtsd.app --console > photo_test.log 2>&1 &

# 2. Wait for verification
sleep 3
if grep -q "PHOTO FIX DEPLOYED" photo_test.log; then
    echo "✅ Fix deployed"
else
    echo "❌ Fix NOT deployed"
    exit 1
fi

# 3. Manual test steps
cat << 'EOF'
MANUAL TEST REQUIRED:
1. Navigate to Profile > Edit Profile
2. Tap "Change Photo" button
3. PhotosPicker should open
4. Select any photo
5. Photo should load and display

Expected: No "Unable to view" error
Actual: _____________

Test Passed? (y/n):
EOF
read -n 1 RESULT
```

#### Success Criteria

- [ ] Console shows "PHOTO FIX DEPLOYED"
- [ ] Photo picker opens without error
- [ ] Selected photo loads successfully
- [ ] Image displays in profile view
- [ ] No "Unable to view" message

### 2. Metrics Acknowledgment Fix Verification

#### Code Verification

```swift
// File: MetricsSummaryViewModel.swift
// Verify this code exists:
let response = try await metricsService.acknowledgeMetrics(
    version: metricsData.metrics.version,
    metricsComputedAt: metricsData.metrics.computedAtString  // String, not Date
)
```

#### Deployment Verification

```swift
// Add verification logging
func acknowledgeAndContinue() async -> Bool {
    print("✅ METRICS FIX DEPLOYED: v1.0-20251030")
    print("📊 Computed at string: \(metricsData.metrics.computedAtString)")
    print("📊 Format check: \(metricsData.metrics.computedAtString.contains("T") ? "ISO8601" : "Unknown")")

    // Existing code...
}
```

#### Network Verification

```bash
#!/bin/bash
# verify_metrics_network.sh

# 1. Start proxy
mitmproxy -p 8888 --set confdir=~/.mitmproxy &
PROXY_PID=$!

# 2. Configure simulator
xcrun simctl proxy booted set http://localhost:8888

# 3. Trigger metrics acknowledgment in app

# 4. Check captured request
echo "Check mitmproxy for POST /v1/profile/metrics/acknowledge"
echo "Body should contain: metricsComputedAt as ISO8601 string"
echo "Example: 2025-10-30T12:00:00.000Z"

# 5. Cleanup
kill $PROXY_PID
```

#### Backend Verification

```bash
# Test backend directly
TOKEN="your_auth_token"
curl -X POST http://localhost:3000/v1/profile/metrics/acknowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "version": 1,
    "metricsComputedAt": "2025-10-30T12:00:00.000Z"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: HTTP Status: 200
```

#### Success Criteria

- [ ] Console shows "METRICS FIX DEPLOYED"
- [ ] ISO8601 format confirmed in logs
- [ ] POST request contains string timestamp
- [ ] Backend returns 200 OK
- [ ] No 400 Bad Request error
- [ ] User can proceed past metrics screen

### 3. Dietary Preferences Fix Verification

#### Code Verification

```bash
# Backend verification
grep -A 5 "hasCompletedOnboarding" apps/api/src/routes/auth/service.ts
# Should show field being returned

# iOS verification
grep -A 10 "Fetching fresh user data" apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift
# Should show fetch after save
```

#### Deployment Verification

```swift
// ProfileEditViewModel.swift
func saveChanges() async -> Bool {
    print("✅ PREFERENCES FIX DEPLOYED: v1.0-20251030")

    // After saving...
    print("📊 Fetching fresh user data...")
    let freshUser: User = try await apiClient.request(.currentUser)
    print("📊 Fresh user dietary preferences: \(freshUser.dietaryPreferences ?? [])")
    print("📊 Count: \(freshUser.dietaryPreferences?.count ?? 0)")

    await authService.updateCurrentUser(freshUser)
}
```

#### State Verification

```swift
// Add debug view to ProfileEditView
#if DEBUG
VStack {
    Text("DEBUG INFO")
        .font(.caption)
    Text("Saved prefs: \(viewModel.dietaryPreferences.joined(separator: ", "))")
        .font(.caption2)
    Text("User prefs: \(authService.currentUser?.dietaryPreferences?.joined(separator: ", ") ?? "none")")
        .font(.caption2)
}
.padding()
.background(Color.yellow.opacity(0.3))
#endif
```

#### Persistence Test

```bash
#!/bin/bash
# test_preference_persistence.sh

echo "=== Testing Preference Persistence ==="

# 1. Set preferences via API
curl -X POST http://localhost:3000/auth/profile/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dietaryPreferences": ["vegetarian", "gluten-free"]}'

# 2. Fetch current user
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.dietaryPreferences'

# 3. Should show: ["vegetarian", "gluten-free"]

# 4. Kill and restart app
xcrun simctl terminate booted com.gtsd.app
xcrun simctl launch booted com.gtsd.app

# 5. Check if preferences still present in UI
```

#### Success Criteria

- [ ] Console shows "PREFERENCES FIX DEPLOYED"
- [ ] Preferences save returns 200 OK
- [ ] Fresh data fetch occurs after save
- [ ] UI updates with new preferences
- [ ] Preferences persist after app restart
- [ ] Debug view shows matching values

### 4. Onboarding Redirect Fix Verification

#### Code Verification

```typescript
// Backend: apps/api/src/routes/auth/service.ts
// Check getUserWithPreferences includes:
return {
  // ... other fields
  hasCompletedOnboarding: settings?.onboardingCompleted ?? false,
};
```

#### API Response Verification

```bash
#!/bin/bash
# verify_onboarding_field.sh

# Test /auth/me endpoint
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.hasCompletedOnboarding'

# Should return: true (for completed users)
```

#### Navigation Verification

```swift
// GTSDApp.swift
// Add logging to navigation logic
if let user = authService.currentUser {
    print("✅ ONBOARDING FIX: User has completed onboarding: \(user.hasCompletedOnboarding)")

    if !user.hasCompletedOnboarding {
        print("⚠️ Redirecting to onboarding")
        // Show onboarding
    } else {
        print("✅ Staying in main app")
        // Show main app
    }
}
```

#### Success Criteria

- [ ] API returns hasCompletedOnboarding field
- [ ] Field is true for completed users
- [ ] No unwanted redirects to onboarding
- [ ] Console confirms "Staying in main app"
- [ ] Navigation remains stable after profile edits

## Automated Verification Suite

### Create Master Test Script

```bash
#!/bin/bash
# verify_all_fixes.sh

echo "=== GTSD Fix Verification Suite ==="
echo "Started: $(date)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Results array
declare -a RESULTS

# Function to test a fix
test_fix() {
    local name=$1
    local check_command=$2
    local expected=$3

    echo -e "\n${YELLOW}Testing: $name${NC}"

    result=$($check_command 2>&1)

    if [[ $result == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        RESULTS+=("$name: PASSED")
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Expected: $expected"
        echo "Got: $result"
        RESULTS+=("$name: FAILED")
        return 1
    fi
}

# Test 1: Build verification
test_fix "Build System" \
    "xcrun simctl launch booted com.gtsd.app --console 2>&1 | head -20" \
    "BUILD VERIFICATION"

# Test 2: Photo fix
test_fix "Photo Selection" \
    "grep 'photoLibrary:' apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift | wc -l" \
    "0"

# Test 3: Metrics format
test_fix "Metrics Timestamp" \
    "grep 'computedAtString' apps/GTSD/GTSD/Features/MetricsSummary/MetricsSummaryViewModel.swift | wc -l" \
    "1"

# Test 4: Preferences fetch
test_fix "Preferences Refresh" \
    "grep 'Fetching fresh user data' apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift | wc -l" \
    "1"

# Test 5: Onboarding field
test_fix "Onboarding Field" \
    "grep 'hasCompletedOnboarding' apps/api/src/routes/auth/service.ts | wc -l" \
    "2"

# Summary
echo -e "\n${YELLOW}=== VERIFICATION SUMMARY ===${NC}"
for result in "${RESULTS[@]}"; do
    if [[ $result == *"PASSED"* ]]; then
        echo -e "${GREEN}$result${NC}"
    else
        echo -e "${RED}$result${NC}"
    fi
done

echo -e "\nCompleted: $(date)"
```

## Manual Verification Procedures

### User Journey Test

```markdown
## Complete User Journey Verification

### New User Flow

1. [ ] Install fresh app
2. [ ] Create new account
3. [ ] Complete onboarding
4. [ ] View metrics summary
5. [ ] Acknowledge metrics (no 400 error)
6. [ ] Land on home screen
7. [ ] Edit profile
8. [ ] Select photo (no "unable to view")
9. [ ] Add dietary preferences
10. [ ] Save changes
11. [ ] Preferences persist
12. [ ] No redirect to onboarding

### Existing User Flow

1. [ ] Login with existing account
2. [ ] Navigate to profile
3. [ ] Change photo (works first time)
4. [ ] Modify preferences
5. [ ] Save (preferences persist)
6. [ ] Kill app
7. [ ] Relaunch
8. [ ] Preferences still present
9. [ ] Photo still visible
10. [ ] No onboarding redirect
```

## Regression Testing

### After Each Fix

```bash
#!/bin/bash
# regression_check.sh

echo "=== Regression Test ==="

# List of features to verify still work
features=(
    "User can login"
    "User can logout"
    "Tasks load properly"
    "Navigation works"
    "Settings accessible"
    "No crash on launch"
)

for feature in "${features[@]}"; do
    read -p "✓ $feature works? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Regression detected: $feature"
        exit 1
    fi
done

echo "✅ No regressions detected"
```

## Continuous Verification

### Add to CI/CD Pipeline

```yaml
# .github/workflows/verify-fixes.yml
name: Verify Fixes

on:
  push:
    branches: [main, fix/*]

jobs:
  verify:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v2

      - name: Verify Photo Fix
        run: |
          if grep -q "photoLibrary: .shared()" apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift; then
            echo "Photo fix not applied"
            exit 1
          fi

      - name: Verify Metrics Fix
        run: |
          if ! grep -q "computedAtString" apps/GTSD/GTSD/Features/MetricsSummary/MetricsSummaryViewModel.swift; then
            echo "Metrics fix not applied"
            exit 1
          fi

      - name: Verify Preferences Fix
        run: |
          if ! grep -q "Fetching fresh user data" apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift; then
            echo "Preferences fix not applied"
            exit 1
          fi

      - name: Build and Test
        run: |
          xcodebuild clean build test \
            -project apps/GTSD/GTSD.xcodeproj \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Final Verification Checklist

Before declaring victory:

```markdown
## Final Sign-Off Checklist

### All Fixes Verified

- [ ] Photo selection works without "unable to view"
- [ ] Metrics acknowledge without 400 error
- [ ] Dietary preferences persist properly
- [ ] No unwanted onboarding redirects

### No Regressions

- [ ] All existing features still work
- [ ] No new errors in console
- [ ] Performance acceptable
- [ ] Memory usage normal

### Documentation Complete

- [ ] All fixes documented
- [ ] Test results saved
- [ ] Known issues listed
- [ ] Rollback plan ready

### Ready for Production

- [ ] Tested on real device
- [ ] Tested with slow network
- [ ] Tested with no network
- [ ] Tested with multiple users

### Sign-offs

- [ ] Developer tested
- [ ] QA verified
- [ ] Product approved
- [ ] User accepted
```

## The Golden Rule of Verification

**"If you didn't see it work three times in a row, it doesn't work."**

1. First time: Could be luck
2. Second time: Could be cache
3. Third time: It actually works

Always verify fixes work consistently, not just once.
