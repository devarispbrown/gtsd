# iOS Performance Testing Guide

Comprehensive guide for performance testing and validation of the GTSD iOS application.

## Table of Contents
- [Performance Targets](#performance-targets)
- [Automated Tests](#automated-tests)
- [Manual Testing with Instruments](#manual-testing-with-instruments)
- [Performance Monitoring](#performance-monitoring)
- [Test Execution](#test-execution)
- [Results Interpretation](#results-interpretation)
- [Troubleshooting](#troubleshooting)

---

## Performance Targets

### Critical Path Targets

| Operation | Target (p95) | SLA | Notes |
|-----------|-------------|-----|-------|
| Weight update → Plan refresh | < 2000ms | Critical | End-to-end user flow |
| Cache hit | < 50ms | Critical | Instant data access |
| Cache write | < 10ms | High | Should not block UI |
| API request | < 300ms | High | Backend SLA |
| JSON decode | < 50ms | Medium | Large payloads |
| Background refresh | < 300ms | Medium | Silent, non-blocking |
| UI animation | 60 FPS | Critical | No frame drops |

### Memory Targets

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| Baseline usage | < 50MB | 75MB |
| Growth over 50 operations | < 5MB | 10MB |
| Memory leaks | 0 | Any leak is critical |

---

## Automated Tests

### Running Performance Tests

#### All Tests
```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:GTSDTests/PerformanceTests
```

#### Individual Test
```bash
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:GTSDTests/PerformanceTests/testPlanFetchPerformance_CacheHit
```

#### From Xcode
1. Open `GTSD.xcodeproj`
2. Press `Cmd+U` to run all tests
3. Or: `Cmd+6` → Select `PerformanceTests` → `Cmd+U`

### Test Suite Overview

#### 1. Plan Fetch Performance
**File**: `GTSDTests/Performance/PerformanceTests.swift`

```swift
// Cache miss (API call)
func testPlanFetchPerformance_CacheMiss()
// Target: < 300ms average

// Cache hit (memory/disk)
func testPlanFetchPerformance_CacheHit()
// Target: < 50ms average
```

**What it measures**: Time from `fetchPlan()` call to data availability

**Pass criteria**:
- Cache miss: Average < 300ms (10 iterations)
- Cache hit: Average < 50ms (10 iterations)

#### 2. JSON Performance
```swift
func testJSONDecodingPerformance()
// Target: < 5ms average

func testJSONEncodingPerformance()
// Target: < 5ms average
```

**What it measures**: Time to encode/decode `PlanGenerationData`

**Pass criteria**: Average < 5ms (100 iterations)

#### 3. Cache Operations
```swift
func testCacheWritePerformance()
// Target: < 10ms average

func testCacheReadPerformance()
// Target: < 10ms average
```

**What it measures**: UserDefaults read/write with JSON encode/decode

**Pass criteria**: Average < 10ms (50-100 iterations)

#### 4. End-to-End Flow
```swift
func testWeightUpdateToPlanRefreshPerformance()
// Target: < 2000ms (p95)
```

**What it measures**: Complete flow from weight update to plan display

**Pass criteria**: Average < 1500ms, p95 < 2000ms (5 iterations)

#### 5. Memory Tests
```swift
func testMemoryUsageDuringRepeatedFetches()
// Target: Growth < 5MB

func testPlanStoreMemoryLeaks()
// Target: No leaks

func testPlanServiceMemoryLeaks()
// Target: No leaks
```

**What it measures**: Memory growth and leak detection

**Pass criteria**:
- Growth < 5MB over 50 operations
- All weak references become nil after deallocation

### Setting Performance Baselines

1. Run tests once to get initial results
2. In Xcode: `Product` → `Perform Action` → `Set Baseline`
3. Future test runs will compare against this baseline
4. Update baselines when performance improves

---

## Manual Testing with Instruments

### Scenario 1: Weight Update Flow

**Objective**: Measure total time from "Save" tap to plan display update

**Steps**:
1. Launch app via Instruments
   ```bash
   open /Applications/Xcode.app/Contents/Applications/Instruments.app
   ```
2. Select "Time Profiler" template
3. Choose GTSD app target
4. Start recording
5. Navigate to Profile Edit
6. Change weight from current to new value
7. Tap "Save" button
8. Wait for PlanSummaryView to update
9. Stop recording

**Instruments Configuration**:
- **Tool**: Time Profiler
- **Recording**: Profile entire app lifecycle
- **Focus**: Look for:
  - `ProfileEditViewModel.saveChanges()`
  - `PlanStore.recomputePlan()`
  - `PlanService.generatePlan()`
  - `PlanStore.fetchPlan()`

**Analysis**:
1. Find "Save" button tap in timeline
2. Find UI update completion
3. Measure elapsed time
4. Expand call tree to identify bottlenecks

**Expected Breakdown**:
```
Total: ~1500ms (target < 2000ms)
├── API call: ~300ms (network latency)
├── JSON decode: ~50ms
├── Cache update: ~10ms
├── UI refresh: ~100ms
└── Other overhead: ~1040ms
```

**Pass Criteria**:
- [ ] p95 < 2000ms
- [ ] Average < 1500ms
- [ ] No single operation > 500ms (except network)

---

### Scenario 2: Cache Hit Performance

**Objective**: Measure time to display cached plan

**Steps**:
1. Launch Instruments with "Time Profiler"
2. Fetch plan once (populates cache)
3. Navigate away from plan screen
4. **Start recording** in Instruments
5. Navigate back to plan screen
6. **Stop recording** when data displays

**Analysis**:
- Focus on: `PlanStore.fetchPlan()` with cache hit path
- Should see immediate return (< 50ms)
- Minimal CPU usage

**Expected Results**:
```
Cache Hit: ~30-40ms
├── Cache validation: ~1ms
├── Data retrieval: ~5ms
├── JSON decode: ~5ms
└── UI update: ~20ms
```

**Pass Criteria**:
- [ ] Total time < 50ms
- [ ] No network activity
- [ ] Smooth UI transition

---

### Scenario 3: Background Refresh

**Objective**: Verify silent background refresh doesn't block UI

**Steps**:
1. Launch Instruments with "Network" template
2. Load plan with cache > 30 minutes old
3. Trigger background refresh (automatic after 30min)
4. Monitor network activity
5. Verify UI remains responsive

**Instruments Configuration**:
- **Tool**: Network Activity
- **Monitor**: Background URLSession tasks
- **Check**: No UI thread blocking

**Expected Results**:
```
Background Refresh: ~250ms
├── Network request: ~200ms (async)
├── JSON decode: ~30ms (background)
└── Cache update: ~20ms (background)
```

**Pass Criteria**:
- [ ] Refresh completes < 300ms
- [ ] No main thread blocking
- [ ] UI scrolling remains at 60 FPS

---

### Scenario 4: Animation Frame Rate

**Objective**: Ensure all animations maintain 60 FPS

**Animations to Test**:
1. PlanChangeSummaryView entrance (checkmark animation)
2. AnimatedNumber transitions
3. Widget shimmer effect
4. Modal presentations
5. Pull-to-refresh

**Steps**:
1. Launch Instruments with "Core Animation" template
2. Navigate to view with animation
3. **Start recording**
4. Trigger animation
5. **Stop recording** after animation completes

**Instruments Configuration**:
- **Tool**: Core Animation
- **Focus**: Frame rate graph
- **Threshold**: < 60 FPS is a failure

**Analysis**:
1. Check "Frame Rate" graph
2. Look for dips below 60 FPS
3. Identify frames that took > 16.67ms
4. Examine call tree for heavy operations

**Expected Results**:
```
All animations: 60 FPS steady
├── Checkmark animation: 60 FPS ✅
├── Number transitions: 60 FPS ✅
├── Shimmer effect: 60 FPS ✅
├── Modal present: 60 FPS ✅
└── Pull-to-refresh: 60 FPS ✅
```

**Pass Criteria**:
- [ ] No frame drops below 60 FPS
- [ ] Animations feel smooth and responsive
- [ ] No jank or stuttering

**Common Issues**:
- Heavy computation on main thread → Move to background
- Large images not cached → Implement image caching
- Complex view hierarchies → Simplify or lazy load

---

### Scenario 5: Memory Usage

**Objective**: Detect memory leaks and excessive growth

**Steps**:
1. Launch Instruments with "Leaks" template
2. Record baseline memory
3. Fetch plan 50 times
4. Navigate between screens 20 times
5. Trigger plan updates 10 times
6. Check for leaks
7. Measure final memory

**Instruments Configuration**:
- **Tool**: Allocations + Leaks
- **Track**: All memory growth
- **Check**: Leaked objects

**Analysis**:
1. Look for red leak indicators
2. Check "Allocations" growth over time
3. Examine "Leaks" for retained cycles
4. Review "Abandoned Memory"

**Expected Results**:
```
Memory Profile:
├── Baseline: 42 MB
├── After 50 fetches: 44 MB (+2 MB) ✅
├── After navigation: 45 MB (+3 MB) ✅
├── Leaks detected: 0 ✅
└── Final: 45 MB (< 50 MB target) ✅
```

**Pass Criteria**:
- [ ] Growth < 5MB
- [ ] No memory leaks
- [ ] No abandoned allocations
- [ ] Memory usage returns to baseline after operations

**Common Leaks**:
- Strong reference cycles (use `[weak self]` in closures)
- Timers not invalidated
- Observers not removed
- Cached data not released

---

## Performance Monitoring

### Runtime Monitoring

The app includes built-in performance monitoring via `PerformanceMonitor`:

#### Automatic Monitoring

All critical operations are automatically tracked:
```swift
// PlanService.swift
func generatePlan() async throws -> PlanGenerationData {
    return try await PerformanceMonitor.track(
        "Plan Generation",
        sla: PerformanceMonitor.SLA.apiRequest
    ) {
        // API call here
    }
}
```

#### Manual Timing
```swift
let timer = PerformanceMonitor.startTimer("Custom Operation", sla: 0.5)
// ... do work ...
timer.stop() // Logs duration and SLA violations
```

#### Memory Logging
```swift
PerformanceMonitor.logMemoryUsage("After Plan Fetch")
// Logs: "💾 Memory Usage [After Plan Fetch]: 43.52 MB"
```

### Debug Performance Overlay

Add to any view for real-time metrics:
```swift
struct ContentView: View {
    var body: some View {
        MyView()
            .performanceOverlay(enabled: true)
    }
}
```

**Displays**:
- Current FPS (green = good, red = drops)
- Memory usage (MB)
- Updates every second

**Usage**:
- Enable during development
- Monitor during testing
- Disable for production builds

---

## Test Execution

### Pre-Flight Checklist

Before running performance tests:

- [ ] Close all other apps
- [ ] Disable background processes
- [ ] Use a consistent device/simulator (iPhone 15 Pro recommended)
- [ ] Use same iOS version for all tests
- [ ] Ensure good network connectivity (WiFi preferred)
- [ ] Run tests multiple times for consistency
- [ ] Record device temperature (thermal throttling affects results)

### Running Complete Test Suite

```bash
#!/bin/bash
# performance-test.sh

echo "🏃 Running GTSD Performance Tests..."

# 1. Clean build
echo "🧹 Cleaning build..."
xcodebuild clean \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# 2. Build app
echo "🔨 Building app..."
xcodebuild build-for-testing \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# 3. Run performance tests
echo "⏱️  Running performance tests..."
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:GTSDTests/PerformanceTests \
  -resultBundlePath ./TestResults.xcresult

# 4. Generate report
echo "📊 Generating report..."
xcrun xcresulttool get --format json --path ./TestResults.xcresult > performance_results.json

echo "✅ Tests complete! Results saved to performance_results.json"
```

Make executable and run:
```bash
chmod +x performance-test.sh
./performance-test.sh
```

### Viewing Results

#### In Xcode
1. `Cmd+9` to open Reports Navigator
2. Select latest test run
3. View performance metrics

#### Command Line
```bash
xcrun xcresulttool get --path ./TestResults.xcresult
```

#### JSON Export
```bash
xcrun xcresulttool get --format json --path ./TestResults.xcresult | jq
```

---

## Results Interpretation

### Understanding XCTest Metrics

#### Clock Time (XCTClockMetric)
- Measures wall clock time
- Affected by system load
- Use for: Most operations
- Baseline: Set after 3 consistent runs

#### Memory (XCTMemoryMetric)
- Measures physical memory usage
- Peak and average tracked
- Use for: Memory growth tests
- Baseline: Set on clean launch

### Performance Baselines

Baselines are stored in:
```
GTSD.xcodeproj/xcshareddata/xcbaselines/
```

**Setting Baselines**:
1. Run test 3-5 times
2. Verify consistent results (< 10% variance)
3. `Product` → `Perform Action` → `Set Baseline`

**Updating Baselines**:
- After performance improvements
- After major refactors
- When SLAs change

**Baseline Tolerance**:
```swift
// Default: 10% variance allowed
// Can be configured per test
```

### SLA Violation Logs

Look for warnings in console:
```
⚠️ SLA VIOLATION: Plan Generation took 487.32ms (SLA: 300ms)
```

**Action Items**:
1. Identify the operation
2. Profile with Instruments
3. Optimize bottleneck
4. Re-run tests

### Pass/Fail Criteria

#### Test Passes If:
- Average within baseline ± 10%
- p95 within target
- No SLA violations
- No memory leaks
- Memory growth < 5MB

#### Test Fails If:
- Average exceeds baseline by > 10%
- p95 exceeds target
- SLA violations detected
- Memory leaks found
- Memory growth > 5MB

---

## Troubleshooting

### Common Issues

#### 1. Tests Timeout
**Symptom**: Test fails with timeout error

**Solutions**:
- Increase timeout: `wait(for: [expectation], timeout: 10.0)`
- Check network connectivity
- Verify backend is running
- Use mock services for unit tests

#### 2. Inconsistent Results
**Symptom**: Test results vary by > 20% between runs

**Solutions**:
- Close background apps
- Use physical device instead of simulator
- Check thermal throttling (device too hot)
- Run tests multiple times and take average
- Disable animations: `UIView.setAnimationsEnabled(false)`

#### 3. Memory Leaks Not Detected
**Symptom**: Leaks exist but tests pass

**Solutions**:
- Use Instruments "Leaks" tool (more sensitive)
- Extend autorelease pool timing
- Add longer delays: `Task.sleep(nanoseconds: 1_000_000_000)`
- Check weak references manually

#### 4. Cache Tests Fail
**Symptom**: Cache hit still takes > 50ms

**Solutions**:
- Clear UserDefaults before test
- Verify cache is actually populated
- Check JSON decode performance separately
- Profile with Time Profiler

#### 5. Animation Tests Show Frame Drops
**Symptom**: FPS < 60 during animations

**Solutions**:
- Use `.drawingGroup()` for complex views
- Implement lazy loading
- Reduce shadow/blur effects
- Profile with Core Animation Instrument

### Debug Mode Performance

Performance tests should run in **Release** mode for accurate results:

```bash
xcodebuild test \
  -scheme GTSD \
  -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

**Debug vs Release Differences**:
| Operation | Debug | Release | Delta |
|-----------|-------|---------|-------|
| JSON Decode | ~80ms | ~30ms | 2.6x |
| API Call | ~350ms | ~300ms | 1.16x |
| View Render | ~150ms | ~50ms | 3x |

---

## Performance Report Template

Use this template to document test results:

```markdown
# Performance Test Results

## Test Environment
- **Date**: 2025-10-28
- **Device**: iPhone 15 Pro
- **iOS Version**: 18.0
- **Network**: WiFi (50 Mbps)
- **Build**: Release
- **Temperature**: Normal (< 40°C)

## Automated Test Results

### Plan Fetch Performance
| Test | Target | Actual | Status |
|------|--------|--------|--------|
| Cache Miss | < 300ms | 287ms | ✅ PASS |
| Cache Hit | < 50ms | 38ms | ✅ PASS |

### JSON Performance
| Test | Target | Actual | Status |
|------|--------|--------|--------|
| Decode | < 5ms | 3.2ms | ✅ PASS |
| Encode | < 5ms | 2.8ms | ✅ PASS |

### Cache Operations
| Test | Target | Actual | Status |
|------|--------|--------|--------|
| Write | < 10ms | 6.4ms | ✅ PASS |
| Read | < 10ms | 7.1ms | ✅ PASS |

### End-to-End Flow
| Attempt | Duration | Status |
|---------|----------|--------|
| 1 | 1,423ms | ✅ |
| 2 | 1,589ms | ✅ |
| 3 | 1,721ms | ✅ |
| 4 | 1,834ms | ✅ |
| 5 | 1,956ms | ✅ |
| **Average** | **1,705ms** | ✅ PASS |
| **p95** | **1,910ms** | ✅ PASS (< 2000ms) |

### Memory Tests
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Baseline | < 50MB | 42.3MB | ✅ PASS |
| After 50 fetches | < 5MB growth | +2.5MB | ✅ PASS |
| Leaks | 0 | 0 | ✅ PASS |

## Manual Instrument Results

### Animation FPS
| Animation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Checkmark | 60 FPS | 60 FPS | ✅ PASS |
| Number transition | 60 FPS | 58 FPS | ⚠️ WARN |
| Shimmer effect | 60 FPS | 55 FPS | ❌ FAIL |
| Modal present | 60 FPS | 60 FPS | ✅ PASS |

### Background Refresh
- **Duration**: 267ms
- **UI Blocked**: NO
- **Status**: ✅ PASS

## Issues Found

### Critical (Must Fix)
1. **Shimmer animation frame drops**
   - Current: 55 FPS
   - Target: 60 FPS
   - Impact: Noticeable stutter on older devices
   - Action: Simplify gradient animation or use prerendered frames

### Warning (Should Fix)
1. **Number transition occasional drops**
   - Current: 58 FPS (occasional)
   - Target: 60 FPS
   - Impact: Minor, only on complex views
   - Action: Profile and optimize if time permits

## Recommendations

1. **Shimmer Animation**: Replace gradient animation with simpler opacity fade
2. **Cache Preload**: Implement predictive cache warming for faster initial load
3. **Image Caching**: Add image cache to reduce memory pressure
4. **Background Fetch**: Implement iOS Background App Refresh for data freshness

## Overall Assessment

**Status**: ✅ PASS (with minor issues)

**Summary**:
- 9/10 automated tests passing
- 3/4 animation tests passing
- Background refresh working correctly
- Memory usage within targets
- No leaks detected

**Production Ready**: YES (with shimmer fix recommended)
```

---

## Next Steps

After validating performance:

1. **Fix Critical Issues**: Address any SLA violations or frame drops
2. **Set Baselines**: Lock in good performance as baseline
3. **CI Integration**: Add performance tests to CI pipeline
4. **Monitoring**: Enable production performance monitoring
5. **Regular Testing**: Run full suite before each release

---

## Additional Resources

### Apple Documentation
- [XCTest Performance Metrics](https://developer.apple.com/documentation/xctest/performance_metrics)
- [Instruments User Guide](https://help.apple.com/instruments/mac/current/)
- [Optimizing App Performance](https://developer.apple.com/documentation/xcode/improving-your-app-s-performance)

### Instruments Templates
- **Time Profiler**: CPU usage and method timing
- **Allocations**: Memory usage and growth
- **Leaks**: Memory leak detection
- **Core Animation**: FPS and rendering performance
- **Network**: Network requests and bandwidth

### Performance Best Practices
1. Profile early and often
2. Measure before optimizing
3. Focus on user-perceived performance
4. Optimize critical paths first
5. Use asynchronous operations
6. Implement intelligent caching
7. Lazy load when possible
8. Monitor production metrics

---

## Contact

For questions or issues with performance testing:
- Review: This guide
- Check: Console logs for SLA violations
- Profile: Use Instruments for deep dive
- Document: Use performance report template
