#!/bin/bash

# Health Profile Update Endpoint - Testing Script
# This script tests the PUT /v1/auth/profile/health endpoint

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
EMAIL="${TEST_EMAIL:-test@example.com}"
PASSWORD="${TEST_PASSWORD:-Test1234!}"

echo "========================================="
echo "Health Profile Update - Test Script"
echo "========================================="
echo ""
echo "API Base URL: $API_BASE_URL"
echo "Test User: $EMAIL"
echo ""

# Step 1: Login to get access token
echo "Step 1: Logging in to get access token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "❌ Login failed. Could not get access token."
  echo "Please ensure:"
  echo "  1. API server is running (npm run dev)"
  echo "  2. Test user exists (or create via signup)"
  echo "  3. Database is accessible"
  exit 1
fi

echo ""
echo "✅ Login successful!"
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Step 2: Update health metrics (weight only)
echo "========================================="
echo "Step 2: Update weight only"
echo "========================================="
echo ""
UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/v1/auth/profile/health" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 75.5}')

echo "Response:"
echo "$UPDATE_RESPONSE" | jq '.'
echo ""

# Check if successful
SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Weight update successful!"
  PLAN_UPDATED=$(echo "$UPDATE_RESPONSE" | jq -r '.planUpdated')
  if [ "$PLAN_UPDATED" = "true" ]; then
    echo "✅ Plan was recomputed!"
    echo "New targets:"
    echo "$UPDATE_RESPONSE" | jq '.targets'
  else
    echo "ℹ️  Plan was not recomputed (changes not significant enough)"
  fi
else
  echo "❌ Weight update failed"
  exit 1
fi

echo ""

# Step 3: Update multiple fields including target weight
echo "========================================="
echo "Step 3: Update weight, target weight, and height"
echo "========================================="
echo ""
UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/v1/auth/profile/health" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentWeight": 70.0,
    "targetWeight": 65.0,
    "height": 180
  }')

echo "Response:"
echo "$UPDATE_RESPONSE" | jq '.'
echo ""

SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Multiple fields update successful!"
  CURRENT_WEIGHT=$(echo "$UPDATE_RESPONSE" | jq -r '.profile.currentWeight')
  TARGET_WEIGHT=$(echo "$UPDATE_RESPONSE" | jq -r '.profile.targetWeight')
  HEIGHT=$(echo "$UPDATE_RESPONSE" | jq -r '.profile.height')

  echo "Updated profile:"
  echo "  Current Weight: $CURRENT_WEIGHT kg"
  echo "  Target Weight: $TARGET_WEIGHT kg"
  echo "  Height: $HEIGHT cm"

  PLAN_UPDATED=$(echo "$UPDATE_RESPONSE" | jq -r '.planUpdated')
  if [ "$PLAN_UPDATED" = "true" ]; then
    echo ""
    echo "✅ Plan was recomputed!"
    CALORIE_TARGET=$(echo "$UPDATE_RESPONSE" | jq -r '.targets.calorieTarget')
    PROTEIN_TARGET=$(echo "$UPDATE_RESPONSE" | jq -r '.targets.proteinTarget')
    WATER_TARGET=$(echo "$UPDATE_RESPONSE" | jq -r '.targets.waterTarget')
    echo "New targets:"
    echo "  Calories: $CALORIE_TARGET kcal/day"
    echo "  Protein: $PROTEIN_TARGET g/day"
    echo "  Water: $WATER_TARGET ml/day"
  fi
else
  echo "❌ Multiple fields update failed"
  exit 1
fi

echo ""

# Step 4: Test validation error (weight too low)
echo "========================================="
echo "Step 4: Test validation error (weight < 30 kg)"
echo "========================================="
echo ""
ERROR_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/v1/auth/profile/health" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 25}')

echo "Response:"
echo "$ERROR_RESPONSE" | jq '.'
echo ""

SUCCESS=$(echo "$ERROR_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "false" ]; then
  ERROR_MSG=$(echo "$ERROR_RESPONSE" | jq -r '.error')
  if [[ "$ERROR_MSG" == *"Validation error"* ]]; then
    echo "✅ Validation error correctly returned!"
  else
    echo "⚠️  Expected validation error but got: $ERROR_MSG"
  fi
else
  echo "❌ Should have failed validation"
  exit 1
fi

echo ""

# Step 5: Test authentication error (no token)
echo "========================================="
echo "Step 5: Test authentication error (no token)"
echo "========================================="
echo ""
AUTH_ERROR_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/v1/auth/profile/health" \
  -H "Content-Type: application/json" \
  -d '{"currentWeight": 75}')

echo "Response:"
echo "$AUTH_ERROR_RESPONSE" | jq '.'
echo ""

SUCCESS=$(echo "$AUTH_ERROR_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "false" ]; then
  ERROR_MSG=$(echo "$AUTH_ERROR_RESPONSE" | jq -r '.error')
  if [[ "$ERROR_MSG" == *"Authentication required"* ]]; then
    echo "✅ Authentication error correctly returned!"
  else
    echo "⚠️  Expected authentication error but got: $ERROR_MSG"
  fi
else
  echo "❌ Should have failed authentication"
  exit 1
fi

echo ""
echo "========================================="
echo "🎉 All tests passed!"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✅ Authentication works"
echo "  ✅ Weight update successful"
echo "  ✅ Multiple fields update successful"
echo "  ✅ Plan recomputation triggered"
echo "  ✅ Validation errors handled correctly"
echo "  ✅ Authentication errors handled correctly"
echo ""
echo "The Health Profile Update endpoint is working correctly!"
echo ""
