# Quick Start: Metrics Summary Integration

## 1. Add Files to Xcode Project

### Step 1: Open Xcode Project
```bash
open /Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD.xcodeproj
```

### Step 2: Add MetricsSummary Feature Group

**Right-click on `GTSD/Features` folder → Add Files to "GTSD"**

Add the entire MetricsSummary folder:
```
/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Features/MetricsSummary/
```

Files to add:
- ✅ MetricsSummaryModels.swift
- ✅ MetricsSummaryViewModel.swift
- ✅ MetricsSummaryView.swift
- ✅ Components/MetricCard.swift
- ✅ Components/ExpandableSection.swift
- ✅ Components/MetricsEmptyState.swift
- ✅ Components/AcknowledgeButton.swift

**Options:**
- ✅ Copy items if needed
- ✅ Create groups (not folder references)
- ✅ Add to target: GTSD

### Step 3: Add MetricsService

**Right-click on `GTSD/Core/Services` → Add Files to "GTSD"**

Add:
```
/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Core/Services/MetricsService.swift
```

### Step 4: Add Localizable.strings

**Right-click on `GTSD/Resources` → Add Files to "GTSD"**

Add:
```
/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD/Resources/en.lproj/Localizable.strings
```

**Important:** Make sure to add the `en.lproj` folder, not just the file.

---

## 2. Verify Modified Files

These files were automatically updated and should already be in your project:

- ✅ `GTSD/Core/Network/APIEndpoint.swift` - Added metrics endpoints
- ✅ `GTSD/Core/DI/ServiceContainer.swift` - Added MetricsService

---

## 3. Build & Test

### Build the Project
```bash
# From terminal
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD
xcodebuild -project GTSD.xcodeproj -scheme GTSD -configuration Debug
```

Or press `Cmd + B` in Xcode.

### Expected Result
✅ Zero errors
✅ Zero warnings (with SwiftLint)
✅ All files compile successfully

---

## 4. Test in Simulator

### Preview in Xcode
1. Open `MetricsSummaryView.swift`
2. Click "Resume" in the preview pane (Cmd + Opt + P)
3. Verify the UI looks correct

### Run in Simulator
1. Select a simulator (iPhone 15 Pro recommended)
2. Run the app (Cmd + R)
3. Complete onboarding flow
4. Verify metrics summary appears

---

## 5. Integration with Onboarding

The `OnboardingCoordinator` already has support for showing a metrics summary sheet. However, it's currently using the old "How It Works" summary.

### Option A: Update Existing Flow (Recommended)

Update `OnboardingViewModel.swift` to show the new metrics summary after onboarding:

```swift
// After successful onboarding completion
@MainActor
func completeOnboarding() async {
    isLoading = true
    errorMessage = nil

    // ... existing onboarding completion code ...

    // Show new metrics summary instead of old one
    showMetricsSummary = true
    isLoading = false
}
```

Update `OnboardingCoordinator.swift` sheet presentation:

```swift
.sheet(isPresented: $viewModel.showMetricsSummary) {
    // NEW: Use the new MetricsSummaryView
    MetricsSummaryView {
        // On acknowledgement complete
        viewModel.showMetricsSummary = false
        dismiss()
    }
}
```

### Option B: Add as Separate Flow

If you want to keep the old summary, add a new sheet for metrics acknowledgement:

```swift
@Published var showMetricsAcknowledgement = false

.sheet(isPresented: $viewModel.showMetricsAcknowledgement) {
    MetricsSummaryView {
        viewModel.showMetricsAcknowledgement = false
        dismiss()
    }
}
```

---

## 6. Backend Requirements

Ensure your backend has these endpoints implemented:

### GET `/v1/profile/metrics/today`
Returns current metrics with explanations

### POST `/v1/profile/metrics/acknowledge`
Records user acknowledgement

See `METRICS_SUMMARY_IMPLEMENTATION.md` for detailed API specifications.

---

## 7. Testing Checklist

### Functional Tests
- [ ] Metrics load on view appear
- [ ] Cards expand/collapse smoothly
- [ ] Acknowledge button enables after loading
- [ ] Acknowledgement succeeds and dismisses
- [ ] Error states show correctly
- [ ] Retry button works after errors
- [ ] Loading state shows during fetch
- [ ] Already acknowledged state displays

### Accessibility Tests
- [ ] VoiceOver reads all content
- [ ] Dynamic Type increases text size
- [ ] All buttons have proper labels
- [ ] State changes are announced
- [ ] Tap targets are 44pt minimum

### Integration Tests
- [ ] Works within onboarding flow
- [ ] Dismissal only allowed after acknowledgement
- [ ] Background refresh works
- [ ] Network errors handled gracefully
- [ ] Data persists correctly

---

## 8. Common Issues & Solutions

### Issue: Files not found in Xcode
**Solution:** Make sure you added the files with "Create groups" not "Create folder references"

### Issue: Build errors about missing types
**Solution:** Clean build folder (Cmd + Shift + K) and rebuild

### Issue: Localizable.strings not loading
**Solution:**
1. Select Localizable.strings in Xcode
2. Open File Inspector (Cmd + Opt + 1)
3. Click "Localize..."
4. Select "English"

### Issue: Preview not working
**Solution:**
1. Make sure MetricsService mock is available
2. Check that ServiceContainer is accessible
3. Clean build folder and restart Xcode

### Issue: API errors in testing
**Solution:**
1. Use MockMetricsService for development
2. Update APIClient baseURL to point to your backend
3. Verify backend endpoints are implemented

---

## 9. Next Steps

After successful integration:

1. **Add Unit Tests**
   - Test MetricsSummaryViewModel logic
   - Test MetricsService API integration
   - Test model encoding/decoding

2. **Add UI Tests**
   - Test full onboarding → metrics flow
   - Test error recovery
   - Test acknowledgement flow

3. **Performance Testing**
   - Use Instruments to profile
   - Check memory usage
   - Verify smooth animations

4. **Accessibility Audit**
   - Test with VoiceOver
   - Test with Dynamic Type
   - Test with reduced motion

5. **User Testing**
   - Beta test with real users
   - Gather feedback on UX
   - Iterate on explanations

---

## 10. Support

If you encounter issues:

1. **Check the comprehensive docs:**
   - `METRICS_SUMMARY_IMPLEMENTATION.md` - Full implementation details
   - Inline code comments - Explain complex logic

2. **Review existing patterns:**
   - Similar features: `OnboardingCoordinator`, `PlanSummaryView`
   - Service patterns: `TaskService`, `PhotoService`
   - ViewModel patterns: `TasksViewModel`, `HomeViewModel`

3. **Debug tools:**
   - Logger output in Console.app
   - Xcode debugger
   - Network debugging with Charles/Proxyman

---

## Quick Commands

```bash
# Navigate to project
cd /Users/devarisbrown/Code/projects/gtsd/apps/GTSD

# Open in Xcode
open GTSD.xcodeproj

# Build from terminal
xcodebuild -project GTSD.xcodeproj -scheme GTSD -configuration Debug

# Run tests
xcodebuild test -project GTSD.xcodeproj -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Clean build
xcodebuild clean -project GTSD.xcodeproj -scheme GTSD
```

---

## File Checklist

Use this checklist when adding files to Xcode:

### New Files Created ✅
- [x] MetricsSummaryModels.swift
- [x] MetricsSummaryViewModel.swift
- [x] MetricsSummaryView.swift
- [x] MetricCard.swift
- [x] ExpandableSection.swift
- [x] MetricsEmptyState.swift
- [x] AcknowledgeButton.swift
- [x] MetricsService.swift
- [x] Localizable.strings

### Modified Files ✅
- [x] APIEndpoint.swift
- [x] ServiceContainer.swift

### Files to Add to Xcode Project
- [ ] MetricsSummary folder (with all files)
- [ ] MetricsService.swift
- [ ] en.lproj/Localizable.strings

### Integration Tasks
- [ ] Update OnboardingCoordinator
- [ ] Test in simulator
- [ ] Verify accessibility
- [ ] Write unit tests
- [ ] Deploy to TestFlight

---

**Ready to integrate!** Follow the steps above to add the metrics summary feature to your iOS app.
