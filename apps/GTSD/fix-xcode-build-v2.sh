#!/bin/bash
# Fix Xcode Info.plist Build Error (Version 2)
# This script removes Info.plist from the Copy Bundle Resources phase
#
# Error: Multiple commands produce '.../GTSD.app/Info.plist'
# Cause: Info.plist is being copied AND auto-generated
# Fix: Remove the copy command, keep auto-generation

set -e

PROJECT_FILE="/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD.xcodeproj/project.pbxproj"

echo "Fixing Xcode build configuration (v2)..."

# Create backup
cp "$PROJECT_FILE" "$PROJECT_FILE.backup2"
echo "Created backup: $PROJECT_FILE.backup2"

# The Info.plist appears in the project.pbxproj as a PBXBuildFile entry
# We need to find and remove it from the resources build phase

# First, find the file reference ID for Info.plist
INFO_PLIST_REF=$(grep -E "Info\.plist.*PBXFileReference" "$PROJECT_FILE" | grep -oE "[A-F0-9]{24}" | head -1)

if [ -z "$INFO_PLIST_REF" ]; then
    echo "Could not find Info.plist file reference"
    echo "Manual fix required: Open Xcode and remove Info.plist from Copy Bundle Resources"
    exit 1
fi

echo "Found Info.plist reference: $INFO_PLIST_REF"

# Find the PBXBuildFile entry that references this
BUILD_FILE_REF=$(grep -E "$INFO_PLIST_REF.*PBXBuildFile" "$PROJECT_FILE" | grep -oE "^[[:space:]]*[A-F0-9]{24}" | tr -d ' ' | head -1)

if [ -z "$BUILD_FILE_REF" ]; then
    echo "Info.plist is not in Copy Bundle Resources - build should work"
    exit 0
fi

echo "Found build file entry: $BUILD_FILE_REF"

# Remove the entire PBXBuildFile section for Info.plist
sed -i '' "/$BUILD_FILE_REF \/\* Info.plist.*PBXBuildFile \*\/ = {/,/};/d" "$PROJECT_FILE"

# Remove the reference from the files array in PBXResourcesBuildPhase
sed -i '' "/$BUILD_FILE_REF \/\* Info.plist/d" "$PROJECT_FILE"

echo "Removed Info.plist from Copy Bundle Resources phase"

# Verify the changes
if ! grep -q "$BUILD_FILE_REF" "$PROJECT_FILE"; then
    echo "✓ Successfully removed Info.plist copy command"
    echo "✓ The project now uses auto-generated Info.plist only"
else
    echo "✗ Warning: Some references may still exist"
    exit 1
fi

echo ""
echo "Build fix complete! Next steps:"
echo "1. Build project: xcodebuild build -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 17 Pro'"
echo "2. Run tests: xcodebuild test -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 17 Pro'"
echo ""
