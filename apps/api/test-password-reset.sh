#!/bin/bash

# Test script for password reset endpoints
# Run this after starting the API server with: npm run dev

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/api"

echo "========================================"
echo "Password Reset Endpoints Test Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# First, create a test user
echo "1. Creating test user..."
SIGNUP_RESPONSE=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-password-reset@example.com",
    "password": "TestPassword123!",
    "name": "Password Test User"
  }')

echo "$SIGNUP_RESPONSE" | jq '.'
echo ""

# Extract access token for later use
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.accessToken')

# Test 1: Forgot Password (Valid Email)
echo "========================================"
echo "2. Testing POST /auth/forgot-password (Valid Email)"
echo "========================================"
FORGOT_RESPONSE=$(curl -s -X POST "$API_BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-password-reset@example.com"
  }')

echo "$FORGOT_RESPONSE" | jq '.'
if echo "$FORGOT_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✓ Forgot password request successful${NC}"
else
  echo -e "${RED}✗ Forgot password request failed${NC}"
fi
echo ""

# Test 2: Forgot Password (Invalid Email - should still return success)
echo "========================================"
echo "3. Testing POST /auth/forgot-password (Non-existent Email)"
echo "========================================"
FORGOT_INVALID_RESPONSE=$(curl -s -X POST "$API_BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com"
  }')

echo "$FORGOT_INVALID_RESPONSE" | jq '.'
if echo "$FORGOT_INVALID_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✓ Forgot password (non-existent email) returns success (security best practice)${NC}"
else
  echo -e "${RED}✗ Forgot password (non-existent email) failed${NC}"
fi
echo ""

# Test 3: Forgot Password (Invalid Email Format)
echo "========================================"
echo "4. Testing POST /auth/forgot-password (Invalid Email Format)"
echo "========================================"
FORGOT_INVALID_FORMAT=$(curl -s -X POST "$API_BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email"
  }')

echo "$FORGOT_INVALID_FORMAT" | jq '.'
if echo "$FORGOT_INVALID_FORMAT" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✓ Invalid email format rejected${NC}"
else
  echo -e "${RED}✗ Invalid email format not rejected${NC}"
fi
echo ""

# Test 4: Reset Password (Invalid Token)
echo "========================================"
echo "5. Testing POST /auth/reset-password (Invalid Token)"
echo "========================================"
RESET_INVALID_TOKEN=$(curl -s -X POST "$API_BASE/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invalid-token-12345",
    "newPassword": "NewPassword123!"
  }')

echo "$RESET_INVALID_TOKEN" | jq '.'
if echo "$RESET_INVALID_TOKEN" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✓ Invalid token rejected${NC}"
else
  echo -e "${RED}✗ Invalid token not rejected${NC}"
fi
echo ""

# Test 5: Reset Password (Weak Password)
echo "========================================"
echo "6. Testing POST /auth/reset-password (Weak Password)"
echo "========================================"
RESET_WEAK_PASSWORD=$(curl -s -X POST "$API_BASE/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "some-token",
    "newPassword": "weak"
  }')

echo "$RESET_WEAK_PASSWORD" | jq '.'
if echo "$RESET_WEAK_PASSWORD" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✓ Weak password rejected${NC}"
else
  echo -e "${RED}✗ Weak password not rejected${NC}"
fi
echo ""

# Test 6: Change Password (Without Authentication)
echo "========================================"
echo "7. Testing PATCH /auth/change-password (No Auth)"
echo "========================================"
CHANGE_NO_AUTH=$(curl -s -X PATCH "$API_BASE/auth/change-password" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "TestPassword123!",
    "newPassword": "NewPassword123!"
  }')

echo "$CHANGE_NO_AUTH" | jq '.'
if echo "$CHANGE_NO_AUTH" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✓ Unauthorized request rejected${NC}"
else
  echo -e "${RED}✗ Unauthorized request not rejected${NC}"
fi
echo ""

# Test 7: Change Password (With Authentication, Wrong Current Password)
echo "========================================"
echo "8. Testing PATCH /auth/change-password (Wrong Current Password)"
echo "========================================"
CHANGE_WRONG_PASSWORD=$(curl -s -X PATCH "$API_BASE/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "currentPassword": "WrongPassword123!",
    "newPassword": "NewPassword123!"
  }')

echo "$CHANGE_WRONG_PASSWORD" | jq '.'
if echo "$CHANGE_WRONG_PASSWORD" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✓ Wrong current password rejected${NC}"
else
  echo -e "${RED}✗ Wrong current password not rejected${NC}"
fi
echo ""

# Test 8: Change Password (With Authentication, Valid)
echo "========================================"
echo "9. Testing PATCH /auth/change-password (Valid)"
echo "========================================"
CHANGE_VALID=$(curl -s -X PATCH "$API_BASE/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "currentPassword": "TestPassword123!",
    "newPassword": "NewPassword456!"
  }')

echo "$CHANGE_VALID" | jq '.'
if echo "$CHANGE_VALID" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✓ Password changed successfully${NC}"
else
  echo -e "${RED}✗ Password change failed${NC}"
fi
echo ""

# Test 9: Verify new password works
echo "========================================"
echo "10. Testing login with new password"
echo "========================================"
LOGIN_NEW=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-password-reset@example.com",
    "password": "NewPassword456!"
  }')

echo "$LOGIN_NEW" | jq '.'
if echo "$LOGIN_NEW" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✓ Login with new password successful${NC}"
else
  echo -e "${RED}✗ Login with new password failed${NC}"
fi
echo ""

echo "========================================"
echo "Testing Complete!"
echo "========================================"
echo ""
echo -e "${YELLOW}Note: Check the API logs for the password reset link (development mode)${NC}"
echo -e "${YELLOW}The reset link can be used to test the complete flow manually.${NC}"
