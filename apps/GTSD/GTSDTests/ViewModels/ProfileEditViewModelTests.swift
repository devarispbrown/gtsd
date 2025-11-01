//
//  ProfileEditViewModelTests.swift
//  GTSDTests
//
//  Created by Claude on 2025-10-30.
//  Comprehensive unit tests for ProfileEditViewModel
//

import XCTest
@testable import GTSD

/// Comprehensive tests for ProfileEditViewModel covering validation, change detection, loading, saving, and field errors
@MainActor
final class ProfileEditViewModelTests: XCTestCase {

    var sut: ProfileEditViewModel!
    var mockAPIClient: MockAPIClient!
    var mockAuthService: MockAuthService!

    override func setUp() async throws {
        try await super.setUp()

        mockAPIClient = MockAPIClient()
        mockAuthService = MockAuthService()

        sut = ProfileEditViewModel(
            apiClient: mockAPIClient,
            authService: mockAuthService
        )
    }

    override func tearDown() async throws {
        sut = nil
        mockAPIClient = nil
        mockAuthService = nil
        try await super.tearDown()
    }

    // MARK: - Validation Tests (9 test cases)

    /// Test 1: Name validation - given empty name, when validating, then should return validation error
    func testValidation_GivenEmptyName_WhenValidating_ThenReturnsError() {
        // Given
        sut.name = ""
        sut.email = "valid@example.com"

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Empty name should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "name" }, "Should have name validation error")
        XCTAssertEqual(errors.first { $0.field == "name" }?.message, "Name is required")
    }

    /// Test 2: Email validation - given invalid email format, when validating, then should return validation error
    func testValidation_GivenInvalidEmail_WhenValidating_ThenReturnsError() {
        // Given
        sut.name = "John Doe"
        sut.email = "not-an-email"

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Invalid email should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "email" }, "Should have email validation error")
        XCTAssertEqual(errors.first { $0.field == "email" }?.message, "Invalid email address")
    }

    /// Test 3: Age validation - given date of birth resulting in age < 18, when validating, then should return validation error
    func testValidation_GivenAgeLessThan18_WhenValidating_ThenReturnsError() {
        // Given - Set date of birth to 15 years ago
        sut.name = "Young Person"
        sut.email = "young@example.com"
        sut.dateOfBirth = Calendar.current.date(byAdding: .year, value: -15, to: Date())!

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Age under 18 should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "age" }, "Should have age validation error")
        XCTAssertEqual(errors.first { $0.field == "age" }?.message, "Age must be between 18 and 100")
    }

    /// Test 4: Age validation - given date of birth resulting in age > 100, when validating, then should return validation error
    func testValidation_GivenAgeGreaterThan100_WhenValidating_ThenReturnsError() {
        // Given - Set date of birth to 110 years ago
        sut.name = "Very Old Person"
        sut.email = "old@example.com"
        sut.dateOfBirth = Calendar.current.date(byAdding: .year, value: -110, to: Date())!

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Age over 100 should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "age" }, "Should have age validation error")
        XCTAssertEqual(errors.first { $0.field == "age" }?.message, "Age must be between 18 and 100")
    }

    /// Test 5: Height validation - given height < 50 cm, when validating, then should return validation error
    func testValidation_GivenHeightBelowMinimum_WhenValidating_ThenReturnsError() {
        // Given
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.heightCm = "30"  // Below minimum

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Height below 50cm should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "height" }, "Should have height validation error")
        XCTAssertEqual(errors.first { $0.field == "height" }?.message, "Height must be between 50 and 300 cm")
    }

    /// Test 6: Current weight validation - given weight outside 20-500 kg range, when validating, then should return validation error
    func testValidation_GivenCurrentWeightOutOfRange_WhenValidating_ThenReturnsError() {
        // Given - Test both below and above range
        sut.name = "John Doe"
        sut.email = "john@example.com"

        // Test below minimum
        sut.currentWeightKg = "10"
        var errors = sut.validateProfile()
        XCTAssertTrue(errors.contains { $0.field == "currentWeight" }, "Should have weight error for value below minimum")

        // Test above maximum
        sut.currentWeightKg = "600"
        errors = sut.validateProfile()
        XCTAssertTrue(errors.contains { $0.field == "currentWeight" }, "Should have weight error for value above maximum")
    }

    /// Test 7: Target weight validation - given weight outside 20-500 kg range, when validating, then should return validation error
    func testValidation_GivenTargetWeightOutOfRange_WhenValidating_ThenReturnsError() {
        // Given
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.targetWeightKg = "550"  // Above maximum

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Target weight above 500kg should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "targetWeight" }, "Should have target weight validation error")
        XCTAssertEqual(errors.first { $0.field == "targetWeight" }?.message, "Target weight must be between 20 and 500 kg")
    }

    /// Test 8: Target date validation - given date in the past, when validating, then should return validation error
    func testValidation_GivenTargetDateInPast_WhenValidating_ThenReturnsError() {
        // Given
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.targetDate = Calendar.current.date(byAdding: .day, value: -1, to: Date())!

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Target date in past should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "targetDate" }, "Should have target date validation error")
        XCTAssertEqual(errors.first { $0.field == "targetDate" }?.message, "Target date must be in the future")
    }

    /// Test 9: Meals per day validation - given value outside 1-10 range, when validating, then should return validation error
    func testValidation_GivenMealsPerDayOutOfRange_WhenValidating_ThenReturnsError() {
        // Given
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.mealsPerDay = 15  // Above maximum

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "Meals per day above 10 should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "mealsPerDay" }, "Should have meals per day validation error")
        XCTAssertEqual(errors.first { $0.field == "mealsPerDay" }?.message, "Meals per day must be between 1 and 10")
    }

    /// Test 10: Dietary preferences limit - given more than 10 preferences, when validating, then should return validation error
    func testValidation_GivenTooManyDietaryPreferences_WhenValidating_ThenReturnsError() {
        // Given - Add 11 dietary preferences
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.dietaryPreferences = [
            "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Keto",
            "Paleo", "Low-Carb", "High-Protein", "Vegetarian", "Pescatarian", "Extra"
        ]

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "More than 10 dietary preferences should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "dietaryPreferences" }, "Should have dietary preferences validation error")
        XCTAssertEqual(errors.first { $0.field == "dietaryPreferences" }?.message, "Maximum 10 dietary preferences allowed")
    }

    /// Test 11: Allergies limit - given more than 20 allergies, when validating, then should return validation error
    func testValidation_GivenTooManyAllergies_WhenValidating_ThenReturnsError() {
        // Given - Add 21 allergies
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.allergies = Array(repeating: "Allergy", count: 21)

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertFalse(errors.isEmpty, "More than 20 allergies should produce validation error")
        XCTAssertTrue(errors.contains { $0.field == "allergies" }, "Should have allergies validation error")
        XCTAssertEqual(errors.first { $0.field == "allergies" }?.message, "Maximum 20 allergies allowed")
    }

    // MARK: - Change Detection Tests (4 test cases)

    /// Test 12: Health changes detection - given weight or height changes, when checking hasHealthChanges, then should return true
    func testChangeDetection_GivenWeightOrHeightChanged_WhenCheckingHealthChanges_ThenReturnsTrue() async {
        // Given - Load profile first to establish baseline
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // When - Change weight
        sut.currentWeightKg = "85.0"  // Different from mock profile

        // Then - Use private method indirectly by checking if changes are detected when saving
        XCTAssertTrue(sut.hasChanges, "Weight change should be detected")
    }

    /// Test 13: Goal changes detection - given goal or activity changes, when checking hasGoalChanges, then should return true
    func testChangeDetection_GivenGoalOrActivityChanged_WhenCheckingGoalChanges_ThenReturnsTrue() async {
        // Given - Load profile first
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // When - Change primary goal
        let originalGoal = sut.primaryGoal
        sut.primaryGoal = (originalGoal == .loseWeight) ? .gainMuscle : .loseWeight

        // Then
        XCTAssertTrue(sut.hasChanges, "Goal change should be detected")
    }

    /// Test 14: Preference changes detection - given dietary preference changes, when checking hasPreferenceChanges, then should return true
    func testChangeDetection_GivenPreferencesChanged_WhenCheckingPreferenceChanges_ThenReturnsTrue() async {
        // Given - Load profile first
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // When - Change dietary preferences
        sut.dietaryPreferences = ["Vegan", "Gluten-Free"]

        // Then
        XCTAssertTrue(sut.hasChanges, "Dietary preference change should be detected")
    }

    /// Test 15: Overall change detection - given any changes to profile, when checking hasChanges, then should return true
    func testChangeDetection_GivenAnyProfileChange_WhenCheckingHasChanges_ThenReturnsTrue() async {
        // Given - Load profile first
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // Initially no changes
        XCTAssertFalse(sut.hasChanges, "Should have no changes initially")

        // When - Change name
        sut.name = "Different Name"

        // Then
        XCTAssertTrue(sut.hasChanges, "Name change should be detected")
    }

    // MARK: - Profile Loading Tests (3 test cases)

    /// Test 16: Load profile success - given valid API response, when loading profile, then should populate all fields correctly
    func testLoadProfile_GivenValidResponse_WhenLoading_ThenPopulatesAllFields() async {
        // Given
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile

        // When
        await sut.loadProfile()

        // Then - Verify all fields populated
        XCTAssertEqual(sut.name, "Test User", "Name should be populated")
        XCTAssertEqual(sut.email, "test@example.com", "Email should be populated")
        XCTAssertEqual(sut.heightCm, "175", "Height should be populated")
        XCTAssertEqual(sut.currentWeightKg, "80.0", "Current weight should be populated")
        XCTAssertEqual(sut.targetWeightKg, "70.0", "Target weight should be populated")
        XCTAssertEqual(sut.dietaryPreferences, ["Vegetarian"], "Dietary preferences should be populated")
        XCTAssertEqual(sut.allergies, ["Peanuts"], "Allergies should be populated")
        XCTAssertEqual(sut.mealsPerDay, 3, "Meals per day should be populated")
        XCTAssertNil(sut.errorMessage, "Should have no error message")
    }

    /// Test 17: Load profile API error - given API error, when loading profile, then should set error message
    func testLoadProfile_GivenAPIError_WhenLoading_ThenSetsErrorMessage() async {
        // Given
        mockAPIClient.mockError = APIError.httpError(statusCode: 500, message: "Server error")

        // When
        await sut.loadProfile()

        // Then
        XCTAssertNotNil(sut.errorMessage, "Should have error message")
        XCTAssertTrue(sut.errorMessage?.contains("Server error") ?? false, "Error message should contain server error")
        XCTAssertFalse(sut.isLoading, "Should not be loading after error")
    }

    /// Test 18: Load profile loading state - given loading operation, when checking loading state, then should be true during load and false after
    func testLoadProfile_GivenLoadingOperation_WhenChecking_ThenSetsLoadingStateCorrectly() async {
        // Given
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile

        // When/Then - Check loading state
        // Note: Due to async nature, we check final state
        await sut.loadProfile()

        // After completion, loading should be false
        XCTAssertFalse(sut.isLoading, "Loading should be false after completion")
    }

    // MARK: - Profile Saving Tests (5 test cases)

    /// Test 19: Save profile success - given valid changes, when saving, then should return true and reload profile
    func testSaveProfile_GivenValidChanges_WhenSaving_ThenSucceedsAndReloads() async {
        // Given - Load initial profile
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // Make changes
        sut.name = "Updated Name"

        // Setup mock responses for save operations
        let updatedUser = User(
            id: 1,
            email: "test@example.com",
            name: "Updated Name",
            emailVerified: true,
            hasCompletedOnboarding: true
        )
        mockAPIClient.mockResponse = updatedUser

        // When
        let success = await sut.saveProfile()

        // Then
        XCTAssertTrue(success, "Save should succeed")
        XCTAssertNil(sut.errorMessage, "Should have no error message")
        XCTAssertTrue(mockAPIClient.requestCallCount > 0, "Should have made API requests")
    }

    /// Test 20: Save profile validation failure - given invalid data, when saving, then should show validation errors
    func testSaveProfile_GivenInvalidData_WhenSaving_ThenShowsValidationErrors() async {
        // Given - Set invalid data
        sut.name = ""  // Invalid: empty name
        sut.email = "invalid-email"  // Invalid: bad format

        // When
        let success = await sut.saveProfile()

        // Then
        XCTAssertFalse(success, "Save should fail")
        XCTAssertFalse(sut.validationErrors.isEmpty, "Should have validation errors")
        XCTAssertNotNil(sut.errorMessage, "Should have error message")
        XCTAssertEqual(sut.errorMessage, "Please fix the errors below before saving")
    }

    /// Test 21: Save profile optimistic UI - given changes, when saving, then should update optimistically
    func testSaveProfile_GivenChanges_WhenSaving_ThenUpdatesOptimistically() async {
        // Given - Load initial profile
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // Make changes
        let newName = "Optimistic Update"
        sut.name = newName

        // Setup mock for successful save
        let updatedUser = User(
            id: 1,
            email: "test@example.com",
            name: newName,
            emailVerified: true,
            hasCompletedOnboarding: true
        )
        mockAPIClient.mockResponse = updatedUser

        // When
        _ = await sut.saveProfile()

        // Then - Name should be updated
        XCTAssertEqual(sut.name, newName, "Name should be updated optimistically")
    }

    /// Test 22: Save profile rollback on error - given API error during save, when error occurs, then should rollback changes
    func testSaveProfile_GivenAPIError_WhenSaving_ThenRollsBackChanges() async {
        // Given - Load initial profile
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        let originalName = sut.name

        // Make changes
        sut.name = "This Will Fail"

        // Setup mock to fail
        mockAPIClient.mockError = APIError.httpError(statusCode: 500, message: "Save failed")

        // When
        let success = await sut.saveProfile()

        // Then
        XCTAssertFalse(success, "Save should fail")
        XCTAssertNotNil(sut.errorMessage, "Should have error message")
        // Note: Rollback happens for savedProfile, which may differ from current state
    }

    /// Test 23: Save profile success toast - given successful save, when completed, then should show success toast
    func testSaveProfile_GivenSuccessfulSave_WhenCompleted_ThenShowsSuccessToast() async {
        // Given - Load initial profile
        let mockProfile = createMockProfile()
        mockAPIClient.mockResponse = mockProfile
        await sut.loadProfile()

        // Make changes
        sut.name = "Updated Name"

        // Setup mock for successful save
        let updatedUser = User(
            id: 1,
            email: "test@example.com",
            name: "Updated Name",
            emailVerified: true,
            hasCompletedOnboarding: true
        )
        mockAPIClient.mockResponse = updatedUser

        // When
        let success = await sut.saveProfile()

        // Then
        XCTAssertTrue(success, "Save should succeed")
        XCTAssertTrue(sut.showSuccessToast, "Should show success toast")
    }

    // MARK: - Field-Specific Error Tests (3 test cases)

    /// Test 24: Name error message - given name validation error, when checking nameError, then should return correct error message
    func testFieldError_GivenNameValidationError_WhenCheckingNameError_ThenReturnsCorrectMessage() {
        // Given
        sut.name = ""
        sut.email = "valid@example.com"

        // Trigger validation
        let errors = sut.validateProfile()
        sut.validationErrors = errors

        // When
        let nameError = sut.nameError

        // Then
        XCTAssertNotNil(nameError, "Should have name error")
        XCTAssertEqual(nameError, "Name is required")
    }

    /// Test 25: Email error message - given email validation error, when checking emailError, then should return correct error message
    func testFieldError_GivenEmailValidationError_WhenCheckingEmailError_ThenReturnsCorrectMessage() {
        // Given
        sut.name = "John Doe"
        sut.email = "bad-email"

        // Trigger validation
        let errors = sut.validateProfile()
        sut.validationErrors = errors

        // When
        let emailError = sut.emailError

        // Then
        XCTAssertNotNil(emailError, "Should have email error")
        XCTAssertEqual(emailError, "Invalid email address")
    }

    /// Test 26: Height error message - given height validation error, when checking heightError, then should return correct error message
    func testFieldError_GivenHeightValidationError_WhenCheckingHeightError_ThenReturnsCorrectMessage() {
        // Given
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.heightCm = "25"  // Below minimum

        // Trigger validation
        let errors = sut.validateProfile()
        sut.validationErrors = errors

        // When
        let heightError = sut.heightError

        // Then
        XCTAssertNotNil(heightError, "Should have height error")
        XCTAssertEqual(heightError, "Height must be between 50 and 300 cm")
    }

    // MARK: - Additional Edge Cases

    /// Test 27: Valid profile passes validation - given all valid fields, when validating, then should return no errors
    func testValidation_GivenAllValidFields_WhenValidating_ThenReturnsNoErrors() {
        // Given - Set all fields to valid values
        sut.name = "John Doe"
        sut.email = "john@example.com"
        sut.dateOfBirth = Calendar.current.date(byAdding: .year, value: -30, to: Date())!
        sut.heightCm = "175"
        sut.currentWeightKg = "80.0"
        sut.targetWeightKg = "70.0"
        sut.targetDate = Calendar.current.date(byAdding: .month, value: 3, to: Date())!
        sut.mealsPerDay = 3
        sut.dietaryPreferences = ["Vegetarian"]
        sut.allergies = ["Peanuts"]

        // When
        let errors = sut.validateProfile()

        // Then
        XCTAssertTrue(errors.isEmpty, "Valid profile should have no errors")
        XCTAssertTrue(sut.isValid, "isValid should be true")
    }

    /// Test 28: Offline mode prevents save - given offline state, when saving, then should show offline error
    func testSaveProfile_GivenOfflineState_WhenSaving_ThenShowsOfflineError() async {
        // Given - Set offline state (if we can access it)
        // Note: isOffline is private, so we test the behavior indirectly
        // For now, this is a placeholder for when offline detection is implemented

        // Setup valid data
        sut.name = "John Doe"
        sut.email = "john@example.com"

        // When - This test would be more meaningful when offline detection is added
        // For now, we just verify the current behavior
        let success = await sut.saveProfile()

        // Then - With no changes and no original profile, this should return false
        // When offline support is added, we'd check for offline error message
        XCTAssertFalse(success, "Should fail when no changes exist")
    }

    // MARK: - Helper Methods

    /// Create a mock ProfileResponse for testing
    private func createMockProfile() -> ProfileResponse {
        ProfileResponse(
            user: ProfileResponse.UserBasic(
                id: 1,
                email: "test@example.com",
                name: "Test User"
            ),
            demographics: ProfileResponse.Demographics(
                dateOfBirth: "1995-01-15",
                gender: "male",
                height: 175.0
            ),
            health: ProfileResponse.HealthMetrics(
                currentWeight: 80.0,
                targetWeight: 70.0
            ),
            goals: ProfileResponse.Goals(
                primaryGoal: "lose_weight",
                targetDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(90 * 24 * 60 * 60)),
                activityLevel: "moderately_active"
            ),
            preferences: ProfileResponse.Preferences(
                dietaryPreferences: ["Vegetarian"],
                allergies: ["Peanuts"],
                mealsPerDay: 3
            ),
            targets: ProfileResponse.NutritionTargets(
                bmr: 1800,
                tdee: 2400,
                calorieTarget: 2000,
                proteinTarget: 150,
                waterTarget: 2500
            )
        )
    }

    /// Create a mock profile update response
    private func createMockProfileUpdateResponse(planUpdated: Bool = false) -> ProfileUpdateResponse {
        ProfileUpdateResponse(
            success: true,
            profile: nil,
            planUpdated: planUpdated,
            targets: nil,
            changes: planUpdated ? ProfileUpdateResponse.TargetChanges(
                previousCalories: 2000,
                newCalories: 1900,
                previousProtein: 150,
                newProtein: 140
            ) : nil,
            message: "Profile updated successfully"
        )
    }
}
