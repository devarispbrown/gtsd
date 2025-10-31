# GTSD iOS App - API Response Format Documentation

## Overview

This document provides comprehensive documentation of the GTSD API response format, Swift implementation code for response handling, and integration tests for the iOS application.

## API Response Format

### Success Response Format

All successful API responses follow this consistent format:

```json
{
  "success": true,
  "data": {
    // Endpoint-specific response data
  }
}
```

### Error Response Format

All error responses use this format:

```json
{
  "error": {
    "message": "Error description",
    "requestId": "uuid-request-id",
    "stack": "Stack trace (development only)"
  }
}
```

### Special Response Variations

Some endpoints include additional metadata:

```json
{
  "success": true,
  "data": {
    /* ... */
  },
  "cached": true, // Optional: Indicates cached response
  "message": "Success!" // Optional: Success message (e.g., logout)
}
```

---

## Endpoint Response Specifications

### 1. Authentication Endpoints

#### POST /auth/signup

**Status Code:** 201 Created

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "createdAt": "ISO8601 datetime",
      "updatedAt": "ISO8601 datetime"
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

#### POST /auth/login

**Status Code:** 200 OK

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "createdAt": "ISO8601 datetime",
      "updatedAt": "ISO8601 datetime"
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

#### POST /auth/refresh

**Status Code:** 200 OK

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

#### POST /auth/logout

**Status Code:** 200 OK

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me

**Status Code:** 200 OK

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "createdAt": "ISO8601 datetime",
    "updatedAt": "ISO8601 datetime"
    // Note: passwordHash is excluded
  }
}
```

---

### 2. Tasks Endpoints

#### GET /v1/tasks/today

**Status Code:** 200 OK

**Query Parameters:**

- `date`: YYYY-MM-DD (optional, defaults to today)
- `limit`: number (default 50, max 100)
- `offset`: number (default 0)
- `type`: task type filter (optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "totalTasks": 10,
    "completedTasks": 5,
    "tasks": [
      {
        "id": 123,
        "type": "cardio" | "strength" | "nutrition" | "photos",
        "title": "string",
        "description": "string",
        "dueDate": "YYYY-MM-DD",
        "completed": true,
        "completedAt": "ISO8601 datetime or null",
        "evidence": {
          "id": 456,
          "type": "text_log" | "metrics" | "photo_reference",
          "data": {},
          "notes": "string or null"
        }
      }
    ]
  },
  "cached": true
}
```

#### POST /v1/evidence

**Status Code:** 201 Created

**Request Body:**

```json
{
  "taskId": 123,
  "type": "text_log" | "metrics" | "photo_reference",
  "data": {
    "text": "string (optional)",
    "metrics": {},
    "photoUrl": "string (optional)"
  },
  "notes": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "evidence": {
      "id": 456,
      "taskId": 123,
      "type": "text_log",
      "data": {},
      "notes": "string or null",
      "createdAt": "ISO8601 datetime"
    },
    "streakUpdated": true,
    "newStreak": 7
  }
}
```

---

### 3. Progress Photos Endpoints

#### POST /v1/progress/photo/presign

**Status Code:** 200 OK
**Rate Limit:** 20 requests/minute

**Request Body:**

```json
{
  "fileName": "string (max 255 chars)",
  "contentType": "image/jpeg" | "image/png" | "image/heic",
  "fileSize": 10485760
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "fileKey": "progress-photos/{userId}/{uuid}-{filename}",
    "expiresIn": 3600
  }
}
```

#### POST /v1/progress/photo/confirm

**Status Code:** 201 Created (or 200 OK for idempotent requests)
**Rate Limit:** 30 requests/minute

**Request Body:**

```json
{
  "fileKey": "string",
  "width": 1920,
  "height": 1080,
  "fileSize": 2048576,
  "contentType": "image/jpeg",
  "takenAt": "ISO8601 datetime (optional)",
  "taskId": 123,
  "evidenceType": "before" | "during" | "after"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "photoId": 789,
    "downloadUrl": "https://s3.amazonaws.com/..."
  }
}
```

#### GET /v1/progress/photos

**Status Code:** 200 OK

**Query Parameters:**

- `limit`: number (default 50, max 100)
- `offset`: number (default 0)
- `taskId`: number (optional filter)

**Response:**

```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": 789,
        "fileKey": "string",
        "fileSize": 2048576,
        "mimeType": "image/jpeg",
        "width": 1920,
        "height": 1080,
        "takenAt": "ISO8601 datetime or null",
        "uploadedAt": "ISO8601 datetime",
        "createdAt": "ISO8601 datetime",
        "downloadUrl": "https://s3.amazonaws.com/...",
        "evidenceType": "before" | "during" | "after" | null
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 25
    }
  }
}
```

#### DELETE /v1/progress/photo/:photoId

**Status Code:** 200 OK

**Response:**

```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

---

### 4. Streaks Endpoints

#### GET /v1/streaks/me

**Status Code:** 200 OK
**Performance Target:** p95 < 200ms

**Response:**

```json
{
  "success": true,
  "data": {
    "streak": {
      "id": "string",
      "userId": "string",
      "currentStreak": 14,
      "longestStreak": 21,
      "totalCompliantDays": 42,
      "lastCompliantDate": "YYYY-MM-DD",
      "createdAt": "ISO8601 datetime",
      "updatedAt": "ISO8601 datetime"
    },
    "todayCompliance": null,
    "canIncrementToday": true
  }
}
```

#### GET /v1/badges/me

**Status Code:** 200 OK
**Performance Target:** p95 < 200ms

**Response:**

```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "string",
        "userId": "string",
        "badgeType": "first_day" | "week_warrior" | "month_master",
        "awardedAt": "ISO8601 datetime",
        "metadata": {}
      }
    ],
    "totalBadges": 5,
    "totalAvailable": 16,
    "completionPercentage": 31
  }
}
```

#### POST /v1/streaks/check-compliance

**Status Code:** 200 OK
**Rate Limit:** 20 requests/minute

**Request Body:**

```json
{
  "date": "YYYY-MM-DD (optional, defaults to today)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isCompliant": true,
    "streakData": {
      "currentStreak": 15,
      "longestStreak": 21,
      "totalCompliantDays": 43
    },
    "newlyAwardedBadges": [
      {
        "id": "string",
        "badgeType": "week_warrior",
        "awardedAt": "ISO8601 datetime"
      }
    ]
  }
}
```

---

### 5. Plans Endpoints

#### POST /v1/plans/generate

**Status Code:** 201 Created (new plan) or 200 OK (existing plan)
**Rate Limit:** 20 requests/minute
**Performance Target:** p95 < 300ms

**Request Body:**

```json
{
  "forceRecompute": false
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "string",
      "userId": "string",
      "weekStartDate": "YYYY-MM-DD",
      "weekEndDate": "YYYY-MM-DD",
      "targets": {
        "bmr": 1800,
        "tdee": 2400,
        "targetCalories": 2000,
        "proteinGrams": 150,
        "carbGrams": 200,
        "fatGrams": 65
      },
      "educationalContent": {
        "title": "Why This Plan Works",
        "sections": [
          {
            "heading": "Your Energy Needs",
            "content": "string"
          }
        ]
      },
      "createdAt": "ISO8601 datetime"
    },
    "recomputed": false
  }
}
```

---

## Error Response Examples

### Validation Error (400 Bad Request)

```json
{
  "error": {
    "message": "Validation failed: email: Invalid email format, password: Password must be at least 8 characters",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Unauthorized (401 Unauthorized)

```json
{
  "error": {
    "message": "Invalid or expired token",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Forbidden (403 Forbidden)

```json
{
  "error": {
    "message": "Invalid file key: does not belong to authenticated user",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Not Found (404 Not Found)

```json
{
  "error": {
    "message": "Task 123 not found or does not belong to user",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "error": {
    "message": "Too many presign requests, please try again later",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Internal Server Error (500 Internal Server Error)

```json
{
  "error": {
    "message": "Failed to create user: Database connection error",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "stack": "Error: ...\n    at ..." // Development only
  }
}
```

---

## Special Cases and Edge Cases

### 1. Cached Responses

Some endpoints (like `/v1/tasks/today`) may return cached data:

- Include `"cached": true` in response
- Cache TTL: 60 seconds
- Cache invalidated on data mutations

### 2. Idempotent Requests

Photo confirmation endpoint supports idempotency:

- If photo with same `fileKey` exists, returns 200 OK instead of 201 Created
- Returns existing photo data
- Safe to retry without creating duplicates

### 3. Optional Fields

Many responses include optional/nullable fields:

- `null` values are explicitly returned (not omitted)
- Client should handle both presence and absence of optional fields
- Example: `"notes": null` vs `"notes": "User comment"`

### 4. Pagination

Endpoints returning lists include pagination metadata:

- `limit`: Requested limit (default 50, max 100)
- `offset`: Starting offset (default 0)
- `total`: Number of items in current response (not total available)

### 5. Rate Limiting

Rate-limited endpoints include headers:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Swift Implementation Guidelines

### Key Requirements

1. **Generic Response Wrapper**: Create `APIResponse<T>` to handle the `{ success, data }` format
2. **Error Handling**: Separate error response type for `{ error }` format
3. **Type Safety**: Leverage Swift's type system to prevent runtime errors
4. **Codable Conformance**: All types must conform to `Codable`
5. **Optional Handling**: Properly decode optional/nullable fields
6. **Date Parsing**: Support ISO8601 datetime strings and YYYY-MM-DD dates
7. **Enum Support**: Use enums for typed string literals (e.g., task types, evidence types)

### Implementation Patterns

See the accompanying Swift code files:

- `APIResponse.swift`: Generic response wrapper types
- `NetworkModels.swift`: Domain-specific response models
- `APIResponseTests.swift`: Integration tests

---

## Testing Checklist

### Success Response Tests

- [ ] Parse valid success response with all fields
- [ ] Parse success response with optional fields as null
- [ ] Parse success response with missing optional fields
- [ ] Validate type safety of generic data payload

### Error Response Tests

- [ ] Parse validation error (400)
- [ ] Parse unauthorized error (401)
- [ ] Parse forbidden error (403)
- [ ] Parse not found error (404)
- [ ] Parse rate limit error (429)
- [ ] Parse server error (500)
- [ ] Handle development stack trace field

### Edge Case Tests

- [ ] Cached response with `cached: true`
- [ ] Message-only response (logout)
- [ ] Empty arrays in lists
- [ ] Null vs missing optional fields
- [ ] Invalid JSON handling
- [ ] Unexpected fields (forward compatibility)

### Date Handling Tests

- [ ] ISO8601 datetime parsing
- [ ] YYYY-MM-DD date parsing
- [ ] Null datetime handling
- [ ] Timezone handling

### Enum Tests

- [ ] Valid enum values
- [ ] Unknown enum values (graceful failure)
- [ ] Case sensitivity

---

## Version History

**Version 1.0** - 2025-10-26

- Initial documentation
- Covers all v1 API endpoints
- Includes error response formats
- Swift implementation guidelines

---

## Related Documentation

- `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_API_RESPONSE_SWIFT_IMPLEMENTATION.md` - Complete Swift code
- `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_API_RESPONSE_INTEGRATION_TESTS.md` - XCTest integration tests
- `/Users/devarisbrown/Code/projects/gtsd/apps/GTSD_iOS_ARCHITECTURE.md` - Overall iOS architecture
- `/Users/devarisbrown/Code/projects/gtsd/apps/IOS_TESTING_STRATEGY.md` - Testing strategy
