# Password Management API Endpoints

Quick reference for iOS app integration.

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.gtsd.com/api
```

---

## 1. Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Description**: Initiates password reset flow by sending an email with a reset link.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "If an account exists with that email, you will receive a password reset link shortly."
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "Validation failed: email: Invalid email address"
}
```

**Rate Limit**: 20 requests per minute per IP

**Notes**:
- Always returns success even if email doesn't exist (security best practice)
- User receives email with reset link if account exists
- Reset link expires in 1 hour

**Swift Example**:
```swift
func forgotPassword(email: String) async throws {
    let url = URL(string: "\(baseURL)/auth/forgot-password")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body = ["email": email]
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NetworkError.requestFailed
    }

    // Show success message to user
}
```

---

## 2. Reset Password

**Endpoint**: `POST /auth/reset-password`

**Description**: Resets user password using the token from the email link.

**Request Body**:
```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecurePass123!"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Error Responses**:

Invalid token (400):
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

Weak password (400):
```json
{
  "success": false,
  "message": "Validation failed: newPassword: Password must be at least 8 characters"
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{};\\':",.<>/?)

**Rate Limit**: 20 requests per minute per IP

**Notes**:
- Token can only be used once
- All user sessions are logged out after password reset
- User receives confirmation email

**Swift Example**:
```swift
func resetPassword(token: String, newPassword: String) async throws {
    let url = URL(string: "\(baseURL)/auth/reset-password")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body = [
        "token": token,
        "newPassword": newPassword
    ]
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
        throw NetworkError.invalidResponse
    }

    if httpResponse.statusCode == 200 {
        // Success - navigate to login screen
        return
    } else {
        // Parse error and show to user
        let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
        throw NetworkError.serverError(error.message)
    }
}
```

---

## 3. Change Password

**Endpoint**: `PATCH /auth/change-password`

**Description**: Allows authenticated user to change their password.

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePass456!"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully. All sessions have been logged out. Please log in again."
}
```

**Error Responses**:

Unauthorized (401):
```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid JWT token."
}
```

Wrong current password (401):
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

Same password (400):
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```

Weak password (400):
```json
{
  "success": false,
  "message": "Validation failed: newPassword: Password must contain at least one uppercase letter"
}
```

**Password Requirements**: Same as Reset Password

**Rate Limit**: 20 requests per minute per IP

**Notes**:
- Requires valid JWT access token
- All user sessions are logged out after password change
- User must log in again with new password
- User receives confirmation email

**Swift Example**:
```swift
func changePassword(currentPassword: String, newPassword: String, accessToken: String) async throws {
    let url = URL(string: "\(baseURL)/auth/change-password")!
    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

    let body = [
        "currentPassword": currentPassword,
        "newPassword": newPassword
    ]
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
        throw NetworkError.invalidResponse
    }

    if httpResponse.statusCode == 200 {
        // Success - clear stored tokens and navigate to login
        return
    } else {
        // Parse error and show to user
        let error = try JSONDecoder().decode(ErrorResponse.self, from: data)
        throw NetworkError.serverError(error.message)
    }
}
```

---

## Password Validation

All password fields must meet these requirements:

```swift
func validatePassword(_ password: String) -> [String] {
    var errors: [String] = []

    if password.count < 8 {
        errors.append("Password must be at least 8 characters")
    }

    if !password.contains(where: { $0.isUppercase }) {
        errors.append("Password must contain at least one uppercase letter")
    }

    if !password.contains(where: { $0.isLowercase }) {
        errors.append("Password must contain at least one lowercase letter")
    }

    if !password.contains(where: { $0.isNumber }) {
        errors.append("Password must contain at least one number")
    }

    let specialCharacters = CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{};\\':\",.<>/?")
    if password.rangeOfCharacter(from: specialCharacters) == nil {
        errors.append("Password must contain at least one special character")
    }

    return errors
}
```

---

## Complete Password Reset Flow

### User Flow:

1. **Forgot Password Screen**
   - User enters email
   - Call `POST /auth/forgot-password`
   - Show success message (always)
   - Prompt user to check email

2. **User Clicks Reset Link in Email**
   - Deep link opens app with token parameter
   - Parse token from URL: `gtsd://reset-password?token=abc123...`
   - Navigate to Reset Password screen

3. **Reset Password Screen**
   - User enters new password
   - Validate password requirements (client-side)
   - Call `POST /auth/reset-password` with token and new password
   - On success: navigate to login screen
   - On error: show error message

4. **Login Screen**
   - User logs in with new password
   - Store new access/refresh tokens
   - Navigate to main app

### Settings Flow (Change Password):

1. **Settings/Account Screen**
   - User taps "Change Password"
   - Navigate to Change Password screen

2. **Change Password Screen**
   - User enters current password
   - User enters new password
   - User confirms new password (client-side validation)
   - Validate password requirements
   - Call `PATCH /auth/change-password` with access token
   - On success: clear stored tokens, navigate to login
   - On error: show error message

3. **Login Screen**
   - User logs in with new password
   - Store new access/refresh tokens
   - Navigate to main app

---

## Deep Linking

Configure your app to handle deep links for password reset:

**URL Scheme**: `gtsd://reset-password?token=<TOKEN>`

**SwiftUI Example**:
```swift
.onOpenURL { url in
    if url.scheme == "gtsd",
       url.host == "reset-password",
       let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
       let token = components.queryItems?.first(where: { $0.name == "token" })?.value {
        // Navigate to reset password screen with token
        navigationPath.append(Route.resetPassword(token: token))
    }
}
```

---

## Error Handling

### HTTP Status Codes:
- `200` - Success
- `400` - Validation error or bad request
- `401` - Authentication required or invalid credentials
- `403` - Account deactivated
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error

### Recommended Error Messages to User:

**Rate Limited (429)**:
> "Too many attempts. Please wait a few minutes and try again."

**Invalid Token (400)**:
> "This reset link has expired or is invalid. Please request a new password reset."

**Weak Password (400)**:
> "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."

**Wrong Current Password (401)**:
> "Current password is incorrect. Please try again."

**Server Error (500)**:
> "Something went wrong. Please try again later."

---

## Testing

### Test Accounts

For development testing, create test users:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

### Development Mode

In development, password reset links are logged to the server console:
```
==============================================
PASSWORD RESET LINK (Development Mode):
http://localhost:3000/reset-password?token=abc123...
==============================================
```

Copy this link to test the reset flow without email configuration.

---

## Security Considerations

1. **Always Use HTTPS in Production**
   - Never send passwords over HTTP
   - Configure App Transport Security in Info.plist

2. **Store Tokens Securely**
   - Use Keychain for access/refresh tokens
   - Never store passwords

3. **Validate Input Client-Side**
   - Show validation errors before API call
   - Improves UX and reduces API calls

4. **Handle Rate Limits**
   - Show user-friendly messages
   - Implement exponential backoff if needed

5. **Clear Tokens After Password Change**
   - Force re-authentication
   - Update all stored tokens

6. **Deep Link Validation**
   - Validate token format before calling API
   - Handle malformed URLs gracefully

---

## Support

For API issues or questions:
- Check server logs for detailed error information
- Review `PASSWORD_RESET_IMPLEMENTATION.md` for implementation details
- Test endpoints using provided test script: `./test-password-reset.sh`
