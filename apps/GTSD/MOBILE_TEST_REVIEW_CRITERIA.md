# Mobile Test Infrastructure Review Criteria

**Reviewer:** mobile-app-developer
**Date:** 2025-10-28
**Review Scope:** iOS Test Suite Architecture & Mock Infrastructure

---

## 1. Mock Architecture Requirements

### 1.1 Thread Safety & Concurrency

**Critical Requirements:**
- [ ] All `@MainActor` mocks properly isolated
- [ ] Actor-based mocks (PlanService) correctly implemented
- [ ] No data races in concurrent test scenarios
- [ ] Proper Sendable conformance where needed

**Anti-patterns to Watch For:**
```swift
// BAD: Actor inheritance (not supported)
actor MockPlanService: PlanService { }

// GOOD: Protocol conformance
actor MockPlanService: PlanServiceProtocol { }
```

### 1.2 Protocol Conformance

**Required Protocols:**
- `APIClientProtocol: @MainActor, ObservableObject`
- `AuthenticationServiceProtocol: @MainActor, ObservableObject`
- `TaskServiceProtocol: @MainActor, ObservableObject`
- `PlanServiceProtocol: Actor`

**Validation Points:**
- [ ] All protocol methods implemented
- [ ] ObservableObject conformance where required
- [ ] Async/await patterns properly supported
- [ ] Error simulation capabilities

### 1.3 Memory Management

**Key Checks:**
- [ ] No retain cycles in closures
- [ ] Weak references used appropriately
- [ ] Mock cleanup in tearDown
- [ ] Memory leak tests present

---

## 2. Mobile-Specific Test Scenarios

### 2.1 Network Conditions

**Required Test Coverage:**
- [ ] Network failure simulation
- [ ] Timeout handling
- [ ] Rate limiting (429)
- [ ] Offline mode with cache
- [ ] Auto-reconnect behavior

### 2.2 App Lifecycle

**Required Test Coverage:**
- [ ] Background/foreground transitions
- [ ] App termination & cold start
- [ ] Deep link handling on launch
- [ ] State restoration

### 2.3 Performance SLAs

**Benchmark Targets (from PerformanceTests.swift):**
- [ ] Cache hit: < 50ms
- [ ] API call: < 300ms (backend SLA)
- [ ] JSON decode: < 50ms
- [ ] Cache update: < 10ms
- [ ] Weight update flow: < 2000ms (p95)

### 2.4 Memory & Resources

**Performance Metrics:**
- [ ] Memory growth < 5MB over 50 fetches
- [ ] No memory leaks in stores
- [ ] No memory leaks in services
- [ ] Proper autoreleasepool usage

---

## 3. Integration Test Validation

### 3.1 Critical User Flows

**Must Be Tested:**
1. **Weight Update Flow**
   - [ ] User updates weight
   - [ ] Plan recomputation triggered
   - [ ] UI updates with new targets
   - [ ] Significant changes detected

2. **Offline Mode**
   - [ ] Cached data displayed when offline
   - [ ] Graceful error handling
   - [ ] Auto-sync on reconnect
   - [ ] Queue operations during offline

3. **Deep Link Navigation**
   - [ ] Notification taps handled
   - [ ] Cold start with deep link
   - [ ] Background to foreground navigation

### 3.2 Error Recovery

**Scenarios:**
- [ ] Network error retry logic
- [ ] Exponential backoff implementation
- [ ] Cache fallback on error
- [ ] User-facing error messages

---

## 4. Code Quality Metrics

### 4.1 Testability Score

**Evaluation Criteria:**
- Protocol-based design (weight: 30%)
- Dependency injection (weight: 25%)
- Mock realism (weight: 20%)
- Test isolation (weight: 15%)
- Error simulation (weight: 10%)

**Scoring:** 1-10 (10 = excellent)

### 4.2 Architecture Score

**Evaluation Criteria:**
- Proper actor isolation (weight: 35%)
- MainActor usage (weight: 25%)
- Memory safety (weight: 20%)
- Thread safety (weight: 20%)

**Scoring:** 1-10 (10 = excellent)

---

## 5. Test Infrastructure Issues

### 5.1 Known Problems (Pre-Fix)

1. **Ambiguous Type Lookups**
   - Multiple `MockPlanService` definitions
   - Multiple `MockAPIClient` definitions
   - Multiple `MockAuthService` definitions

2. **Protocol Conformance Failures**
   - Missing ObservableObject conformance
   - Missing protocol method implementations
   - Incorrect async/await signatures

3. **Actor/Inheritance Violations**
   - Cannot inherit from actor types
   - Cannot inherit from final classes
   - Cannot override methods outside module

4. **Missing Dependencies**
   - XCTest not imported in some files
   - Missing type definitions (NutritionTargets)

### 5.2 Post-Fix Validation

**Build Verification:**
```bash
xcodebuild build-for-testing \
  -scheme GTSD \
  -destination 'platform=iOS Simulator,id=28C916BA-D089-4C30-A338-41425B13A7D5'
```

**Test Execution:**
```bash
# Integration tests
xcodebuild test -scheme GTSD \
  -destination 'platform=iOS Simulator,id=28C916BA-D089-4C30-A338-41425B13A7D5' \
  -only-testing:GTSDTests/Integration

# Performance tests
xcodebuild test -scheme GTSD \
  -destination 'platform=iOS Simulator,id=28C916BA-D089-4C30-A338-41425B13A7D5' \
  -only-testing:GTSDTests/Performance
```

---

## 6. Mobile Best Practices Checklist

### 6.1 iOS-Specific Patterns

- [ ] Proper SwiftUI view testing
- [ ] XCTest expectation usage
- [ ] Measure blocks for performance
- [ ] Accessibility testing support
- [ ] Dynamic Type testing

### 6.2 Test Organization

- [ ] Tests grouped by feature
- [ ] Descriptive test names
- [ ] Given/When/Then structure
- [ ] Clear test documentation
- [ ] Proper setup/tearDown

### 6.3 Mock Design Quality

- [ ] Mocks simulate realistic delays
- [ ] Error scenarios well-covered
- [ ] State management accurate
- [ ] Configuration options available
- [ ] Reset/cleanup methods present

---

## 7. Recommendations Template

### 7.1 Critical Issues

**Format:**
- Issue: [Description]
- Impact: [High/Medium/Low]
- Recommendation: [Specific action]
- Priority: [P0/P1/P2/P3]

### 7.2 Improvements

**Format:**
- Area: [Architecture/Tests/Performance]
- Current State: [Description]
- Desired State: [Description]
- Effort: [High/Medium/Low]

### 7.3 Additional Tests Needed

**Format:**
- Scenario: [Description]
- Coverage Gap: [What's missing]
- Priority: [P0/P1/P2/P3]
- Effort Estimate: [S/M/L/XL]

---

## Review Process

1. **Wait for swift-expert** to create `GTSDTests/Mocks/TestMocks.swift`
2. **Review centralized mocks** against criteria above
3. **Validate compilation** with build-for-testing
4. **Run test suites** (unit, integration, performance)
5. **Analyze results** and create findings report
6. **Create final document** `MOBILE_TEST_INFRASTRUCTURE_REVIEW.md`

---

## Success Criteria

**Minimum Requirements:**
- Zero compilation errors
- All tests compile and run
- No crashes during test execution
- Performance baselines established
- Memory leak tests pass

**Ideal State:**
- All tests pass
- Performance within SLA targets
- 80%+ code coverage for critical paths
- Mobile-specific scenarios fully covered
- Architecture score 8+/10
