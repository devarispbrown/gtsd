#!/bin/bash
# Accessibility Verification Script
# Runs automated checks to verify accessibility compliance

set -e

PROJECT_DIR="/Users/devarisbrown/Code/projects/gtsd/apps/GTSD"
cd "$PROJECT_DIR"

echo "========================================="
echo "GTSD iOS - Accessibility Verification"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

function check_passed() {
    echo -e "${GREEN}✓ PASS${NC} - $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

function check_failed() {
    echo -e "${RED}✗ FAIL${NC} - $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

function check_warning() {
    echo -e "${YELLOW}⚠ WARN${NC} - $1"
    ((TOTAL_CHECKS++))
}

echo "1. Checking Project Configuration..."
echo "-----------------------------------"

# Check if project file exists
if [ -f "GTSD.xcodeproj/project.pbxproj" ]; then
    check_passed "Project file exists"
else
    check_failed "Project file not found"
    exit 1
fi

# Check for duplicate INFOPLIST_FILE (should be removed)
if grep -q "INFOPLIST_FILE = GTSD/Info.plist" "GTSD.xcodeproj/project.pbxproj"; then
    check_failed "Duplicate INFOPLIST_FILE found (should be removed)"
else
    check_passed "No duplicate INFOPLIST_FILE (build fix applied)"
fi

# Check GENERATE_INFOPLIST_FILE is set
if grep -q "GENERATE_INFOPLIST_FILE = YES" "GTSD.xcodeproj/project.pbxproj"; then
    check_passed "GENERATE_INFOPLIST_FILE = YES (modern Xcode)"
else
    check_warning "GENERATE_INFOPLIST_FILE not found"
fi

echo ""
echo "2. Checking Accessibility Infrastructure..."
echo "------------------------------------------"

# Check if AccessibilityHelpers exists
if [ -f "GTSD/Core/Utilities/AccessibilityHelpers.swift" ]; then
    check_passed "AccessibilityHelpers.swift exists"

    # Check for key accessibility utilities
    if grep -q "minimumTouchTarget" "GTSD/Core/Utilities/AccessibilityHelpers.swift"; then
        check_passed "minimumTouchTarget() modifier defined"
    else
        check_failed "minimumTouchTarget() modifier missing"
    fi

    if grep -q "accessibleButton" "GTSD/Core/Utilities/AccessibilityHelpers.swift"; then
        check_passed "accessibleButton() modifier defined"
    else
        check_failed "accessibleButton() modifier missing"
    fi

    if grep -q "VoiceOverAnnouncement" "GTSD/Core/Utilities/AccessibilityHelpers.swift"; then
        check_passed "VoiceOver announcements implemented"
    else
        check_failed "VoiceOver announcements missing"
    fi
else
    check_failed "AccessibilityHelpers.swift not found"
fi

echo ""
echo "3. Checking View Accessibility Implementation..."
echo "-----------------------------------------------"

# Check PlanSummaryView
if [ -f "GTSD/Features/Plans/PlanSummaryView.swift" ]; then
    check_passed "PlanSummaryView.swift exists"

    if grep -q "accessibilityLabel" "GTSD/Features/Plans/PlanSummaryView.swift"; then
        check_passed "PlanSummaryView has accessibility labels"
    else
        check_failed "PlanSummaryView missing accessibility labels"
    fi

    if grep -q "accessibilityHint" "GTSD/Features/Plans/PlanSummaryView.swift"; then
        check_passed "PlanSummaryView has accessibility hints"
    else
        check_failed "PlanSummaryView missing accessibility hints"
    fi

    if grep -q "minimumTouchTarget" "GTSD/Features/Plans/PlanSummaryView.swift"; then
        check_passed "PlanSummaryView has touch target compliance"
    else
        check_failed "PlanSummaryView missing touch target compliance"
    fi
else
    check_failed "PlanSummaryView.swift not found"
fi

# Check ProfileEditView
if [ -f "GTSD/Features/Profile/ProfileEditView.swift" ]; then
    check_passed "ProfileEditView.swift exists"

    if grep -q "accessibilityLabel" "GTSD/Features/Profile/ProfileEditView.swift"; then
        check_passed "ProfileEditView has accessibility labels"
    else
        check_failed "ProfileEditView missing accessibility labels"
    fi
else
    check_failed "ProfileEditView.swift not found"
fi

# Check GTSDButton
if [ -f "GTSD/Core/Components/GTSDButton.swift" ]; then
    check_passed "GTSDButton.swift exists"

    if grep -q "minimumTouchTarget" "GTSD/Core/Components/GTSDButton.swift"; then
        check_passed "GTSDButton has automatic touch target compliance"
    else
        check_failed "GTSDButton missing touch target compliance"
    fi

    if grep -q "accessibilityLabel" "GTSD/Core/Components/GTSDButton.swift"; then
        check_passed "GTSDButton has automatic accessibility labels"
    else
        check_failed "GTSDButton missing accessibility labels"
    fi
else
    check_failed "GTSDButton.swift not found"
fi

echo ""
echo "4. Checking Deep Link Navigation..."
echo "----------------------------------"

# Check TabBarView
if [ -f "GTSD/Core/Navigation/TabBarView.swift" ]; then
    check_passed "TabBarView.swift exists"

    if grep -q "navigateToPlan" "GTSD/Core/Navigation/TabBarView.swift"; then
        check_passed "TabBarView has navigateToPlan receiver"
    else
        check_failed "TabBarView missing navigateToPlan receiver"
    fi

    if grep -q "navigateToDestination" "GTSD/Core/Navigation/TabBarView.swift"; then
        check_passed "TabBarView has navigateToDestination receiver"
    else
        check_failed "TabBarView missing navigateToDestination receiver"
    fi
else
    check_failed "TabBarView.swift not found"
fi

# Check DeepLinkHandler
if [ -f "GTSD/Core/Navigation/DeepLinkHandler.swift" ]; then
    check_passed "DeepLinkHandler.swift exists"
else
    check_failed "DeepLinkHandler.swift not found"
fi

echo ""
echo "5. Checking Documentation..."
echo "---------------------------"

# Check testing guide
if [ -f "ACCESSIBILITY_TESTING_GUIDE.md" ]; then
    check_passed "Accessibility testing guide exists"
else
    check_failed "Accessibility testing guide missing"
fi

# Check compliance report
if [ -f "ACCESSIBILITY_COMPLIANCE_REPORT.md" ]; then
    check_passed "Accessibility compliance report exists"
else
    check_failed "Accessibility compliance report missing"
fi

# Check summary
if [ -f "CRITICAL_FIXES_SUMMARY.md" ]; then
    check_passed "Critical fixes summary exists"
else
    check_failed "Critical fixes summary missing"
fi

# Check build fix script
if [ -f "fix-xcode-build.sh" ]; then
    check_passed "Build fix script exists"
    if [ -x "fix-xcode-build.sh" ]; then
        check_passed "Build fix script is executable"
    else
        check_warning "Build fix script not executable (run: chmod +x fix-xcode-build.sh)"
    fi
else
    check_failed "Build fix script missing"
fi

echo ""
echo "6. Attempting Build Verification..."
echo "----------------------------------"

# Try to build (optional, can be slow)
if command -v xcodebuild &> /dev/null; then
    echo "Running xcodebuild to verify project builds..."

    # Just verify the project can be parsed
    if xcodebuild -list -project GTSD.xcodeproj &> /dev/null; then
        check_passed "Project structure is valid"
    else
        check_failed "Project structure has issues"
    fi
else
    check_warning "xcodebuild not available (skipping build verification)"
fi

echo ""
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo ""
echo "Total Checks:  $TOTAL_CHECKS"
echo -e "${GREEN}Passed:        $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:        $FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open project in Xcode: xed ."
    echo "2. Clean build folder: Product > Clean Build Folder"
    echo "3. Build project: Product > Build"
    echo "4. Run tests: Product > Test"
    echo "5. Run Accessibility Inspector audit"
    echo "6. Test with VoiceOver on simulator/device"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the issues above.${NC}"
    echo ""
    exit 1
fi
