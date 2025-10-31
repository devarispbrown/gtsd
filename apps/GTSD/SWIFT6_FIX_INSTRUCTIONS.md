# Swift 6 Migration - Fix Instructions

**Estimated Total Time:** 4-6 hours
**Priority:** HIGH (before production deployment)
**Difficulty:** LOW (straightforward fixes)

---

## Fix #1: ServiceContainer Safety (2-4 hours)

### File Location
`/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/DI/ServiceContainer.swift`

### Current Code (WRONG)
```swift
@MainActor
final class ServiceContainer: ObservableObject {
    // WRONG: Using nonisolated(unsafe) inappropriately
    nonisolated(unsafe) let keychain: KeychainManagerProtocol
    nonisolated(unsafe) let apiClient: any APIClientProtocol
    nonisolated(unsafe) let authService: any AuthenticationServiceProtocol
    nonisolated(unsafe) let taskService: any TaskServiceProtocol
    nonisolated(unsafe) let photoService: any PhotoServiceProtocol
```

### Fixed Code (RIGHT)
```swift
@MainActor
final class ServiceContainer: ObservableObject {
    // FIXED: Removed nonisolated(unsafe) - these are already thread-safe
    let keychain: KeychainManagerProtocol
    let apiClient: any APIClientProtocol
    let authService: any AuthenticationServiceProtocol
    let taskService: any TaskServiceProtocol
    let photoService: any PhotoServiceProtocol
```

### Steps
1. Open `ServiceContainer.swift`
2. Remove `nonisolated(unsafe)` from all 5 service properties (lines 22-26)
3. Remove the misleading comment on line 20
4. Build the project: `xcodebuild -scheme GTSD -configuration Debug`
5. Verify 0 errors, 0 warnings

### If You Get Compiler Errors

**Error:** "Property 'apiClient' isolated to global actor 'MainActor' can not be referenced from a non-isolated context"

**Solution A: Make call sites MainActor-isolated**
```swift
// Before
convenience init() {
    let container = ServiceContainer.shared  // Error here
    self.init(taskService: container.taskService, ...)
}

// After
@MainActor
convenience init() {
    let container = ServiceContainer.shared  // Now OK
    self.init(taskService: container.taskService, ...)
}
```

**Solution B: Use async initialization**
```swift
// If the initializer can't be @MainActor
convenience init() async {
    await MainActor.run {
        let container = ServiceContainer.shared
        self.init(taskService: container.taskService, ...)
    }
}
```

### Testing
```swift
@MainActor
func testServiceContainerAccess() async {
    let container = ServiceContainer.shared

    // Should compile without errors
    _ = container.apiClient
    _ = container.authService
    _ = container.taskService

    XCTAssertNotNil(container.keychain)
}
```

### Expected Outcome
- Build succeeds with 0 errors
- All services accessible from MainActor contexts
- No `unsafe` annotations in ServiceContainer
- Compiler provides full data race safety checking

---

## Fix #2: ProfileEditViewModel Error Handling (1-2 hours)

### File Location
`/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditViewModel.swift`

### Current Code (WRONG)
```swift
// Line 162-165
if !currentWeight.isEmpty || !targetWeight.isEmpty {
    Logger.warning("Health metrics update attempted but endpoint not available")
    throw APIError.httpError(statusCode: 501, message: "Health metrics can only be updated during onboarding. Please contact support if you need to update these values.")
}
```

### Fixed Code - Option 1: Custom Error Type (RECOMMENDED)

#### Step 1: Create ProfileEditError enum (add to top of file)
```swift
// Add after imports, before the class definition
enum ProfileEditError: LocalizedError {
    case healthMetricsUpdateNotSupported
    case invalidWeight(String)
    case invalidEmail

    var errorDescription: String? {
        switch self {
        case .healthMetricsUpdateNotSupported:
            return "Health metrics can only be updated during onboarding. Please contact support if you need to update these values."
        case .invalidWeight(let field):
            return "Invalid weight value for \(field)"
        case .invalidEmail:
            return "Please enter a valid email address"
        }
    }
}
```

#### Step 2: Replace the throw statement
```swift
// Line 162-165 becomes:
if !currentWeight.isEmpty || !targetWeight.isEmpty {
    Logger.warning("Health metrics update attempted but endpoint not available")
    throw ProfileEditError.healthMetricsUpdateNotSupported
}
```

#### Step 3: Update error catch block (line 178-186)
```swift
} catch let error as ProfileEditError {
    Logger.error("Profile validation error: \(error.localizedDescription)")
    errorMessage = error.localizedDescription
    return false
} catch let error as APIError {
    Logger.error("Failed to save profile: \(error.localizedDescription)")
    errorMessage = error.localizedDescription
    return false
} catch {
    Logger.error("Failed to save profile: \(error.localizedDescription)")
    errorMessage = "Failed to save profile"
    return false
}
```

### Fixed Code - Option 2: Prevent Input (BETTER UX)

#### Modify the View to disable weight fields
**File:** `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/Profile/ProfileEditView.swift`

```swift
// Current Weight field
VStack(alignment: .leading) {
    TextField("Current Weight", text: $viewModel.currentWeight)
        .disabled(true)  // Add this
        .keyboardType(.decimalPad)
        .textFieldStyle(.roundedBorder)
        .opacity(0.5)  // Add this

    Text("Health metrics can only be set during onboarding")
        .font(.caption)
        .foregroundColor(.secondary)
}

// Target Weight field
VStack(alignment: .leading) {
    TextField("Target Weight", text: $viewModel.targetWeight)
        .disabled(true)  // Add this
        .keyboardType(.decimalPad)
        .textFieldStyle(.roundedBorder)
        .opacity(0.5)  // Add this

    Text("Contact support to update your weight goals")
        .font(.caption)
        .foregroundColor(.secondary)
}
```

#### Then simplify the ViewModel
```swift
// Remove the validation check entirely (lines 162-165)
// Users can't enter data, so no validation needed

func saveChanges() async -> Bool {
    guard isValid else {
        errorMessage = "Please check all fields"
        return false
    }

    isSaving = true
    errorMessage = nil
    successMessage = nil
    defer { isSaving = false }

    do {
        // Update basic profile info
        if name != originalUser?.name || email != originalUser?.email {
            let _: User = try await apiClient.request(
                .updateProfile(
                    name: name != originalUser?.name ? name : nil,
                    email: email != originalUser?.email ? email : nil
                )
            )
        }

        // Health metrics section removed - UI prevents input

        successMessage = "Profile updated successfully"
        Logger.info("Profile saved successfully")

        await loadProfile()
        return true

    } catch let error as APIError {
        // ... existing error handling
    }
}
```

### Recommended Approach
**Use Option 2 (Prevent Input)** - Better UX, simpler code, no error handling needed

### Testing
```swift
@MainActor
func testHealthMetricsCannotBeUpdated() async {
    let viewModel = ProfileEditViewModel()

    // If using Option 1 (custom error)
    viewModel.currentWeight = "180"
    let result = await viewModel.saveChanges()
    XCTAssertFalse(result)
    XCTAssertTrue(viewModel.errorMessage?.contains("onboarding") ?? false)

    // If using Option 2 (disabled UI)
    // Fields are disabled, so this test isn't needed
}
```

### Expected Outcome
- Option 1: Proper error type, clear error messages
- Option 2: Users can't enter invalid data, cleaner UX
- No HTTP status code confusion
- Cleaner separation between API errors and validation errors

---

## Fix #3: Static Property Annotations (15 minutes)

### File Locations
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Services/PhotoService.swift`
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Services/TaskService.swift`

### PhotoService.swift

**Current Code (WRONG):**
```swift
// Line 26
nonisolated(unsafe) private static let maxCacheSize = 50
```

**Fixed Code (RIGHT):**
```swift
// Line 26
private static let maxCacheSize = 50
```

### TaskService.swift

**Current Code (WRONG):**
```swift
// Line 23
nonisolated(unsafe) private static let maxCacheSize = 100
```

**Fixed Code (RIGHT):**
```swift
// Line 23
private static let maxCacheSize = 100
```

### Steps
1. Open `PhotoService.swift`
2. Line 26: Remove `nonisolated(unsafe)` from `maxCacheSize`
3. Open `TaskService.swift`
4. Line 23: Remove `nonisolated(unsafe)` from `maxCacheSize`
5. Build: `xcodebuild -scheme GTSD -configuration Debug`

### If Compiler Requires Annotation

If you get errors, try `nonisolated` (without `unsafe`):
```swift
nonisolated private static let maxCacheSize = 50
```

But this is unlikely - static constants typically don't need any annotation.

### Expected Outcome
- Build succeeds
- No unsafe annotations on simple constants
- Cleaner code

---

## Validation Checklist

After applying all fixes:

### Build Validation
```bash
# Clean build
xcodebuild clean -scheme GTSD

# Build
xcodebuild build -scheme GTSD -configuration Debug

# Check for errors
# Expected: BUILD SUCCEEDED
# Expected: 0 errors, 0 warnings
```

### Code Quality Checks
- [ ] No `nonisolated(unsafe)` in ServiceContainer
- [ ] No `nonisolated(unsafe)` on static constants
- [ ] No APIError used for business logic validation
- [ ] All changes compile successfully
- [ ] No new warnings introduced

### Functionality Tests
- [ ] App launches successfully
- [ ] Login flow works
- [ ] Home screen loads data in parallel
- [ ] Profile edit works (can update name/email)
- [ ] Profile edit prevents weight updates (if using Option 2)
- [ ] Services are accessible from view models

### Concurrency Safety
- [ ] No data race warnings
- [ ] ServiceContainer accessible from MainActor
- [ ] All @MainActor protocols work correctly
- [ ] Parallel loading in HomeViewModel works

---

## Rollback Plan

If fixes cause unexpected issues:

### Quick Rollback
```bash
git checkout HEAD -- GTSD/Core/DI/ServiceContainer.swift
git checkout HEAD -- GTSD/Features/Profile/ProfileEditViewModel.swift
git checkout HEAD -- GTSD/Core/Services/PhotoService.swift
git checkout HEAD -- GTSD/Core/Services/TaskService.swift
```

### Incremental Approach
If you're cautious, apply fixes one at a time:

1. **First:** Fix static properties (lowest risk)
2. **Second:** Fix ProfileEditViewModel (medium risk)
3. **Third:** Fix ServiceContainer (needs most testing)

Test thoroughly after each fix.

---

## Common Issues & Solutions

### Issue 1: ServiceContainer Access Errors

**Error:**
```
Property 'apiClient' isolated to global actor 'MainActor' can not be referenced from a non-isolated context
```

**Solution:**
Mark the call site as `@MainActor`:
```swift
@MainActor
convenience init() {
    let container = ServiceContainer.shared
    // ...
}
```

### Issue 2: Async Initialization Needed

**Error:**
```
Cannot call MainActor-isolated property from non-isolated context
```

**Solution:**
Use async initialization:
```swift
static func create() async -> SomeViewModel {
    await MainActor.run {
        let container = ServiceContainer.shared
        return SomeViewModel(apiClient: container.apiClient)
    }
}
```

### Issue 3: Static Property Still Needs Annotation

**Error:**
```
Static property 'maxCacheSize' is not concurrency-safe
```

**Solution:**
Use `nonisolated` without `unsafe`:
```swift
nonisolated private static let maxCacheSize = 50
```

---

## Post-Fix Testing Script

Create and run this test script:

```swift
// Add to your test suite
@MainActor
final class Swift6MigrationTests: XCTestCase {

    func testServiceContainerThreadSafety() async {
        let container = ServiceContainer.shared

        // Should compile and run without errors
        XCTAssertNotNil(container.apiClient)
        XCTAssertNotNil(container.authService)
        XCTAssertNotNil(container.taskService)
        XCTAssertNotNil(container.photoService)
        XCTAssertNotNil(container.keychain)
    }

    func testParallelDataLoading() async {
        let viewModel = HomeViewModel()

        let start = Date()
        await viewModel.loadData()
        let duration = Date().timeIntervalSince(start)

        // Parallel loading should be faster than 5 seconds
        XCTAssertLessThan(duration, 5.0)
    }

    func testProfileEditValidation() async {
        let viewModel = ProfileEditViewModel()
        viewModel.name = "Test User"
        viewModel.email = "test@example.com"

        // Should be able to save name/email changes
        // (Assuming mock services are set up)
        // Weight fields should be ignored
    }
}
```

---

## Success Criteria

You'll know the fixes are complete when:

1. ✅ Build succeeds with 0 errors, 0 warnings
2. ✅ No `nonisolated(unsafe)` in ServiceContainer
3. ✅ No `nonisolated(unsafe)` on static constants
4. ✅ ProfileEditViewModel uses proper error types
5. ✅ All tests pass
6. ✅ App runs without crashes
7. ✅ No concurrency warnings in console

---

## Timeline Estimate

| Fix | Time | Complexity |
|-----|------|-----------|
| Static Properties | 15 min | Low |
| ProfileEditViewModel | 1-2 hours | Medium |
| ServiceContainer | 2-4 hours | Medium |
| Testing | 1 hour | Low |
| **Total** | **4-6 hours** | **Medium** |

---

## Questions During Implementation?

**If you get stuck:**
1. Check the full review report: `SWIFT6_MIGRATION_CODE_REVIEW.md`
2. Review Swift 6 concurrency documentation
3. Test incrementally (one fix at a time)
4. Use `git stash` to try different approaches

**Common gotchas:**
- Remember `@MainActor` is inherited by nested types
- View models should be `@MainActor` if they update UI
- Protocols can be `@MainActor` to enforce isolation
- `Sendable` is for types that are inherently thread-safe

---

**Good luck with the fixes!** 🚀

The changes are straightforward and low-risk. Take your time, test thoroughly, and you'll have production-ready Swift 6 code in a few hours.
