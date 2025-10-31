#!/bin/bash

#
# Performance Test Runner for GTSD iOS App
# Runs automated performance tests and generates report
#
# Usage:
#   ./run-performance-tests.sh [options]
#
# Options:
#   -d, --device <name>    Simulator device name (default: iPhone 15 Pro)
#   -c, --config <config>  Build configuration (default: Release)
#   -o, --output <path>    Output directory for results (default: ./TestResults)
#   -v, --verbose          Verbose output
#   -h, --help             Show this help message
#

set -e

# Default configuration
DEVICE="iPhone 15 Pro"
CONFIG="Release"
OUTPUT_DIR="./TestResults"
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--device)
            DEVICE="$2"
            shift 2
            ;;
        -c|--config)
            CONFIG="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            head -n 16 "$0" | tail -n 13
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Print header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   GTSD Performance Test Runner        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Print configuration
echo -e "${YELLOW}Configuration:${NC}"
echo "  Device:        $DEVICE"
echo "  Config:        $CONFIG"
echo "  Output:        $OUTPUT_DIR"
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Error: xcodebuild not found. Please install Xcode.${NC}"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_BUNDLE="$OUTPUT_DIR/PerformanceTests_${TIMESTAMP}.xcresult"

echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"

# Check if simulator is available
if ! xcrun simctl list devices | grep -q "$DEVICE"; then
    echo -e "${RED}❌ Error: Simulator '$DEVICE' not found.${NC}"
    echo ""
    echo "Available simulators:"
    xcrun simctl list devices | grep "iPhone"
    exit 1
fi

echo -e "${GREEN}✅ Simulator found${NC}"

# Boot simulator if not running
echo -e "${BLUE}📱 Step 2: Starting simulator...${NC}"
DEVICE_UDID=$(xcrun simctl list devices | grep "$DEVICE" | grep -v "unavailable" | head -1 | grep -oE '\([A-F0-9-]+\)' | tr -d '()')

if [ -z "$DEVICE_UDID" ]; then
    echo -e "${RED}❌ Error: Could not get simulator UDID${NC}"
    exit 1
fi

xcrun simctl boot "$DEVICE_UDID" 2>/dev/null || true
echo -e "${GREEN}✅ Simulator ready${NC}"

# Clean build folder
echo -e "${BLUE}🧹 Step 3: Cleaning build folder...${NC}"
xcodebuild clean \
    -scheme GTSD \
    -configuration "$CONFIG" \
    -destination "platform=iOS Simulator,name=$DEVICE" \
    > /dev/null 2>&1

echo -e "${GREEN}✅ Clean complete${NC}"

# Build for testing
echo -e "${BLUE}🔨 Step 4: Building app...${NC}"
if [ "$VERBOSE" = true ]; then
    xcodebuild build-for-testing \
        -scheme GTSD \
        -configuration "$CONFIG" \
        -destination "platform=iOS Simulator,name=$DEVICE"
else
    xcodebuild build-for-testing \
        -scheme GTSD \
        -configuration "$CONFIG" \
        -destination "platform=iOS Simulator,name=$DEVICE" \
        > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Run performance tests
echo -e "${BLUE}⏱️  Step 5: Running performance tests...${NC}"
echo ""

if [ "$VERBOSE" = true ]; then
    xcodebuild test \
        -scheme GTSD \
        -configuration "$CONFIG" \
        -destination "platform=iOS Simulator,name=$DEVICE" \
        -only-testing:GTSDTests/PerformanceTests \
        -resultBundlePath "$RESULT_BUNDLE"
else
    xcodebuild test \
        -scheme GTSD \
        -configuration "$CONFIG" \
        -destination "platform=iOS Simulator,name=$DEVICE" \
        -only-testing:GTSDTests/PerformanceTests \
        -resultBundlePath "$RESULT_BUNDLE" \
        2>&1 | grep -E "(Test Suite|Test Case|passed|failed|⏱️|💾|⚠️)"
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed or had warnings${NC}"
fi

# Generate JSON report
echo -e "${BLUE}📊 Step 6: Generating reports...${NC}"

JSON_REPORT="$OUTPUT_DIR/performance_results_${TIMESTAMP}.json"
xcrun xcresulttool get --format json --path "$RESULT_BUNDLE" > "$JSON_REPORT" 2>/dev/null || true

if [ -f "$JSON_REPORT" ]; then
    echo -e "${GREEN}✅ JSON report: $JSON_REPORT${NC}"
fi

# Extract key metrics
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Performance Summary           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Parse test results (this is a simplified version)
TOTAL_TESTS=$(xcrun xcresulttool get --path "$RESULT_BUNDLE" 2>/dev/null | grep -c "Test Case" || echo "N/A")
PASSED_TESTS=$(xcrun xcresulttool get --path "$RESULT_BUNDLE" 2>/dev/null | grep -c "passed" || echo "N/A")

echo "📈 Test Statistics:"
echo "  Total Tests:   $TOTAL_TESTS"
echo "  Passed:        $PASSED_TESTS"
echo ""

# Memory usage
CURRENT_MEMORY=$(ps aux | grep Simulator | grep -v grep | awk '{sum+=$6} END {print sum/1024}' || echo "N/A")
echo "💾 Memory Usage:"
echo "  Simulator:     ${CURRENT_MEMORY} MB"
echo ""

# Results location
echo "📁 Results Location:"
echo "  Bundle:        $RESULT_BUNDLE"
echo "  JSON:          $JSON_REPORT"
echo ""

# Open results in Xcode
echo -e "${BLUE}Opening results in Xcode...${NC}"
open "$RESULT_BUNDLE" 2>/dev/null || true

# Print next steps
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Review results in Xcode (already opened)"
echo "2. Check for SLA violations in console output"
echo "3. Run manual Instruments tests (see PERFORMANCE_TESTING_GUIDE.md)"
echo "4. Update baselines if performance improved"
echo "5. Document results using template in guide"
echo ""

# Exit with test status
exit $TEST_EXIT_CODE
