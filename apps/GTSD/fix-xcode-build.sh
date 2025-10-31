#!/bin/bash
# Fix Xcode Info.plist Build Error
# This script removes the duplicate INFOPLIST_FILE setting that conflicts with GENERATE_INFOPLIST_FILE
#
# Error: Multiple commands produce '.../GTSD.app/Info.plist'
# Cause: Both GENERATE_INFOPLIST_FILE=YES and INFOPLIST_FILE=GTSD/Info.plist are set
# Fix: Remove INFOPLIST_FILE since we're using auto-generation

set -e

PROJECT_FILE="/Users/devarisbrown/Code/projects/gtsd/apps/GTSD/GTSD.xcodeproj/project.pbxproj"

echo "Fixing Xcode build configuration..."

# Create backup
cp "$PROJECT_FILE" "$PROJECT_FILE.backup"
echo "Created backup: $PROJECT_FILE.backup"

# Remove INFOPLIST_FILE lines (lines 256 and 291)
# We're using sed to delete lines containing INFOPLIST_FILE = GTSD/Info.plist
sed -i '' '/INFOPLIST_FILE = GTSD\/Info.plist;/d' "$PROJECT_FILE"

echo "Removed INFOPLIST_FILE references from project.pbxproj"

# Verify the changes
if ! grep -q "INFOPLIST_FILE = GTSD/Info.plist" "$PROJECT_FILE"; then
    echo "✓ Successfully removed duplicate Info.plist configuration"
    echo "✓ The project now uses GENERATE_INFOPLIST_FILE only"
else
    echo "✗ Warning: Some INFOPLIST_FILE references may still exist"
    exit 1
fi

echo ""
echo "Build fix complete! Next steps:"
echo "1. Open Xcode: xed /Users/devarisbrown/Code/projects/gtsd/apps/GTSD"
echo "2. Clean build folder: Product > Clean Build Folder (Cmd+Shift+K)"
echo "3. Build project: Product > Build (Cmd+B)"
echo "4. Run tests: Product > Test (Cmd+U)"
echo ""
echo "The Info.plist file at GTSD/Info.plist can be deleted if it only contains"
echo "keys that are now defined in the build settings (check lines 257-264, 292-299)"
