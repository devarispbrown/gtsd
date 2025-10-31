// DEBUG_VERIFICATION.swift
// Add these debug statements to verify fixes are actually running
// Copy and paste these into the appropriate files temporarily

// ============================================
// 1. For MetricsSummaryViewModel.swift
// Add at the beginning of acknowledgeAndContinue() function:
// ============================================

/*
func acknowledgeAndContinue() async -> Bool {
    // DEBUG VERIFICATION - REMOVE AFTER TESTING
    print("🔍 [DEBUG] acknowledgeAndContinue() called")
    print("🔍 [DEBUG] metricsData exists: \(metricsData != nil)")

    guard let metricsData = metricsData else {
        print("🔍 [DEBUG] No metrics data available - returning false")
        Logger.warning("Cannot acknowledge metrics: no data available")
        return false
    }

    print("🔍 [DEBUG] Metrics version: \(metricsData.metrics.version)")
    print("🔍 [DEBUG] computedAtString: '\(metricsData.metrics.computedAtString)'")
    print("🔍 [DEBUG] computedAtString type: \(type(of: metricsData.metrics.computedAtString))")
    print("🔍 [DEBUG] Is already acknowledged: \(metricsData.acknowledged)")

    // ... rest of existing code

    // Before the API call:
    print("🔍 [DEBUG] About to call acknowledgeMetrics with:")
    print("🔍 [DEBUG]   - version: \(metricsData.metrics.version)")
    print("🔍 [DEBUG]   - metricsComputedAt: '\(metricsData.metrics.computedAtString)'")
*/

// ============================================
// 2. For ProfileEditViewModel.swift
// Add in saveChanges() function after dietary preferences update:
// ============================================

/*
    // After line 297 (dietary preferences update):
    Logger.info("Dietary preferences updated - Prefs: \(dietaryPreferences.count), Allergies: \(allergies.count), Meals: \(meals)")

    // DEBUG VERIFICATION - REMOVE AFTER TESTING
    print("🔍 [DEBUG] Preferences update completed")
    print("🔍 [DEBUG] Current authService.currentUser preferences: \(authService.currentUser?.dietaryPreferences ?? [])")
    print("🔍 [DEBUG] About to fetch fresh user data...")

    // After line 322 (fresh user fetch):
    Logger.info("Fresh user data received - Preferences: \(freshUser.dietaryPreferences?.count ?? 0), Allergies: \(freshUser.allergies?.count ?? 0)")

    // DEBUG VERIFICATION - REMOVE AFTER TESTING
    print("🔍 [DEBUG] Fresh user fetched successfully")
    print("🔍 [DEBUG] Fresh dietary preferences: \(freshUser.dietaryPreferences ?? [])")
    print("🔍 [DEBUG] Fresh allergies: \(freshUser.allergies ?? [])")
    print("🔍 [DEBUG] Fresh meals per day: \(freshUser.mealsPerDay ?? 0)")

    // After line 326 (auth service update):
    await authService.updateCurrentUser(freshUser)

    // DEBUG VERIFICATION - REMOVE AFTER TESTING
    print("🔍 [DEBUG] Auth service updated")
    print("🔍 [DEBUG] Verified authService.currentUser now has:")
    print("🔍 [DEBUG]   - Preferences: \(authService.currentUser?.dietaryPreferences ?? [])")
    print("🔍 [DEBUG]   - Allergies: \(authService.currentUser?.allergies ?? [])")
*/

// ============================================
// 3. For ProfileEditViewModel.swift
// Add in loadSelectedPhoto() function:
// ============================================

/*
func loadSelectedPhoto() async {
    // DEBUG VERIFICATION - REMOVE AFTER TESTING
    print("🔍 [DEBUG] loadSelectedPhoto() called")
    print("🔍 [DEBUG] selectedPhoto is nil: \(selectedPhoto == nil)")

    guard let item = selectedPhoto else {
        print("🔍 [DEBUG] No selected photo - returning")
        Logger.warning("loadSelectedPhoto called but selectedPhoto is nil")
        return
    }

    print("🔍 [DEBUG] Loading photo from PhotosPicker...")

    do {
        // When loading data:
        guard let data = try await item.loadTransferable(type: Data.self) else {
            print("🔍 [DEBUG] ERROR: No data returned from PhotosPicker")
            Logger.error("Failed to load photo: No data returned from PhotosPicker item")
            errorMessage = "Unable to load photo. Please try selecting a different photo."
            return
        }

        print("🔍 [DEBUG] Photo data loaded: \(data.count) bytes")

        // When creating UIImage:
        guard let image = UIImage(data: data) else {
            print("🔍 [DEBUG] ERROR: Cannot create UIImage from data")
            print("🔍 [DEBUG] Data first 20 bytes: \(Array(data.prefix(20)))")
            Logger.error("Failed to create UIImage from photo data")
            errorMessage = "Unable to process photo. Please select a different image format."
            return
        }

        print("🔍 [DEBUG] UIImage created successfully")
        print("🔍 [DEBUG] Image size: \(image.size.width) x \(image.size.height)")

    } catch let error as NSError {
        print("🔍 [DEBUG] ERROR loading photo:")
        print("🔍 [DEBUG]   - Domain: \(error.domain)")
        print("🔍 [DEBUG]   - Code: \(error.code)")
        print("🔍 [DEBUG]   - Description: \(error.localizedDescription)")
        // ... rest of error handling
    }
*/

// ============================================
// 4. For APIClient.swift or NetworkLogger
// Add request/response logging:
// ============================================

/*
// In the request function, before sending:
print("🔍 [DEBUG] API Request:")
print("🔍 [DEBUG]   - Method: \(request.httpMethod ?? "GET")")
print("🔍 [DEBUG]   - URL: \(request.url?.absoluteString ?? "nil")")
if let body = request.httpBody {
    if let json = try? JSONSerialization.jsonObject(with: body) {
        print("🔍 [DEBUG]   - Body: \(json)")
    } else if let string = String(data: body, encoding: .utf8) {
        print("🔍 [DEBUG]   - Body (string): \(string)")
    }
}

// After receiving response:
print("🔍 [DEBUG] API Response:")
print("🔍 [DEBUG]   - Status: \(httpResponse.statusCode)")
if let responseData = data,
   let json = try? JSONSerialization.jsonObject(with: responseData) {
    print("🔍 [DEBUG]   - Response: \(json)")
}
*/

// ============================================
// 5. Test Verification Steps
// ============================================

/*
TESTING CHECKLIST:

1. Metrics Acknowledgment Test:
   - Open app
   - Navigate to metrics screen
   - Open Console.app and filter for "DEBUG"
   - Tap acknowledge button
   - Verify you see:
     * computedAtString value (should be ISO8601 string)
     * API request with correct format
     * Response status code

2. Dietary Preferences Test:
   - Open profile edit
   - Add "Vegetarian" as preference
   - Add "Peanuts" as allergy
   - Save
   - Check Console for:
     * "Fresh user fetched successfully"
     * Fresh dietary preferences array
     * Auth service updated confirmation
   - Exit and re-enter profile edit
   - Verify preferences are still there

3. Photo Selection Test:
   - Open profile edit
   - Tap "Change Photo"
   - Check Console for:
     * "loadSelectedPhoto() called"
     * Photo data byte count
     * Image dimensions
   - If error, check error domain and code

IMPORTANT: After testing, remove all debug print statements!
*/