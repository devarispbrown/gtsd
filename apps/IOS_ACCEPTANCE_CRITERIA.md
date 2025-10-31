# GTSD iOS App - Acceptance Criteria

## Document Overview

This document defines the acceptance criteria for the GTSD (Get That Shredded Done) native iOS application. All features must meet these criteria before being considered complete and ready for release.

---

## 1. Authentication & Authorization

### 1.1 User Registration

**Acceptance Criteria:**

- [ ] User can create account with email and password
- [ ] Email validation enforces valid email format
- [ ] Password must meet minimum requirements (8+ characters, 1 uppercase, 1 number)
- [ ] Duplicate email addresses are rejected with clear error message
- [ ] Successful signup returns JWT access token and refresh token
- [ ] User is automatically logged in after successful signup
- [ ] Tokens are securely stored in iOS Keychain
- [ ] Error messages are user-friendly and actionable

**Performance:**

- [ ] Signup completes in <3 seconds on stable network
- [ ] Loading states are shown during API requests

**Testing:**

- [ ] Unit tests for validation logic
- [ ] Integration tests for API calls
- [ ] UI tests for complete signup flow

---

### 1.2 User Login

**Acceptance Criteria:**

- [ ] User can login with email and password
- [ ] Invalid credentials show appropriate error message
- [ ] Successful login returns access and refresh tokens
- [ ] Tokens are stored securely in Keychain
- [ ] User session persists across app restarts
- [ ] "Remember Me" functionality works correctly
- [ ] Network errors are handled gracefully

**Performance:**

- [ ] Login completes in <2 seconds on stable network
- [ ] App launches directly to home screen if valid session exists

**Testing:**

- [ ] Unit tests for login logic
- [ ] Integration tests with mock API
- [ ] UI tests for complete login flow

---

### 1.3 Biometric Authentication

**Acceptance Criteria:**

- [ ] Face ID/Touch ID can be enabled in settings
- [ ] Biometric auth is offered after first successful login
- [ ] Fallback to password if biometric fails
- [ ] Clear permission requests for biometric usage
- [ ] Works correctly on devices without biometric hardware
- [ ] Biometric preference persists across sessions

**Performance:**

- [ ] Biometric prompt appears within 500ms of app launch

**Testing:**

- [ ] Unit tests for biometric service
- [ ] UI tests for biometric flow (using simulator)

---

### 1.4 Token Refresh

**Acceptance Criteria:**

- [ ] Expired access tokens are automatically refreshed
- [ ] User is not logged out during automatic refresh
- [ ] Failed refresh attempts trigger re-authentication
- [ ] Token refresh is deduped (no duplicate refresh requests)
- [ ] All pending API calls retry after successful refresh

**Performance:**

- [ ] Token refresh completes in <2 seconds
- [ ] No user-visible delays during token refresh

**Testing:**

- [ ] Unit tests for token refresh logic
- [ ] Integration tests simulating expired tokens

---

### 1.5 Logout

**Acceptance Criteria:**

- [ ] User can logout from settings/profile
- [ ] Logout clears all stored tokens
- [ ] Logout clears cached user data
- [ ] User is redirected to login screen
- [ ] Confirmation prompt prevents accidental logout

**Testing:**

- [ ] Unit tests for logout logic
- [ ] UI tests for logout flow

---

## 2. Onboarding Flow

### 2.1 Multi-Step Wizard

**Acceptance Criteria:**

- [ ] 8-step onboarding wizard is presented to new users
- [ ] Steps: Welcome → Account Basics → Goals → Health Metrics → Activity Level → Preferences → Partners → Review
- [ ] Progress indicator shows current step (e.g., "3 of 8")
- [ ] Back button allows navigation to previous steps
- [ ] Form data persists when navigating between steps
- [ ] Skip button available for non-critical steps (e.g., partners)
- [ ] Final review screen shows all entered data
- [ ] Submit button is only enabled when required fields are complete

**Performance:**

- [ ] Step transitions are smooth (<200ms)
- [ ] Form data is persisted locally to prevent data loss

**Testing:**

- [ ] UI tests for complete onboarding flow
- [ ] UI tests for back navigation
- [ ] Unit tests for form validation

---

### 2.2 Form Validation

**Acceptance Criteria:**

- [ ] Age validation (13-120 years)
- [ ] Height validation (50-300 cm)
- [ ] Weight validation (20-500 kg)
- [ ] Target weight is different from current weight
- [ ] Target date is in the future
- [ ] Meals per day (1-10)
- [ ] Real-time validation feedback
- [ ] Clear error messages for invalid inputs

**Testing:**

- [ ] Unit tests for all validation rules
- [ ] UI tests for validation error display

---

### 2.3 Health Calculations

**Acceptance Criteria:**

- [ ] BMR (Basal Metabolic Rate) is calculated correctly
- [ ] TDEE (Total Daily Energy Expenditure) is calculated correctly
- [ ] Calorie target adjusts based on goal (lose/gain/maintain weight)
- [ ] Protein target is calculated
- [ ] Water target is calculated
- [ ] Estimated completion timeline is shown
- [ ] Calculations match server-side calculations (validated with API)

**Performance:**

- [ ] Calculations complete instantly (<100ms)

**Testing:**

- [ ] Unit tests for calculation formulas
- [ ] Integration tests comparing with API results

---

### 2.4 Onboarding Completion

**Acceptance Criteria:**

- [ ] All onboarding data is submitted to API
- [ ] User profile is created/updated on server
- [ ] User is marked as "onboarded" locally and on server
- [ ] User is redirected to home/dashboard screen
- [ ] Onboarding is not shown again on subsequent logins
- [ ] Network errors during submission show retry option

**Testing:**

- [ ] Integration tests for API submission
- [ ] UI tests for complete onboarding flow

---

## 3. Home/Dashboard Screen

### 3.1 Dashboard Overview

**Acceptance Criteria:**

- [ ] Current streak is prominently displayed
- [ ] Today's task completion percentage is shown
- [ ] Quick stats (calories, protein, water) are visible
- [ ] Recent badges are displayed
- [ ] "How it Works" summary is accessible
- [ ] Pull-to-refresh updates all data
- [ ] Offline mode shows cached data with indicator

**Performance:**

- [ ] Dashboard loads in <2 seconds
- [ ] Smooth scrolling (60fps)

**Testing:**

- [ ] Unit tests for dashboard ViewModel
- [ ] UI tests for dashboard layout
- [ ] Performance tests for data loading

---

### 3.2 Quick Actions

**Acceptance Criteria:**

- [ ] "View Today's Tasks" button navigates to tasks screen
- [ ] "Upload Progress Photo" button opens camera/gallery
- [ ] "View Streak Calendar" shows compliance history
- [ ] Actions are disabled when offline with clear messaging

**Testing:**

- [ ] UI tests for navigation

---

## 4. Daily Tasks

### 4.1 Task List Display

**Acceptance Criteria:**

- [ ] All tasks for today are displayed
- [ ] Tasks are grouped by type (nutrition, exercise, supplements, hydration)
- [ ] Completed tasks show checkmark
- [ ] Incomplete tasks show empty checkbox
- [ ] Task details (description, target values) are visible
- [ ] Pull-to-refresh fetches latest tasks
- [ ] Date picker allows viewing tasks for other dates
- [ ] Empty state shown when no tasks exist

**Performance:**

- [ ] Task list loads in <1 second
- [ ] Caching reduces subsequent loads to <300ms
- [ ] Smooth scrolling for large task lists

**Testing:**

- [ ] Unit tests for task filtering/grouping
- [ ] Integration tests for task fetching
- [ ] UI tests for task list display

---

### 4.2 Task Completion

**Acceptance Criteria:**

- [ ] Tapping a task opens evidence submission sheet
- [ ] Evidence types: text log, metrics, photo reference
- [ ] Text evidence has character counter (max 500)
- [ ] Metrics evidence has numeric input with validation
- [ ] Photo evidence allows camera or gallery selection
- [ ] Optional notes field (max 200 characters)
- [ ] Submit button is disabled until evidence is provided
- [ ] Successful submission marks task as complete
- [ ] Task UI updates immediately (optimistic update)
- [ ] Streak is updated after first task completion of the day

**Performance:**

- [ ] Evidence submission completes in <2 seconds
- [ ] Optimistic UI updates are instant

**Testing:**

- [ ] Unit tests for evidence validation
- [ ] Integration tests for task completion API
- [ ] UI tests for evidence submission flow

---

### 4.3 Task Filters

**Acceptance Criteria:**

- [ ] Filter by task type (all, nutrition, exercise, supplements, hydration)
- [ ] Filter by completion status (all, complete, incomplete)
- [ ] Filters update task list in real-time
- [ ] Filter state persists across app sessions

**Testing:**

- [ ] Unit tests for filter logic
- [ ] UI tests for filter functionality

---

## 5. Progress Photos

### 5.1 Photo Upload

**Acceptance Criteria:**

- [ ] User can select photo from gallery or take new photo
- [ ] Photo is compressed before upload (max 2MB)
- [ ] Upload progress is shown (0-100%)
- [ ] Presigned URL is fetched from API
- [ ] Photo is uploaded to S3 using presigned URL
- [ ] Upload confirmation is sent to API
- [ ] Photo appears in gallery immediately after upload
- [ ] Failed uploads show retry option
- [ ] Multiple photos can be uploaded simultaneously

**Performance:**

- [ ] Upload completes in <10 seconds for 2MB photo on 4G
- [ ] Compression completes in <1 second

**Testing:**

- [ ] Unit tests for image compression
- [ ] Integration tests for presigned URL flow
- [ ] Performance tests for upload speed

---

### 5.2 Photo Gallery

**Acceptance Criteria:**

- [ ] All user photos are displayed in reverse chronological order
- [ ] Grid view with 3 columns
- [ ] Tapping photo opens full-screen view
- [ ] Full-screen view supports pinch-to-zoom
- [ ] Swipe gestures navigate between photos
- [ ] Delete option with confirmation prompt
- [ ] Photos are cached for offline viewing
- [ ] Pagination for large photo collections (50 per page)

**Performance:**

- [ ] Gallery loads first 50 photos in <2 seconds
- [ ] Smooth scrolling (60fps)
- [ ] Lazy loading for off-screen images

**Testing:**

- [ ] UI tests for gallery display
- [ ] UI tests for photo deletion
- [ ] Performance tests for large galleries

---

### 5.3 Photo Metadata

**Acceptance Criteria:**

- [ ] Photo timestamp is captured and displayed
- [ ] Photo dimensions are stored
- [ ] Photos can be linked to specific tasks
- [ ] Evidence type (before/during/after) is tagged

**Testing:**

- [ ] Unit tests for metadata extraction

---

## 6. Streaks & Badges

### 6.1 Streak Tracking

**Acceptance Criteria:**

- [ ] Current streak is displayed on home screen
- [ ] Longest streak (all-time best) is shown
- [ ] Total compliant days counter
- [ ] Streak calendar shows daily compliance (heatmap style)
- [ ] Today's compliance percentage is calculated
- [ ] Streak updates automatically when daily compliance threshold is met (80%)
- [ ] Streak resets if user misses a day
- [ ] Grace period or freeze days (if implemented)

**Performance:**

- [ ] Streak calculations complete in <500ms

**Testing:**

- [ ] Unit tests for streak logic
- [ ] Integration tests for compliance calculation

---

### 6.2 Badge System

**Acceptance Criteria:**

- [ ] Earned badges are displayed on profile
- [ ] Badge animations play when new badge is earned
- [ ] Badge catalog shows all available badges
- [ ] Locked badges show unlock criteria
- [ ] Badge metadata (name, description, emoji) is shown
- [ ] "Day One Done" badge awarded after first compliant day
- [ ] Push notification when badge is earned (if notifications enabled)

**Performance:**

- [ ] Badge animations are smooth (60fps)

**Testing:**

- [ ] Unit tests for badge award logic
- [ ] UI tests for badge display

---

### 6.3 Compliance Calculation

**Acceptance Criteria:**

- [ ] Compliance is based on 80% task completion threshold
- [ ] Only tasks for current day are counted
- [ ] Completed tasks increment completion percentage
- [ ] Manual compliance check is available
- [ ] Compliance check triggers streak update

**Testing:**

- [ ] Unit tests for compliance algorithm
- [ ] Integration tests with API

---

## 7. Profile & Settings

### 7.1 User Profile

**Acceptance Criteria:**

- [ ] User name is displayed
- [ ] Email is displayed (read-only)
- [ ] Profile photo can be uploaded/changed
- [ ] Current weight can be updated
- [ ] Target weight can be modified
- [ ] Activity level can be changed
- [ ] Changes are saved to API
- [ ] Success/failure feedback is shown

**Performance:**

- [ ] Profile updates save in <2 seconds

**Testing:**

- [ ] Integration tests for profile updates

---

### 7.2 Settings

**Acceptance Criteria:**

- [ ] Dark mode toggle (system/light/dark)
- [ ] Notification preferences (push, reminder time)
- [ ] Biometric authentication toggle
- [ ] Unit system (metric/imperial)
- [ ] Language selection (if multi-language)
- [ ] Privacy policy link
- [ ] Terms of service link
- [ ] App version is displayed
- [ ] Logout button

**Testing:**

- [ ] UI tests for settings changes

---

### 7.3 Notifications

**Acceptance Criteria:**

- [ ] Push notification permission is requested appropriately
- [ ] Daily reminder notification at user-selected time
- [ ] Badge award notifications
- [ ] Streak milestone notifications
- [ ] Notifications are delivered on time (±5 minutes)
- [ ] Tapping notification opens relevant screen

**Testing:**

- [ ] UI tests for notification permissions
- [ ] Manual testing for notification delivery

---

## 8. Non-Functional Requirements

### 8.1 Performance

**Acceptance Criteria:**

- [ ] App launches in <3 seconds (cold start)
- [ ] App resumes in <1 second (warm start)
- [ ] All API calls complete in <5 seconds
- [ ] Smooth scrolling (60fps minimum)
- [ ] No memory leaks
- [ ] App size <50MB

**Testing:**

- [ ] Performance tests for all major operations
- [ ] Instruments profiling for memory leaks
- [ ] App size monitored on each build

---

### 8.2 Security

**Acceptance Criteria:**

- [ ] All tokens stored in iOS Keychain
- [ ] No sensitive data in UserDefaults
- [ ] HTTPS only (no plaintext HTTP)
- [ ] Certificate pinning implemented (optional but recommended)
- [ ] No hardcoded API keys or secrets
- [ ] Proper data encryption for local storage

**Testing:**

- [ ] Security audit of code
- [ ] Penetration testing (optional)

---

### 8.3 Offline Support

**Acceptance Criteria:**

- [ ] App functions offline with cached data
- [ ] Clear offline indicator is shown
- [ ] Tasks can be viewed offline
- [ ] Photos can be viewed offline (if cached)
- [ ] Pending actions are queued and synced when online
- [ ] Network errors show friendly messages with retry

**Testing:**

- [ ] UI tests with airplane mode enabled
- [ ] Integration tests for offline queue

---

### 8.4 Accessibility

**Acceptance Criteria:**

- [ ] All UI elements have accessibility labels
- [ ] VoiceOver support for all screens
- [ ] Dynamic Type support (text scales correctly)
- [ ] Minimum touch target size of 44x44 points
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Support for Reduce Motion
- [ ] Support for Increase Contrast

**Testing:**

- [ ] Accessibility audit using Xcode Accessibility Inspector
- [ ] Manual testing with VoiceOver
- [ ] Dynamic Type testing at various sizes

---

### 8.5 Internationalization (i18n)

**Acceptance Criteria:**

- [ ] All user-facing strings are localized
- [ ] RTL (Right-to-Left) layout support if needed
- [ ] Date/time formatting respects locale
- [ ] Number formatting respects locale
- [ ] Currency formatting respects locale

**Testing:**

- [ ] UI tests in multiple languages
- [ ] Visual testing for RTL layouts

---

### 8.6 Error Handling

**Acceptance Criteria:**

- [ ] All errors show user-friendly messages
- [ ] Network errors show retry option
- [ ] Server errors (500) show generic message with support contact
- [ ] Validation errors highlight specific fields
- [ ] Critical errors are logged for debugging
- [ ] No crashes from unhandled errors

**Testing:**

- [ ] Error scenario testing
- [ ] Crash reporting integration (Crashlytics, Sentry, etc.)

---

## 9. App Store Requirements

### 9.1 App Metadata

**Acceptance Criteria:**

- [ ] App name: "GTSD - Get That Shredded Done"
- [ ] App description written and optimized for App Store
- [ ] Keywords selected for ASO (App Store Optimization)
- [ ] Privacy policy URL is valid and accessible
- [ ] Support URL is valid and accessible
- [ ] Marketing URL (optional)
- [ ] App category: Health & Fitness
- [ ] Age rating: 4+ or 12+ (depending on content)

---

### 9.2 App Store Assets

**Acceptance Criteria:**

- [ ] App icon (1024x1024 PNG)
- [ ] Screenshots for all supported device sizes:
  - iPhone 6.7" (1290x2796)
  - iPhone 6.5" (1242x2688)
  - iPhone 5.5" (1242x2208)
- [ ] Optional: iPad screenshots if supporting iPad
- [ ] Optional: Preview videos (15-30 seconds)

---

### 9.3 App Store Compliance

**Acceptance Criteria:**

- [ ] App follows Apple Human Interface Guidelines
- [ ] App follows App Store Review Guidelines
- [ ] Health data usage is clearly disclosed (if applicable)
- [ ] Camera/Photo Library usage descriptions are clear
- [ ] Push notification usage is disclosed
- [ ] No placeholder content or "test" data
- [ ] No references to other platforms (Android, web)

---

## 10. Testing Requirements

### 10.1 Code Coverage

**Acceptance Criteria:**

- [ ] Overall code coverage: 80%+
- [ ] ViewModels: 90%+ coverage
- [ ] Services: 85%+ coverage
- [ ] Repositories: 85%+ coverage
- [ ] Utilities: 75%+ coverage

---

### 10.2 Test Automation

**Acceptance Criteria:**

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All critical UI tests pass
- [ ] Tests run automatically on CI/CD
- [ ] Test execution time <5 minutes

---

### 10.3 Manual Testing

**Acceptance Criteria:**

- [ ] Complete smoke test checklist
- [ ] Regression testing for all major features
- [ ] Exploratory testing for edge cases
- [ ] Device testing on multiple iOS versions
- [ ] Device testing on multiple device types (iPhone SE, iPhone 14, iPhone 14 Pro Max)

---

## 11. Release Criteria

### 11.1 Definition of Done

A feature is considered "done" when:

- [ ] All acceptance criteria are met
- [ ] Unit tests are written and passing (90%+ coverage)
- [ ] Integration tests are written and passing
- [ ] UI tests are written and passing for critical paths
- [ ] Code review is completed and approved
- [ ] No known bugs or regressions
- [ ] Accessibility requirements are met
- [ ] Performance benchmarks are met
- [ ] Documentation is updated

---

### 11.2 MVP Release (v1.0)

**Minimum features for MVP:**

- [ ] Authentication (signup, login, logout)
- [ ] Onboarding flow
- [ ] Daily tasks (view, complete)
- [ ] Basic progress photos (upload, view)
- [ ] Streak tracking (current, longest)
- [ ] "Day One Done" badge
- [ ] Profile & settings
- [ ] Offline support (basic caching)

**Optional for MVP:**

- [ ] Full badge system (15 badges)
- [ ] Advanced analytics
- [ ] Social features
- [ ] In-app purchases
- [ ] Push notifications

---

### 11.3 Pre-Release Checklist

- [ ] All MVP features are complete
- [ ] Test coverage meets targets (80%+)
- [ ] Performance testing is complete
- [ ] Security audit is complete
- [ ] Accessibility audit is complete
- [ ] App Store assets are ready
- [ ] Privacy policy is published
- [ ] Support documentation is ready
- [ ] Beta testing is complete (TestFlight)
- [ ] No critical or high-priority bugs
- [ ] App Store submission is approved

---

## 12. Success Metrics (Post-Launch)

### 12.1 User Engagement

- [ ] Daily Active Users (DAU)
- [ ] Weekly Active Users (WAU)
- [ ] Monthly Active Users (MAU)
- [ ] Average session duration >3 minutes
- [ ] Task completion rate >60%
- [ ] Streak retention rate (% users with 7+ day streak)

---

### 12.2 Technical Metrics

- [ ] App crash rate <1%
- [ ] API success rate >99%
- [ ] Average API response time <2 seconds
- [ ] App Store rating >4.0 stars

---

### 12.3 Business Metrics

- [ ] App Store downloads
- [ ] User retention (Day 1, Day 7, Day 30)
- [ ] Conversion rate (signup to onboarding completion)
- [ ] Photo upload rate (% users uploading photos)

---

## Document Control

**Version:** 1.0
**Last Updated:** 2025-10-26
**Owner:** GTSD Development Team

**Revision History:**

- v1.0 (2025-10-26): Initial acceptance criteria document
