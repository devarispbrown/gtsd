# Quick Test Guide - Photo Upload Fix

## Before Testing

### 1. Reset Photo Permissions (if needed)
```bash
xcrun simctl privacy <simulator-id> reset photos com.gtsd.GTSD
```

Or on device:
Settings > General > Transfer or Reset > Reset Location & Privacy

### 2. Build and Run
```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
xcodebuild clean build -project GTSD.xcodeproj -scheme GTSD
```

## Test Cases

### Test 1: First Time Permission Request
**Steps:**
1. Launch app (fresh install or after reset)
2. Navigate to Profile > Edit Profile
3. Tap "Change Photo"

**Expected:**
- iOS permission alert appears
- Message: "GTSD needs access to your photo library to select your profile photo"
- Options: "Allow Access to All Photos", "Select Photos...", or "Don't Allow"

**Verify:**
- [ ] Alert appears
- [ ] Message is clear and specific to profile photos
- [ ] All three options available

### Test 2: Successful Photo Selection
**Steps:**
1. Grant photo access
2. Tap "Change Photo"
3. Select a photo from library
4. Wait for load

**Expected:**
- PhotosPicker opens immediately
- Photo library loads
- Selected photo appears as profile image
- No error messages

**Console logs should show:**
```
[INFO] Loading selected photo from PhotosPicker
[INFO] Photo data loaded successfully, size: XXXXXX bytes
[INFO] Photo loaded successfully: WIDTHxHEIGHT
```

**Verify:**
- [ ] Picker opens
- [ ] Photo selectable
- [ ] Profile image updates
- [ ] No errors
- [ ] Logs show success

### Test 3: Permission Denied
**Steps:**
1. Deny photo access in Settings
2. Tap "Change Photo"

**Expected:**
- Error message: "Unable to access photo. Please check photo library permissions in Settings."
- Alert with "OK" button

**Verify:**
- [ ] Error message appears
- [ ] Message is helpful and actionable
- [ ] Can dismiss and retry

### Test 4: Large Photo (5MB+)
**Steps:**
1. Select a very large photo (high resolution)
2. Wait for load

**Expected:**
- Photo loads (may take a few seconds)
- Image dimensions logged
- Profile image updates

**Console should show:**
```
[INFO] Photo data loaded successfully, size: 5000000+ bytes
[INFO] Photo loaded successfully: 4000x3000 (or similar)
```

**Verify:**
- [ ] Large photo loads successfully
- [ ] File size logged
- [ ] Dimensions logged
- [ ] No memory issues

### Test 5: iCloud Photo (if available)
**Steps:**
1. Select a photo stored in iCloud (not downloaded)
2. Wait for download and load

**Expected:**
- iOS downloads photo automatically
- Photo loads after download
- May show progress indicator

**Verify:**
- [ ] iCloud photo downloads
- [ ] Photo loads after download
- [ ] No errors

### Test 6: Invalid/Corrupt Image
**Steps:**
1. Try to select a corrupted image file

**Expected:**
- Error message: "Photo file is corrupted or in an unsupported format."

**Verify:**
- [ ] Error caught gracefully
- [ ] User-friendly message
- [ ] Can retry with different photo

### Test 7: Cancel Selection
**Steps:**
1. Tap "Change Photo"
2. Cancel without selecting

**Expected:**
- PhotosPicker closes
- No error messages
- Previous photo (if any) remains

**Verify:**
- [ ] Cancel works
- [ ] No errors
- [ ] State unchanged

### Test 8: Multiple Selections
**Steps:**
1. Select photo A
2. Wait for load
3. Tap "Change Photo" again
4. Select photo B

**Expected:**
- Photo A loads and displays
- PhotosPicker reopens
- Photo B replaces photo A

**Verify:**
- [ ] First photo loads
- [ ] Can change again
- [ ] Second photo replaces first
- [ ] No memory leaks

## Console Monitoring

### Watch for these patterns:

**Success:**
```
[INFO] Loading selected photo from PhotosPicker
[INFO] Photo data loaded successfully, size: 1234567 bytes
[INFO] Photo loaded successfully: 1920x1080
```

**Permission Error:**
```
[ERROR] Failed to load selected photo: ..., domain: NSCocoaErrorDomain, code: 257
```

**Format Error:**
```
[ERROR] Failed to create UIImage from photo data
```

**Dimension Error:**
```
[ERROR] Image has invalid dimensions: (0.0, 0.0)
```

## Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| PhotosPicker doesn't open | Permission denied | Check Settings > Privacy > Photos |
| "Unable to Load Photos" immediately | Permission denied or picker error | Grant permission in Settings |
| Long wait time | iCloud download or large file | Wait or try smaller local photo |
| App crashes | Memory issue with large photo | Needs image compression implementation |
| Photo doesn't update UI | Binding issue | Check logs, may be SwiftUI refresh issue |

## Quick Debugging Commands

### Check photo permissions:
```bash
# On Simulator
xcrun simctl privacy <simulator-id> grant photos com.gtsd.GTSD

# Check current permissions
xcrun simctl privacy <simulator-id> get photos com.gtsd.GTSD
```

### View real-time logs:
```bash
# Filter for photo-related logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "GTSD"' --level debug | grep -i photo
```

### Clear app data:
```bash
# On Simulator
xcrun simctl uninstall <simulator-id> com.gtsd.GTSD
```

## Acceptance Criteria

All these must pass before considering the fix complete:

### Must Have
- [x] Project builds successfully
- [ ] PhotosPicker opens on tap
- [ ] Permission request shows correct message
- [ ] Photo selection updates UI
- [ ] Error messages are user-friendly
- [ ] Console logs provide debugging info

### Should Have
- [ ] Works with iCloud photos
- [ ] Works with large photos (5MB+)
- [ ] Gracefully handles permission denial
- [ ] Can change photo multiple times

### Nice to Have
- [ ] Loading indicator during load
- [ ] Photo compression before display
- [ ] Error recovery suggestions
- [ ] Photo preview before selection

## Performance Benchmarks

Track these during testing:

| Metric | Target | Measured |
|--------|--------|----------|
| Time to open picker | < 500ms | ___ ms |
| Small photo load (< 1MB) | < 1s | ___ s |
| Large photo load (> 5MB) | < 5s | ___ s |
| Memory usage increase | < 50MB | ___ MB |
| UI responsiveness | Smooth | _____ |

## Test Report Template

```markdown
## Photo Upload Test Report

**Date**: October 30, 2025
**Device**: iPhone 17 Pro Simulator / iPhone 15 Pro
**iOS Version**: 17.0+
**Build**: Debug/Release

### Test Results

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Permission Request | ⬜ | |
| Photo Selection | ⬜ | |
| Permission Denied | ⬜ | |
| Large Photo | ⬜ | |
| iCloud Photo | ⬜ | |
| Invalid Image | ⬜ | |
| Cancel Selection | ⬜ | |
| Multiple Selections | ⬜ | |

### Issues Found
1.
2.
3.

### Performance
- Open picker: ___ ms
- Load photo: ___ s
- Memory usage: ___ MB

### Recommendations
1.
2.
3.

**Overall Status**: ⬜ Pass / ⬜ Fail / ⬜ Needs Work
```

---

**Quick Start**: Just run tests 1-3 for basic validation.
**Full Test**: Run all 8 tests for comprehensive validation.
**Before Release**: Run on physical device + all test cases.
