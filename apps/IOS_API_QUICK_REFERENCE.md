# GTSD iOS App - API Quick Reference Guide

## Quick Start

This is a condensed reference for the GTSD API response implementation. For complete details, see the full documentation files.

---

## Response Format Cheat Sheet

### Success Response

```json
{
  "success": true,
  "data": {
    /* your data here */
  }
}
```

### Error Response

```json
{
  "error": {
    "message": "Error description",
    "requestId": "uuid"
  }
}
```

---

## Common Endpoints

### Authentication

```swift
// Login
POST /auth/login
Body: { email: String, password: String }
Response: { user: User, accessToken: String, refreshToken: String }

// Refresh Token
POST /auth/refresh
Body: { refreshToken: String }
Response: { accessToken: String, refreshToken: String }

// Get Profile
GET /auth/me
Response: User
```

### Tasks

```swift
// Get Today's Tasks
GET /v1/tasks/today?date=YYYY-MM-DD&limit=50
Response: { totalTasks: Int, completedTasks: Int, tasks: [Task] }

// Submit Evidence
POST /v1/evidence
Body: { taskId: Int, type: EvidenceType, data: {}, notes: String? }
Response: { evidence: TaskEvidence, streakUpdated: Bool, newStreak: Int }
```

### Photos

```swift
// Request Upload URL
POST /v1/progress/photo/presign
Body: { fileName: String, contentType: PhotoContentType, fileSize: Int }
Response: { uploadUrl: String, fileKey: String, expiresIn: Int }

// Confirm Upload
POST /v1/progress/photo/confirm
Body: { fileKey: String, ... }
Response: { photoId: Int, downloadUrl: String }

// List Photos
GET /v1/progress/photos?limit=50&offset=0
Response: { photos: [Photo], pagination: Pagination }
```

### Streaks & Badges

```swift
// Get Streaks
GET /v1/streaks/me
Response: { streak: DailyComplianceStreak, todayCompliance: null, canIncrementToday: Bool }

// Get Badges
GET /v1/badges/me
Response: { badges: [UserBadge], totalBadges: Int, totalAvailable: Int, completionPercentage: Int }
```

### Plans

```swift
// Generate Plan
POST /v1/plans/generate
Body: { forceRecompute: Bool }
Response: { plan: WeeklyPlan, recomputed: Bool }
```

---

## Swift Usage Examples

### Basic API Call

```swift
// Using APIClient
let client = APIClient()

// Login
let authResponse = try await client.login(
    email: "user@example.com",
    password: "password123"
)
print("Logged in as: \(authResponse.user.email)")

// Fetch tasks
let tasksResponse = try await client.fetchTasks()
print("Tasks: \(tasksResponse.totalTasks)")
print("Completed: \(tasksResponse.completedTasks)")
```

### Error Handling

```swift
do {
    let response = try await client.fetchTasks()
    // Use response.data
} catch let error as APIError {
    switch error {
    case .unauthorized:
        // Show login screen
    case .rateLimitExceeded:
        // Show "Please wait" message
    case .apiError(let errorResponse):
        // Show error: errorResponse.error.message
        // Log request ID: errorResponse.requestId
    case .networkError:
        // Show "No internet" message
    default:
        // Show generic error
    }
}
```

### Decoding Custom Responses

```swift
// Manual decoding
let json = """
{
    "success": true,
    "data": {
        "value": 42
    }
}
""".data(using: .utf8)!

struct MyData: Codable {
    let value: Int
}

let response = try APIResponseDecoder.decode(MyData.self, from: json)
print(response.data.value) // 42
```

---

## Common Types

### Task Types

```swift
enum TaskType: String, Codable {
    case cardio
    case strength
    case nutrition
    case photos
}
```

### Evidence Types

```swift
enum EvidenceType: String, Codable {
    case textLog = "text_log"
    case metrics
    case photoReference = "photo_reference"
}
```

### Photo Content Types

```swift
enum PhotoContentType: String, Codable {
    case jpeg = "image/jpeg"
    case png = "image/png"
    case heic = "image/heic"
}
```

### Photo Evidence Types

```swift
enum PhotoEvidenceType: String, Codable {
    case before
    case during
    case after
}
```

### Badge Types

```swift
enum BadgeType: String, Codable {
    case firstDay = "first_day"
    case weekWarrior = "week_warrior"
    case monthMaster = "month_master"
    case quarterChampion = "quarter_champion"
    case yearLegend = "year_legend"
    case perfect10 = "perfect_10"
    case perfect30 = "perfect_30"
    case perfect100 = "perfect_100"
    case comeback
    case earlyBird = "early_bird"
    case nightOwl = "night_owl"
    case photoProof = "photo_proof"
    case dataDriver = "data_driver"
    case allRounder = "all_rounder"
    case strengthMaster = "strength_master"
    case cardioKing = "cardio_king"
}
```

---

## Date Formats

The API uses three date formats:

```swift
// 1. ISO8601 with fractional seconds
"2025-10-26T14:30:00.123Z"

// 2. ISO8601 without fractional seconds
"2025-10-26T14:30:00Z"

// 3. Date only (YYYY-MM-DD)
"2025-10-26"
```

All formats are handled automatically by the custom date decoder.

---

## HTTP Status Codes

| Code | Meaning      | Action                 |
| ---- | ------------ | ---------------------- |
| 200  | Success      | Use response data      |
| 201  | Created      | New resource created   |
| 400  | Bad Request  | Show validation error  |
| 401  | Unauthorized | Redirect to login      |
| 403  | Forbidden    | Show permission error  |
| 404  | Not Found    | Resource doesn't exist |
| 429  | Rate Limited | Show "Please wait"     |
| 500  | Server Error | Show generic error     |

---

## Rate Limits

| Endpoint         | Limit     |
| ---------------- | --------- |
| Photo presign    | 20/minute |
| Photo confirm    | 30/minute |
| Check compliance | 20/minute |
| Plan generation  | 20/minute |

---

## Special Cases

### Cached Responses

```swift
let response = try await client.fetchTasks()
if response.isCached {
    // Data from cache (may be stale)
}
```

### Idempotent Requests

```swift
// Photo confirm can be called multiple times safely
// Returns 200 if already exists, 201 if new
let response = try await client.confirmPhoto(fileKey: key)
```

### Optional Fields

```swift
// Null vs missing
struct Photo: Codable {
    let width: Int?    // Can be null or missing
    let height: Int?   // Swift handles both as nil
}
```

### Dynamic Data

```swift
// Evidence data is dynamic
struct TaskEvidence: Codable {
    let data: [String: AnyCodable]
}

// Access values
if let distance = evidence.data["distance"]?.value as? Double {
    print("Distance: \(distance)")
}
```

---

## Testing Quick Reference

### Run All Tests

```bash
cmd + U
```

### Run Specific Test

```bash
cmd + click on test name
```

### Code Coverage

```bash
xcodebuild test -scheme GTSD -enableCodeCoverage YES
```

### Performance Baseline

```swift
measure {
    _ = try? decodeResponse(TodayTasksResponse.self, from: json)
}
```

---

## Troubleshooting

### Problem: "success is false"

**Solution**: You're trying to decode an error response as success. Use `APIResponseDecoder.handleResponse()` instead.

### Problem: "Cannot decode date"

**Solution**: Date format doesn't match any of the three supported formats. Check API response.

### Problem: "Type mismatch"

**Solution**: Response structure changed. Update your Codable model.

### Problem: Rate limit errors

**Solution**: Implement exponential backoff or show "Please wait" message.

### Problem: "Invalid response"

**Solution**: Check HTTP status code. Might be network error or server error.

---

## File Organization

```
GTSD/
├── Core/
│   ├── Networking/
│   │   ├── APIResponse.swift           # Generic wrapper
│   │   ├── APIResponseDecoder.swift    # Decoder + helpers
│   │   └── APIError.swift              # Error types
│   └── Models/
│       ├── AuthenticationModels.swift  # Auth types
│       ├── TaskModels.swift            # Task types
│       ├── PhotoModels.swift           # Photo types
│       ├── StreakModels.swift          # Streak types
│       └── PlanModels.swift            # Plan types
├── Services/
│   └── APIClient.swift                 # API client
└── Tests/
    ├── APIResponseTests.swift          # Response wrapper tests
    ├── AuthenticationResponseTests.swift
    ├── TaskResponseTests.swift
    ├── PhotoResponseTests.swift
    ├── StreakResponseTests.swift
    └── PlanResponseTests.swift
```

---

## Implementation Checklist

### Setup

- [ ] Copy all Swift files to project
- [ ] Copy all test files to test target
- [ ] Run tests (should all pass)
- [ ] Update API base URL
- [ ] Configure authentication

### Core Features

- [ ] Implement login flow
- [ ] Implement token refresh
- [ ] Implement logout
- [ ] Add token storage (Keychain)
- [ ] Add error handling UI

### API Integration

- [ ] Tasks endpoint
- [ ] Photos endpoint
- [ ] Streaks endpoint
- [ ] Badges endpoint
- [ ] Plans endpoint

### Quality

- [ ] All tests passing
- [ ] SwiftLint clean
- [ ] No warnings
- [ ] Memory leak check
- [ ] Performance benchmark

---

## Common Patterns

### SwiftUI Integration

```swift
struct TasksView: View {
    @StateObject private var apiClient = APIClient()
    @State private var tasks: [Task] = []

    var body: some View {
        List(tasks) { task in
            TaskRow(task: task)
        }
        .task {
            await loadTasks()
        }
        .alert(
            "Error",
            isPresented: .constant(apiClient.error != nil),
            presenting: apiClient.error
        ) { _ in
            Button("OK") { apiClient.error = nil }
        } message: { error in
            Text(error.localizedDescription)
        }
    }

    func loadTasks() async {
        do {
            let response = try await apiClient.fetchTasks()
            tasks = response.tasks
        } catch {
            // Error is published to apiClient.error
        }
    }
}
```

### Combine Integration

```swift
class TasksViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var error: APIError?

    private let apiClient = APIClient()
    private var cancellables = Set<AnyCancellable>()

    func fetchTasks() {
        Task {
            do {
                let response = try await apiClient.fetchTasks()
                await MainActor.run {
                    self.tasks = response.tasks
                }
            } catch let error as APIError {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
}
```

---

## Performance Tips

1. **Use cached responses** when available
2. **Implement pagination** for large lists
3. **Batch API calls** when possible
4. **Cancel tasks** when views disappear
5. **Monitor decode time** in Instruments

---

## Security Tips

1. **Use Keychain** for token storage (not UserDefaults)
2. **Enable HTTPS only** in App Transport Security
3. **Validate file keys** before upload
4. **Include request IDs** in error logs
5. **Implement certificate pinning** in production

---

## Resources

### Full Documentation

- API Specs: `IOS_API_RESPONSE_DOCUMENTATION.md`
- Swift Code: `IOS_API_RESPONSE_SWIFT_IMPLEMENTATION.md`
- Integration Tests: `IOS_API_RESPONSE_INTEGRATION_TESTS.md`
- Summary: `IOS_API_RESPONSE_SUMMARY.md`

### Apple Documentation

- [URLSession](https://developer.apple.com/documentation/foundation/urlsession)
- [Codable](https://developer.apple.com/documentation/swift/codable)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)
- [Actors](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html#ID645)

---

**Version**: 1.0
**Last Updated**: 2025-10-26
**Status**: Ready for Use
