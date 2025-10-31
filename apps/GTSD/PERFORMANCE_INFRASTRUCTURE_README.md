# iOS Performance Testing Infrastructure

Complete performance testing and monitoring system for GTSD iOS app.

---

## Quick Start

### 1. Fix Build Issue (Required)
```bash
# Open Xcode
open /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD.xcodeproj

# Remove Info.plist from Copy Bundle Resources:
# Target → Build Phases → Copy Bundle Resources → Remove Info.plist
```

### 2. Run Automated Tests
```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
./run-performance-tests.sh
```

### 3. Review Results
- Results open automatically in Xcode
- Check console for SLA violations
- Document findings using provided templates

---

## What's Included

### 📊 Automated Test Suite
**File**: `GTSDTests/Performance/PerformanceTests.swift`

10+ automated performance tests covering:
- API request timing (< 300ms)
- Cache operations (< 50ms)
- JSON processing (< 50ms)
- Memory usage (< 5MB growth)
- Memory leak detection (0 leaks)
- End-to-end flows (< 2000ms)

### 🔍 Performance Monitoring
**File**: `GTSD/Core/Utilities/PerformanceMonitor.swift`

Runtime monitoring with:
- Automatic SLA tracking
- Memory usage monitoring
- FPS monitoring (60 FPS target)
- Debug performance overlay
- Console logging

### 📚 Documentation
**Files**:
- `PERFORMANCE_TESTING_GUIDE.md` - Complete guide (1000+ lines)
- `PERFORMANCE_QUICK_REFERENCE.md` - Quick reference card
- `PERFORMANCE_TESTING_SUMMARY.md` - Implementation summary

### 🤖 Automation
**File**: `run-performance-tests.sh`

Automated test execution with:
- Build verification
- Test execution
- Result generation
- Report export

---

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Weight update flow | < 2000ms | ✅ |
| Cache hit | < 50ms | ✅ |
| API request | < 300ms | ✅ |
| Animation FPS | 60 FPS | ✅ |
| Memory baseline | < 50MB | ⚠️ |
| Memory leaks | 0 | ✅ |

---

## Usage Examples

### Automated Testing
```bash
# Run all tests
./run-performance-tests.sh

# Specific device
./run-performance-tests.sh --device "iPhone 17 Pro"

# Verbose output
./run-performance-tests.sh --verbose
```

### Runtime Monitoring
```swift
// Track async operation
let result = await PerformanceMonitor.track(
    "Operation",
    sla: PerformanceMonitor.SLA.apiRequest
) {
    return await performOperation()
}

// Memory check
PerformanceMonitor.logMemoryUsage("After fetch")

// Debug overlay
MyView()
    .performanceOverlay(enabled: true)
```

### Manual Instruments Testing
```bash
# Launch Instruments
open /Applications/Xcode.app/Contents/Applications/Instruments.app

# Select template:
# - Time Profiler (CPU)
# - Core Animation (FPS)
# - Leaks (Memory)
# - Network (Requests)
```

---

## Test Scenarios

### Automated (XCTest)
1. **Cache Hit** - Measures cached data access (< 50ms)
2. **Cache Miss** - Measures API call time (< 300ms)
3. **JSON Processing** - Measures encode/decode (< 5ms)
4. **Memory Usage** - Tracks growth over 50 operations (< 5MB)
5. **Memory Leaks** - Detects reference cycles (0 leaks)
6. **End-to-End** - Weight update to plan refresh (< 2000ms)

### Manual (Instruments)
1. **Weight Update Flow** - Time Profiler (< 2000ms)
2. **Animation FPS** - Core Animation (60 FPS)
3. **Background Refresh** - Network (< 300ms, non-blocking)
4. **Memory Profile** - Allocations + Leaks (< 5MB growth, 0 leaks)

---

## File Locations

```
/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/

├── GTSDTests/Performance/
│   └── PerformanceTests.swift                 # Automated tests
│
├── GTSD/Core/Utilities/
│   └── PerformanceMonitor.swift               # Monitoring utilities
│
├── GTSD/Core/Services/
│   └── PlanService.swift                      # Modified: Performance tracking
│
├── GTSD/Core/Stores/
│   └── PlanStore.swift                        # Modified: Performance tracking
│
├── PERFORMANCE_TESTING_GUIDE.md               # Complete guide
├── PERFORMANCE_QUICK_REFERENCE.md             # Quick reference
├── PERFORMANCE_TESTING_SUMMARY.md             # Implementation summary
├── PERFORMANCE_INFRASTRUCTURE_README.md       # This file
└── run-performance-tests.sh                   # Test runner
```

---

## Console Output Examples

### Success
```
⏱️ Completed: Plan Generation in 287.42ms
⏱️ Completed: Cache Load in 38.21ms
⏱️ Completed: Cache Write in 6.43ms
💾 Memory Usage: 43.52 MB
```

### SLA Violation
```
⚠️ SLA VIOLATION: Plan Generation took 487.32ms (SLA: 300ms)
⚠️ Memory usage exceeds 50MB baseline: 56.84 MB
📉 Frame drops detected: 54.2 FPS
```

---

## Build Issue (Must Fix First)

**Error**: Multiple commands produce Info.plist

**Fix**:
1. Open `GTSD.xcodeproj` in Xcode
2. Select GTSD target
3. Build Phases → Copy Bundle Resources
4. Remove `Info.plist` from list
5. Clean: `Cmd+Shift+K`
6. Build: `Cmd+B`

---

## Documentation Quick Links

| Document | Purpose | Lines |
|----------|---------|-------|
| [PERFORMANCE_TESTING_GUIDE.md](PERFORMANCE_TESTING_GUIDE.md) | Complete guide with Instruments tutorials | 1000+ |
| [PERFORMANCE_QUICK_REFERENCE.md](PERFORMANCE_QUICK_REFERENCE.md) | Quick reference card | 300+ |
| [PERFORMANCE_TESTING_SUMMARY.md](PERFORMANCE_TESTING_SUMMARY.md) | Implementation summary | 400+ |
| [PERFORMANCE_INFRASTRUCTURE_README.md](PERFORMANCE_INFRASTRUCTURE_README.md) | This file | 200+ |

---

## Performance Checklist

### Before Testing
- [ ] Fix Info.plist build error
- [ ] Clean build folder
- [ ] Close background apps
- [ ] Use consistent device/simulator
- [ ] Ensure good network connection

### Automated Tests
- [ ] Run `./run-performance-tests.sh`
- [ ] Check for SLA violations
- [ ] Review memory growth
- [ ] Verify no leaks
- [ ] Set baselines

### Manual Tests
- [ ] Test weight update flow (< 2000ms)
- [ ] Verify animation FPS (60 FPS)
- [ ] Check background refresh (< 300ms)
- [ ] Profile memory usage (< 50MB)

### Documentation
- [ ] Document test results
- [ ] Note any issues found
- [ ] Create action items
- [ ] Update baselines

---

## Troubleshooting

### Tests Timeout
- Increase timeout values
- Check network connectivity
- Verify backend is running

### Inconsistent Results
- Close background apps
- Use physical device
- Check thermal throttling
- Run multiple times

### Build Fails
- Fix Info.plist duplication
- Clean build folder
- Check Xcode version

### Memory Leaks Not Detected
- Use Instruments (more sensitive)
- Add longer delays
- Check weak references manually

---

## Integration Status

### ✅ Complete
- Automated test suite created
- Performance monitoring implemented
- Documentation written
- Test script created
- Services instrumented
- Stores instrumented

### ⏳ Pending
- Build error fix
- Test execution
- Baseline setting
- Results documentation
- Production deployment

---

## Next Actions

1. **Immediate**: Fix Info.plist build error (5 min)
2. **Short-term**: Run automated tests (10 min)
3. **Short-term**: Run manual Instruments tests (30 min)
4. **Short-term**: Document results (15 min)
5. **Long-term**: Set up CI integration
6. **Long-term**: Enable production monitoring

---

## Success Metrics

### Automated Tests
- ✅ All tests passing
- ✅ Within baseline ± 10%
- ✅ No SLA violations
- ✅ No memory leaks
- ✅ Memory growth < 5MB

### Manual Tests
- ✅ All animations 60 FPS
- ✅ Weight update < 2000ms
- ✅ Background refresh < 300ms
- ✅ Memory < 50MB

### Infrastructure
- ✅ Comprehensive test suite
- ✅ Runtime monitoring
- ✅ Complete documentation
- ✅ Automation scripts
- ✅ Integrated tracking

---

## Support

**Documentation**: See PERFORMANCE_TESTING_GUIDE.md for detailed instructions

**Script Help**: `./run-performance-tests.sh --help`

**Apple Resources**:
- [XCTest Performance](https://developer.apple.com/documentation/xctest/performance_metrics)
- [Instruments Guide](https://help.apple.com/instruments/mac/current/)

---

**Status**: Infrastructure complete, ready for execution

**Created**: 2025-10-28

**Version**: 1.0
