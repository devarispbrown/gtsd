#!/bin/bash
# Script to add GTSDTests target to Xcode project
# This is a workaround since the test target was removed

set -e

echo "Adding GTSDTests target to Xcode project..."
echo ""
echo "⚠️  This requires manual steps in Xcode:"
echo ""
echo "1. Open GTSD.xcodeproj in Xcode"
echo "2. Select the project in the navigator (top item)"
echo "3. Click the '+' button at the bottom of the targets list"
echo "4. Choose 'Unit Testing Bundle'"
echo "5. Name it 'GTSDTests'"
echo "6. Set 'Target to be Tested' to 'GTSD'"
echo "7. Click 'Finish'"
echo ""
echo "8. Select GTSDTests target"
echo "9. Go to 'Build Phases' tab"
echo "10. Expand 'Compile Sources'"
echo "11. Click '+' and add all .swift files from GTSDTests folder:"
echo "    - GTSDTests/GTSDTests.swift"
echo "    - GTSDTests/Mocks/TestMocks.swift"
echo "    - GTSDTests/Services/PlanServiceTests.swift"
echo "    - GTSDTests/Stores/PlanStoreTests.swift"
echo "    - GTSDTests/ViewModels/*.swift (all 3 files)"
echo "    - GTSDTests/Views/ProfileZeroStateCardTests.swift"
echo "    - GTSDTests/Integration/*.swift (both files)"
echo "    - GTSDTests/Performance/PerformanceTests.swift"
echo ""
echo "12. Go to Product > Scheme > Edit Scheme"
echo "13. Select 'Test' action"
echo "14. Ensure GTSDTests is checked"
echo ""
echo "Then run: xcodebuild test -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 17 Pro'"
echo ""

# Alternative: Try to do it programmatically (requires ruby-xcode or xcodeproj gem)
if command -v gem &> /dev/null; then
    echo "Checking for xcodeproj gem..."
    if gem list xcodeproj -i &> /dev/null; then
        echo "✓ xcodeproj gem found, attempting automated setup..."
        ruby << 'RUBY'
require 'xcodeproj'

project_path = 'GTSD.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find or create test target
test_target = project.targets.find { |t| t.name == 'GTSDTests' }

if test_target.nil?
  puts "Creating GTSDTests target..."

  # Create test target
  test_target = project.new_target(:unit_test_bundle, 'GTSDTests', :ios, '18.0')

  # Set test host to main app
  app_target = project.targets.find { |t| t.name == 'GTSD' }
  test_target.add_dependency(app_target) if app_target

  # Add test files
  test_group = project.new_group('GTSDTests', 'GTSDTests')

  Dir.glob('GTSDTests/**/*.swift').each do |file_path|
    file_ref = test_group.new_file(file_path)
    test_target.add_file_references([file_ref])
  end

  project.save
  puts "✓ GTSDTests target created successfully!"
  puts "Now run: xcodebuild test -scheme GTSD -destination 'platform=iOS Simulator,name=iPhone 17 Pro'"
else
  puts "✓ GTSDTests target already exists"
end
RUBY
    else
        echo "⚠️  xcodeproj gem not installed"
        echo "To install: sudo gem install xcodeproj"
        echo ""
        echo "Or follow the manual steps above"
    fi
else
    echo "⚠️  Ruby/gem not available for automated setup"
    echo "Please follow the manual steps above"
fi
