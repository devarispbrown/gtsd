# Performance Testing Quick Reference

Quick reference card for iOS app performance testing and validation.

## Performance Targets - At a Glance

| Metric | Target | Command |
|--------|--------|---------|
| Weight update flow | < 2000ms | Manual + Instruments |
| Cache hit | < 50ms | `testPlanFetchPerformance_CacheHit` |
| API request | < 300ms | `testPlanFetchPerformance_CacheMiss` |
| JSON decode | < 50ms | `testJSONDecodingPerformance` |
| Cache operations | < 10ms | `testCacheWritePerformance` |
| Background refresh | < 300ms | Manual + Network Instrument |
| Animation FPS | 60 FPS | Manual + Core Animation Instrument |
| Memory baseline | < 50MB | `testMemoryUsageDuringRepeatedFetches` |
| Memory growth | < 5MB | `testMemoryUsageDuringRepeatedFetches` |
| Memory leaks | 0 | `testPlanStoreMemoryLeaks` |

---

## Quick Commands

### Run All Performance Tests
```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
./run-performance-tests.sh
```

### Run Specific Test
```bash
xcodebuild test \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:GTSDTests/PerformanceTests/testPlanFetchPerformance_CacheHit
```

### Check Memory Usage
```swift
// In code
PerformanceMonitor.logMemoryUsage("Context")
```

### Enable Performance Overlay
```swift
// Add to any view
.performanceOverlay(enabled: true)
```

---

## Instruments Quick Start

### 1. Time Profiler (Operation Timing)
```bash
# Launch from terminal
open /Applications/Xcode.app/Contents/Applications/Instruments.app
```
1. Select "Time Profiler"
2. Choose GTSD app
3. Start recording
4. Perform operation
5. Stop recording
6. Analyze call tree

**Focus On**: `PlanService.generatePlan()`, `PlanStore.fetchPlan()`

### 2. Core Animation (FPS)
1. Launch Instruments → Core Animation
2. Navigate to screen with animations
3. Start recording
4. Trigger animation
5. Stop recording
6. Check "Frame Rate" graph (should be solid 60 FPS)

**Check**: All animations, scrolling, transitions

### 3. Leaks (Memory Leaks)
1. Launch Instruments → Leaks
2. Record baseline
3. Perform operations (fetch plan 50x, navigate 20x)
4. Look for red leak indicators
5. Review "Leaks" section

**Target**: 0 leaks

### 4. Network (Background Refresh)
1. Launch Instruments → Network
2. Trigger background refresh
3. Verify no main thread blocking
4. Check request timing < 300ms

---

## Manual Test Checklists

### Weight Update Flow (Critical)
- [ ] Open ProfileEditView
- [ ] Change weight value
- [ ] Tap "Save" button
- [ ] **Start timer**
- [ ] Wait for PlanSummaryView update
- [ ] **Stop timer**
- [ ] Record: _______ ms (target: < 2000ms)

### Cache Hit Performance
- [ ] Fetch plan once (cache populate)
- [ ] Navigate away
- [ ] **Start timer**
- [ ] Navigate back to plan
- [ ] **Stop timer**
- [ ] Record: _______ ms (target: < 50ms)
- [ ] Verify: No network activity

### Animation Frame Rate
Test each animation:
- [ ] Checkmark animation: _____ FPS
- [ ] Number transitions: _____ FPS
- [ ] Shimmer effect: _____ FPS
- [ ] Modal presentations: _____ FPS
- [ ] Pull-to-refresh: _____ FPS

**Target**: All 60 FPS

### Memory Profile
- [ ] Record baseline: _____ MB
- [ ] Fetch plan 50 times
- [ ] Final memory: _____ MB
- [ ] Growth: _____ MB (target: < 5MB)
- [ ] Leaks: _____ (target: 0)

---

## Console Log Quick Check

### Good Performance
```
⏱️ Completed: Plan Generation in 287.42ms
⏱️ Completed: Cache Load in 38.21ms
💾 Memory Usage: 43.52 MB
```

### SLA Violation (Needs Investigation)
```
⚠️ SLA VIOLATION: Plan Generation took 487.32ms (SLA: 300ms)
⚠️ Memory usage exceeds 50MB baseline: 56.84 MB
📉 Frame drops detected: 54.2 FPS
```

---

## Common Issues & Quick Fixes

| Issue | Symptom | Quick Fix |
|-------|---------|-----------|
| Slow API calls | > 300ms | Check network, profile backend |
| Slow cache reads | > 50ms | Clear UserDefaults, check JSON size |
| Frame drops | < 60 FPS | Use `.drawingGroup()`, simplify views |
| Memory leaks | Growth > 5MB | Check `[weak self]` in closures |
| High memory | > 50MB | Clear caches, profile allocations |

---

## Performance Test File Locations

```
GTSD/
├── GTSDTests/
│   └── Performance/
│       └── PerformanceTests.swift          # Automated tests
├── GTSD/Core/Utilities/
│   └── PerformanceMonitor.swift             # Monitoring utilities
├── PERFORMANCE_TESTING_GUIDE.md             # Full guide (this file)
├── PERFORMANCE_QUICK_REFERENCE.md           # Quick reference
└── run-performance-tests.sh                 # Test runner script
```

---

## Key Code Additions

### 1. Performance Monitoring in Services
```swift
// PlanService.swift
func generatePlan() async throws -> PlanGenerationData {
    return try await PerformanceMonitor.track(
        "Plan Generation",
        sla: PerformanceMonitor.SLA.apiRequest
    ) {
        // API call
    }
}
```

### 2. Cache Operations Tracking
```swift
// PlanStore.swift
private func loadFromCache() {
    let timer = PerformanceMonitor.startTimer("Cache Load", sla: PerformanceMonitor.SLA.cacheHit)
    defer { timer.stop() }
    // ... cache logic
}
```

### 3. Debug Overlay
```swift
// Any View
.performanceOverlay(enabled: true)
```

---

## Report Template (Condensed)

```markdown
## Performance Test Results - [DATE]

**Device**: iPhone 15 Pro | **iOS**: 18.0 | **Build**: Release

### Automated Tests
| Test | Target | Actual | Status |
|------|--------|--------|--------|
| Cache Hit | < 50ms | __ms | ☐ |
| Cache Miss | < 300ms | __ms | ☐ |
| Weight Update | < 2000ms | __ms | ☐ |
| Memory Growth | < 5MB | __MB | ☐ |
| Memory Leaks | 0 | __ | ☐ |

### Manual Tests
| Test | Target | Actual | Status |
|------|--------|--------|--------|
| FPS (Animations) | 60 | __fps | ☐ |
| Background Refresh | < 300ms | __ms | ☐ |

### Issues
- [ ] Critical: ___________________________
- [ ] Warning: ___________________________

**Overall Status**: ☐ PASS | ☐ FAIL
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Set performance baselines in Xcode
2. Document results
3. Enable production monitoring
4. Schedule regular performance testing

### If Tests Fail ❌
1. Identify failing operation
2. Profile with Instruments
3. Review code for bottlenecks
4. Optimize and re-test
5. Document improvements

---

## Emergency Performance Debug

### App Feels Slow
1. Enable performance overlay: `.performanceOverlay(enabled: true)`
2. Check FPS (should be 60)
3. Check memory (should be < 50MB)
4. Look for SLA violations in console

### App Crashes on Low Memory
1. Run "Allocations" Instrument
2. Look for memory spikes
3. Check image caching
4. Review data retention policies

### Animations Stuttering
1. Run "Core Animation" Instrument
2. Check FPS graph
3. Identify heavy views
4. Apply `.drawingGroup()` or simplify

---

## Contact & Resources

**Full Guide**: `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/PERFORMANCE_TESTING_GUIDE.md`

**Test Script**: `./run-performance-tests.sh --help`

**Apple Docs**: https://developer.apple.com/documentation/xctest/performance_metrics

---

**Last Updated**: 2025-10-28
