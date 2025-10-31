#!/bin/bash

# GTSD iOS App - Complete Clean and Rebuild Script
# This script performs a complete clean of all build artifacts and caches
# Use this when fixes aren't working despite being in the code

set -e  # Exit on error

echo "========================================="
echo "GTSD iOS - Complete Clean & Rebuild"
echo "========================================="
echo ""

# Step 1: Kill any running Xcode or Simulator processes
echo "📱 Step 1: Stopping Xcode and Simulator..."
killall Xcode 2>/dev/null || true
killall Simulator 2>/dev/null || true
sleep 2

# Step 2: Clean DerivedData
echo "🗑️  Step 2: Cleaning DerivedData..."
DERIVED_DATA_PATH=~/Library/Developer/Xcode/DerivedData
if [ -d "$DERIVED_DATA_PATH" ]; then
    echo "   Found DerivedData at: $DERIVED_DATA_PATH"
    # List GTSD-related folders before deletion
    ls -la "$DERIVED_DATA_PATH" | grep -i gtsd || true
    # Remove GTSD-specific derived data
    rm -rf "$DERIVED_DATA_PATH"/GTSD-*
    echo "   ✅ DerivedData cleaned"
else
    echo "   No DerivedData found"
fi

# Step 3: Clean Xcode Caches
echo "🧹 Step 3: Cleaning Xcode caches..."
rm -rf ~/Library/Caches/com.apple.dt.Xcode 2>/dev/null || true
echo "   ✅ Xcode caches cleaned"

# Step 4: Clean Simulator
echo "📲 Step 4: Cleaning iOS Simulator..."
# Shutdown all simulators
xcrun simctl shutdown all 2>/dev/null || true
# Erase all simulator data
echo "   Erasing all simulator data..."
xcrun simctl erase all 2>/dev/null || true
echo "   ✅ Simulators cleaned"

# Step 5: Clean Module Cache
echo "📦 Step 5: Cleaning Swift module cache..."
rm -rf ~/Library/Caches/org.swift.swiftpm 2>/dev/null || true
rm -rf ~/Library/Caches/com.apple.dt.Xcode/ModuleCache 2>/dev/null || true
echo "   ✅ Module caches cleaned"

# Step 6: Clean Build folder in project
echo "🏗️  Step 6: Cleaning project build folder..."
PROJECT_DIR="/Users/devarisbrown/Code/projects/gtsd/apps/GTSD"
if [ -d "$PROJECT_DIR/build" ]; then
    rm -rf "$PROJECT_DIR/build"
    echo "   ✅ Project build folder cleaned"
else
    echo "   No build folder found in project"
fi

# Step 7: Reset Package Resolution
echo "📚 Step 7: Resetting Swift Package resolution..."
if [ -d "$PROJECT_DIR/.swiftpm" ]; then
    rm -rf "$PROJECT_DIR/.swiftpm"
    echo "   ✅ Swift Package cache cleaned"
fi

# Step 8: Show current git status
echo ""
echo "📊 Step 8: Current Git Status..."
echo "========================================="
cd "$PROJECT_DIR"
git status --short | head -20
echo "========================================="
echo ""

# Step 9: Build the project
echo "🔨 Step 9: Building project..."
echo "   Opening Xcode for clean build..."
echo ""
echo "⚠️  IMPORTANT: When Xcode opens:"
echo "   1. Wait for indexing to complete"
echo "   2. Press Shift+Cmd+K (Clean Build Folder)"
echo "   3. Press Cmd+B (Build)"
echo "   4. Run on a PHYSICAL DEVICE if possible"
echo ""
echo "🎯 Testing Checklist:"
echo "   □ Open Console.app and filter for 'GTSD'"
echo "   □ Watch for DEBUG log statements"
echo "   □ Test metrics acknowledgment"
echo "   □ Test dietary preferences save"
echo "   □ Test photo selection"
echo ""

# Step 10: Open Xcode
echo "Press Enter to open Xcode..."
read -r
open "$PROJECT_DIR/GTSD.xcodeproj"

echo ""
echo "✅ Clean complete! Xcode is opening..."
echo ""
echo "🔍 Debug Tips:"
echo "   - If issues persist, try deleting app from device/simulator first"
echo "   - Check Console.app for detailed logs"
echo "   - Use Charles Proxy to inspect network requests"
echo "   - Test on physical device to rule out simulator issues"
echo ""
echo "========================================="
echo "Clean and rebuild script completed!"
echo "========================================="