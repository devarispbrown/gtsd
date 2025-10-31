# GTSD iOS App - Comprehensive CI/CD Pipeline Configuration

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Workflow](#github-actions-workflow)
3. [Fastlane Configuration](#fastlane-configuration)
4. [Build Configuration](#build-configuration)
5. [Testing Pipeline](#testing-pipeline)
6. [Deployment Pipeline](#deployment-pipeline)
7. [Monitoring & Reporting](#monitoring--reporting)
8. [Security & Secrets Management](#security--secrets-management)
9. [Developer Workflow](#developer-workflow)
10. [Setup Instructions](#setup-instructions)
11. [Best Practices & Recommendations](#best-practices--recommendations)

---

## Overview

### CI/CD Pipeline Architecture

```
Pull Request
    |
    ├── Lint & Format (SwiftLint)
    ├── Unit Tests (80%+ coverage)
    ├── Integration Tests
    ├── UI Tests
    ├── Static Analysis
    ├── Build for Testing
    └── Code Coverage Report
         |
         └── Status Check (Required)

Main Branch (after PR merge)
    |
    ├── All PR Checks
    ├── Build for Release
    ├── TestFlight Deployment
    ├── Notify Team (Slack)
    └── Update Release Notes
```

### Key Features

- Automated testing on every PR
- Parallel test execution
- Code coverage reporting (Codecov)
- SwiftLint static analysis
- TestFlight deployment on main branch
- Automatic versioning
- Slack notifications
- Build artifact caching
- Matrix testing (iOS 17.0+)

---

## GitHub Actions Workflow

### 1. Main iOS CI/CD Workflow

Create `.github/workflows/ios-ci.yml`:

```yaml
name: iOS CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  XCODE_VERSION: '15.2'
  IOS_DEPLOYMENT_TARGET: '17.0'
  FASTLANE_SKIP_UPDATE_CHECK: true
  FASTLANE_HIDE_TIMESTAMP: true

jobs:
  # Job 1: Lint and Format Check
  swiftlint:
    name: SwiftLint
    runs-on: macos-14
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install SwiftLint
        run: |
          brew install swiftlint

      - name: Run SwiftLint
        run: |
          cd apps/ios/GTSD
          swiftlint lint --reporter github-actions-logging --strict

      - name: SwiftLint Autocorrect Check
        run: |
          cd apps/ios/GTSD
          swiftlint --fix --format
          git diff --exit-code || (echo "SwiftLint found fixable issues. Run 'swiftlint --fix' locally." && exit 1)

  # Job 2: Unit Tests
  unit-tests:
    name: Unit Tests
    runs-on: macos-14
    strategy:
      matrix:
        scheme: [GTSD]
        destination:
          - 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2'
          - 'platform=iOS Simulator,name=iPhone SE (3rd generation),OS=17.2'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Show Xcode version
        run: xcodebuild -version

      - name: Cache SPM packages
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData
            .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Install dependencies
        run: |
          cd apps/ios/GTSD
          xcodebuild -resolvePackageDependencies

      - name: Run Unit Tests
        run: |
          cd apps/ios/GTSD
          xcodebuild test \
            -scheme ${{ matrix.scheme }} \
            -destination '${{ matrix.destination }}' \
            -testPlan UnitTests \
            -enableCodeCoverage YES \
            -resultBundlePath TestResults/UnitTests.xcresult \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO \
            ONLY_ACTIVE_ARCH=NO

      - name: Upload Unit Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results-${{ matrix.destination }}
          path: apps/ios/GTSD/TestResults/UnitTests.xcresult

  # Job 3: Integration Tests
  integration-tests:
    name: Integration Tests
    runs-on: macos-14
    needs: [swiftlint]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Cache SPM packages
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData
            .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Install dependencies
        run: |
          cd apps/ios/GTSD
          xcodebuild -resolvePackageDependencies

      - name: Run Integration Tests
        run: |
          cd apps/ios/GTSD
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
            -testPlan IntegrationTests \
            -enableCodeCoverage YES \
            -resultBundlePath TestResults/IntegrationTests.xcresult \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO

      - name: Upload Integration Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: apps/ios/GTSD/TestResults/IntegrationTests.xcresult

  # Job 4: UI Tests
  ui-tests:
    name: UI Tests
    runs-on: macos-14
    needs: [swiftlint]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Cache SPM packages
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData
            .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Install dependencies
        run: |
          cd apps/ios/GTSD
          xcodebuild -resolvePackageDependencies

      - name: Run UI Tests
        run: |
          cd apps/ios/GTSD
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
            -testPlan UITests \
            -enableCodeCoverage YES \
            -resultBundlePath TestResults/UITests.xcresult \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO

      - name: Upload UI Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ui-test-results
          path: apps/ios/GTSD/TestResults/UITests.xcresult

      - name: Upload UI Test Screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: ui-test-screenshots
          path: |
            ~/Library/Developer/Xcode/DerivedData/**/Logs/Test/Attachments

  # Job 5: Code Coverage
  code-coverage:
    name: Code Coverage
    runs-on: macos-14
    needs: [unit-tests, integration-tests, ui-tests]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download Unit Test Results
        uses: actions/download-artifact@v4
        with:
          pattern: unit-test-results-*
          path: TestResults/Unit
          merge-multiple: true

      - name: Download Integration Test Results
        uses: actions/download-artifact@v4
        with:
          name: integration-test-results
          path: TestResults/Integration

      - name: Download UI Test Results
        uses: actions/download-artifact@v4
        with:
          name: ui-test-results
          path: TestResults/UI

      - name: Install xcov
        run: |
          gem install xcov

      - name: Generate Coverage Report
        run: |
          xcov \
            --scheme GTSD \
            --minimum_coverage_percentage 80 \
            --output_directory coverage \
            --markdown_report \
            --json_report

      - name: Convert Coverage to Cobertura
        run: |
          brew install swiftcov
          swiftcov generate \
            --output coverage/cobertura.xml \
            --format cobertura \
            TestResults/**/*.xcresult

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: coverage/cobertura.xml
          flags: ios
          name: ios-coverage
          fail_ci_if_error: true

      - name: Comment PR with Coverage
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverage = fs.readFileSync('coverage/coverage.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Code Coverage Report\n\n${coverage}`
            });

  # Job 6: Build for Testing
  build-for-testing:
    name: Build for Testing
    runs-on: macos-14
    needs: [swiftlint]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Cache SPM packages
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData
            .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Build for Testing
        run: |
          cd apps/ios/GTSD
          xcodebuild build-for-testing \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
            -derivedDataPath DerivedData \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO

      - name: Check Build Size
        run: |
          cd apps/ios/GTSD
          du -sh DerivedData/Build/Products/Debug-iphonesimulator/GTSD.app
          SIZE=$(du -sk DerivedData/Build/Products/Debug-iphonesimulator/GTSD.app | cut -f1)
          echo "App size: ${SIZE}KB"
          if [ $SIZE -gt 51200 ]; then
            echo "Warning: App size exceeds 50MB target"
          fi

  # Job 7: Static Analysis
  static-analysis:
    name: Static Analysis
    runs-on: macos-14
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Run Static Analysis
        run: |
          cd apps/ios/GTSD
          xcodebuild analyze \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO

      - name: Check for Issues
        run: |
          if grep -r "warning:" apps/ios/GTSD/DerivedData; then
            echo "Static analysis found warnings"
            exit 1
          fi

  # Job 8: Performance Benchmarks
  performance-tests:
    name: Performance Benchmarks
    runs-on: macos-14
    needs: [swiftlint]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Run Performance Tests
        run: |
          cd apps/ios/GTSD
          xcodebuild test \
            -scheme GTSD \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.2' \
            -testPlan PerformanceTests \
            -resultBundlePath TestResults/PerformanceTests.xcresult \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO

      - name: Extract Performance Metrics
        run: |
          xcrun xcresulttool get \
            --path TestResults/PerformanceTests.xcresult \
            --format json > performance-results.json

      - name: Upload Performance Results
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: performance-results.json

  # Job 9: TestFlight Deployment (main branch only)
  deploy-testflight:
    name: Deploy to TestFlight
    runs-on: macos-14
    needs: [unit-tests, integration-tests, ui-tests, code-coverage, build-for-testing]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Needed for version bumping

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Install Fastlane
        run: |
          brew install fastlane

      - name: Cache SPM packages
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData
            .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: Install Apple Certificate
        env:
          CERTIFICATE_BASE64: ${{ secrets.APPLE_CERTIFICATE_BASE64 }}
          CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          # Create temporary keychain
          security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security set-keychain-settings -t 3600 -u build.keychain

          # Import certificate
          echo "$CERTIFICATE_BASE64" | base64 --decode > certificate.p12
          security import certificate.p12 \
            -k build.keychain \
            -P "$CERTIFICATE_PASSWORD" \
            -T /usr/bin/codesign
          security set-key-partition-list \
            -S apple-tool:,apple: \
            -s -k "$KEYCHAIN_PASSWORD" \
            build.keychain

          # Clean up
          rm certificate.p12

      - name: Install Provisioning Profile
        env:
          PROVISIONING_PROFILE_BASE64: ${{ secrets.PROVISIONING_PROFILE_BASE64 }}
        run: |
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "$PROVISIONING_PROFILE_BASE64" | base64 --decode > \
            ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision

      - name: Bump Version
        run: |
          cd apps/ios/GTSD
          fastlane run increment_build_number

      - name: Build & Upload to TestFlight
        env:
          FASTLANE_USER: ${{ secrets.APPLE_ID }}
          FASTLANE_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.APP_STORE_CONNECT_API_KEY_CONTENT }}
        run: |
          cd apps/ios/GTSD
          fastlane beta

      - name: Cleanup Keychain
        if: always()
        run: |
          security delete-keychain build.keychain || true

      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "iOS App deployed to TestFlight!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": ":rocket: *GTSD iOS App deployed to TestFlight*\n\n*Version:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }

  # Job 10: Create Release Notes
  release-notes:
    name: Generate Release Notes
    runs-on: macos-14
    needs: [deploy-testflight]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Changelog
        id: changelog
        run: |
          git log --pretty=format:"- %s (%an)" $(git describe --tags --abbrev=0)..HEAD > CHANGELOG.md

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ios-v${{ steps.changelog.outputs.version }}
          release_name: iOS Release ${{ steps.changelog.outputs.version }}
          body_path: CHANGELOG.md
          draft: false
          prerelease: false
```

---

## Fastlane Configuration

### 2. Fastfile

Create `apps/ios/GTSD/fastlane/Fastfile`:

```ruby
# Fastfile for GTSD iOS App

default_platform(:ios)

platform :ios do
  # Variables
  app_identifier = "com.gtsd.app"
  scheme = "GTSD"
  xcodeproj = "GTSD.xcodeproj"
  workspace = "GTSD.xcworkspace"

  # Before all lanes
  before_all do
    ENV["FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT"] = "120"
    ENV["FASTLANE_XCODEBUILD_SETTINGS_RETRIES"] = "5"
  end

  # After all lanes
  after_all do |lane|
    notification(
      subtitle: "Fastlane Finished",
      message: "Successfully completed '#{lane}' lane"
    )
  end

  # Error handling
  error do |lane, exception|
    notification(
      subtitle: "Fastlane Error",
      message: "Failed in '#{lane}' lane: #{exception.message}"
    )
  end

  #######################
  # Testing Lanes
  #######################

  desc "Run all unit tests"
  lane :test_unit do
    run_tests(
      workspace: workspace,
      scheme: scheme,
      testplan: "UnitTests",
      devices: ["iPhone 15 Pro", "iPhone SE (3rd generation)"],
      code_coverage: true,
      output_directory: "TestResults/Unit",
      result_bundle: true,
      clean: true
    )
  end

  desc "Run integration tests"
  lane :test_integration do
    run_tests(
      workspace: workspace,
      scheme: scheme,
      testplan: "IntegrationTests",
      devices: ["iPhone 15 Pro"],
      code_coverage: true,
      output_directory: "TestResults/Integration",
      result_bundle: true
    )
  end

  desc "Run UI tests"
  lane :test_ui do
    run_tests(
      workspace: workspace,
      scheme: scheme,
      testplan: "UITests",
      devices: ["iPhone 15 Pro"],
      code_coverage: true,
      output_directory: "TestResults/UI",
      result_bundle: true
    )
  end

  desc "Run all tests"
  lane :test_all do
    test_unit
    test_integration
    test_ui
  end

  desc "Run performance tests"
  lane :test_performance do
    run_tests(
      workspace: workspace,
      scheme: scheme,
      testplan: "PerformanceTests",
      devices: ["iPhone 15 Pro"],
      output_directory: "TestResults/Performance",
      result_bundle: true
    )
  end

  #######################
  # Code Quality Lanes
  #######################

  desc "Run SwiftLint"
  lane :lint do
    swiftlint(
      mode: :lint,
      executable: "Pods/SwiftLint/swiftlint",
      config_file: ".swiftlint.yml",
      strict: true,
      raise_if_swiftlint_error: true
    )
  end

  desc "Run SwiftLint and auto-fix"
  lane :lint_fix do
    swiftlint(
      mode: :fix,
      executable: "Pods/SwiftLint/swiftlint",
      config_file: ".swiftlint.yml"
    )
  end

  desc "Generate code coverage report"
  lane :coverage do
    xcov(
      workspace: workspace,
      scheme: scheme,
      minimum_coverage_percentage: 80.0,
      output_directory: "coverage",
      markdown_report: true,
      json_report: true
    )
  end

  #######################
  # Build Lanes
  #######################

  desc "Build for testing"
  lane :build_for_testing do
    build_app(
      workspace: workspace,
      scheme: scheme,
      configuration: "Debug",
      skip_archive: true,
      skip_package_ipa: true,
      build_path: "build",
      derived_data_path: "DerivedData",
      clean: true
    )
  end

  desc "Build for release"
  lane :build_release do
    increment_build_number(xcodeproj: xcodeproj)

    build_app(
      workspace: workspace,
      scheme: scheme,
      configuration: "Release",
      export_method: "app-store",
      output_directory: "build",
      clean: true
    )
  end

  #######################
  # Certificate & Profile Lanes
  #######################

  desc "Sync code signing (development)"
  lane :sync_signing_dev do
    match(
      type: "development",
      app_identifier: app_identifier,
      readonly: is_ci
    )
  end

  desc "Sync code signing (app store)"
  lane :sync_signing_appstore do
    match(
      type: "appstore",
      app_identifier: app_identifier,
      readonly: is_ci
    )
  end

  desc "Register new device"
  lane :register_device do |options|
    device_name = options[:name]
    device_udid = options[:udid]

    register_devices(
      devices: {
        device_name => device_udid
      }
    )

    match(type: "development", force_for_new_devices: true)
  end

  #######################
  # Deployment Lanes
  #######################

  desc "Deploy to TestFlight"
  lane :beta do
    # Ensure we're on the main branch
    ensure_git_branch(branch: 'main')

    # Pull latest changes
    git_pull

    # Sync code signing
    sync_signing_appstore

    # Increment build number
    increment_build_number(xcodeproj: xcodeproj)

    # Build the app
    build_app(
      workspace: workspace,
      scheme: scheme,
      configuration: "Release",
      export_method: "app-store",
      output_directory: "build",
      clean: true
    )

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      distribute_external: false,
      notify_external_testers: false,
      changelog: generate_changelog,
      beta_app_description: "Latest build from main branch",
      beta_app_feedback_email: "feedback@gtsd.com"
    )

    # Commit version bump
    commit_version_bump(
      message: "Bump build number to #{lane_context[SharedValues::BUILD_NUMBER]} [skip ci]",
      xcodeproj: xcodeproj,
      force: true
    )

    # Push to remote
    push_to_git_remote

    # Notify team
    slack(
      message: "Successfully deployed GTSD iOS to TestFlight!",
      success: true,
      payload: {
        "Build Number" => lane_context[SharedValues::BUILD_NUMBER],
        "Version" => get_version_number(xcodeproj: xcodeproj)
      },
      default_payloads: [:git_branch, :git_author]
    )
  end

  desc "Deploy to App Store"
  lane :release do
    # Ensure we're on the main branch
    ensure_git_branch(branch: 'main')

    # Sync code signing
    sync_signing_appstore

    # Increment version number
    increment_version_number(
      bump_type: "patch",
      xcodeproj: xcodeproj
    )

    # Increment build number
    increment_build_number(xcodeproj: xcodeproj)

    # Build the app
    build_app(
      workspace: workspace,
      scheme: scheme,
      configuration: "Release",
      export_method: "app-store",
      output_directory: "build",
      clean: true
    )

    # Upload to App Store
    upload_to_app_store(
      skip_metadata: false,
      skip_screenshots: false,
      submit_for_review: false,
      automatic_release: false,
      force: true
    )

    # Commit version bump
    commit_version_bump(
      message: "Release version #{get_version_number(xcodeproj: xcodeproj)} [skip ci]",
      xcodeproj: xcodeproj,
      force: true
    )

    # Create git tag
    add_git_tag(
      tag: "ios-v#{get_version_number(xcodeproj: xcodeproj)}",
      message: "iOS Release v#{get_version_number(xcodeproj: xcodeproj)}"
    )

    # Push to remote
    push_to_git_remote(tags: true)

    # Notify team
    slack(
      message: "Successfully deployed GTSD iOS v#{get_version_number(xcodeproj: xcodeproj)} to App Store!",
      success: true,
      default_payloads: [:git_branch, :git_author]
    )
  end

  #######################
  # Screenshot Lanes
  #######################

  desc "Generate screenshots for App Store"
  lane :screenshots do
    capture_screenshots(
      workspace: workspace,
      scheme: "GTSDUITests",
      devices: [
        "iPhone 15 Pro Max",
        "iPhone 15 Pro",
        "iPhone SE (3rd generation)",
        "iPad Pro (12.9-inch) (6th generation)"
      ],
      languages: ["en-US"],
      output_directory: "screenshots",
      clear_previous_screenshots: true,
      override_status_bar: true
    )
  end

  desc "Frame screenshots"
  lane :frame_screenshots do
    frameit(
      path: "screenshots",
      silver: true
    )
  end

  #######################
  # Utility Lanes
  #######################

  desc "Bump version number"
  lane :bump_version do |options|
    bump_type = options[:type] || "patch"

    increment_version_number(
      bump_type: bump_type,
      xcodeproj: xcodeproj
    )
  end

  desc "Set version number"
  lane :set_version do |options|
    version = options[:version]

    increment_version_number(
      version_number: version,
      xcodeproj: xcodeproj
    )
  end

  desc "Generate changelog from git commits"
  private_lane :generate_changelog do
    changelog_from_git_commits(
      pretty: "- %s",
      merge_commit_filtering: "exclude_merges"
    )
  end

  desc "Clean build artifacts"
  lane :clean do
    clear_derived_data
    sh("rm -rf ../build")
    sh("rm -rf ../TestResults")
    sh("rm -rf ../coverage")
  end

  #######################
  # Setup Lanes
  #######################

  desc "Setup project for first time"
  lane :setup do
    # Install dependencies
    sh("bundle install")

    # Install SwiftLint
    sh("brew install swiftlint")

    # Sync code signing
    sync_signing_dev

    # Open Xcode
    sh("open ../#{workspace}")
  end
end
```

### 3. Appfile

Create `apps/ios/GTSD/fastlane/Appfile`:

```ruby
# Appfile for GTSD iOS App

app_identifier("com.gtsd.app")
apple_id(ENV["FASTLANE_USER"] || "your-apple-id@example.com")
team_id(ENV["FASTLANE_TEAM_ID"] || "YOUR_TEAM_ID")

itc_team_id(ENV["FASTLANE_ITC_TEAM_ID"] || "YOUR_ITC_TEAM_ID")

# For App Store Connect API
ENV["APP_STORE_CONNECT_API_KEY_PATH"] = "./AuthKey.p8"
```

### 4. Matchfile

Create `apps/ios/GTSD/fastlane/Matchfile`:

```ruby
# Matchfile for code signing

git_url("git@github.com:your-org/certificates.git")
storage_mode("git")

type("development")
app_identifier(["com.gtsd.app"])
username(ENV["FASTLANE_USER"])

# For CI
readonly(is_ci)
```

---

## Build Configuration

### 5. Xcode Build Settings

#### Debug Configuration

```swift
// Debug.xcconfig
// Debug build configuration

// Swift Compiler - General
SWIFT_OPTIMIZATION_LEVEL = -Onone
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG

// Swift Compiler - Code Generation
SWIFT_EMIT_LOC_STRINGS = YES

// Apple Clang - Code Generation
GCC_OPTIMIZATION_LEVEL = 0
GCC_PREPROCESSOR_DEFINITIONS = DEBUG=1

// Deployment
ENABLE_TESTABILITY = YES
ONLY_ACTIVE_ARCH = YES

// Signing
CODE_SIGN_IDENTITY = Apple Development
CODE_SIGN_STYLE = Automatic
DEVELOPMENT_TEAM = YOUR_TEAM_ID

// Build Options
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
ENABLE_BITCODE = NO

// API Configuration
API_BASE_URL = http://localhost:3000
ENABLE_LOGGING = YES
```

#### Release Configuration

```swift
// Release.xcconfig
// Release build configuration

// Swift Compiler - General
SWIFT_OPTIMIZATION_LEVEL = -O
SWIFT_COMPILATION_MODE = wholemodule

// Swift Compiler - Code Generation
SWIFT_EMIT_LOC_STRINGS = NO

// Apple Clang - Code Generation
GCC_OPTIMIZATION_LEVEL = s
ENABLE_NS_ASSERTIONS = NO

// Deployment
ENABLE_TESTABILITY = NO
VALIDATE_PRODUCT = YES
ONLY_ACTIVE_ARCH = NO

// Signing
CODE_SIGN_IDENTITY = Apple Distribution
CODE_SIGN_STYLE = Manual
DEVELOPMENT_TEAM = YOUR_TEAM_ID
PROVISIONING_PROFILE_SPECIFIER = match AppStore com.gtsd.app

// Build Options
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
ENABLE_BITCODE = NO
STRIP_INSTALLED_PRODUCT = YES
STRIP_SWIFT_SYMBOLS = YES

// API Configuration
API_BASE_URL = https://api.gtsd.com
ENABLE_LOGGING = NO
```

### 6. Test Plans

#### UnitTests.xctestplan

```json
{
  "configurations": [
    {
      "id": "UNIT_TESTS",
      "name": "Unit Tests",
      "options": {
        "codeCoverage": {
          "targets": [
            {
              "containerPath": "container:GTSD.xcodeproj",
              "identifier": "GTSD",
              "name": "GTSD"
            }
          ]
        },
        "commandLineArgumentEntries": [
          {
            "argument": "-com.apple.CoreData.ConcurrencyDebug 1"
          },
          {
            "argument": "-com.apple.CoreData.SQLDebug 1"
          }
        ],
        "environmentVariableEntries": [
          {
            "key": "IS_UNIT_TEST",
            "value": "YES"
          }
        ],
        "targetForVariableExpansion": {
          "containerPath": "container:GTSD.xcodeproj",
          "identifier": "GTSD",
          "name": "GTSD"
        }
      }
    }
  ],
  "defaultOptions": {
    "testTimeoutsEnabled": true,
    "defaultTestExecutionTimeAllowance": 60,
    "maximumTestExecutionTimeAllowance": 120
  },
  "testTargets": [
    {
      "parallelizable": true,
      "target": {
        "containerPath": "container:GTSD.xcodeproj",
        "identifier": "GTSDTests",
        "name": "GTSDTests"
      }
    }
  ],
  "version": 1
}
```

#### IntegrationTests.xctestplan

```json
{
  "configurations": [
    {
      "id": "INTEGRATION_TESTS",
      "name": "Integration Tests",
      "options": {
        "codeCoverage": {
          "targets": [
            {
              "containerPath": "container:GTSD.xcodeproj",
              "identifier": "GTSD",
              "name": "GTSD"
            }
          ]
        },
        "environmentVariableEntries": [
          {
            "key": "IS_INTEGRATION_TEST",
            "value": "YES"
          },
          {
            "key": "API_BASE_URL",
            "value": "http://localhost:3000"
          }
        ]
      }
    }
  ],
  "defaultOptions": {
    "testTimeoutsEnabled": true,
    "defaultTestExecutionTimeAllowance": 120,
    "maximumTestExecutionTimeAllowance": 300
  },
  "testTargets": [
    {
      "parallelizable": false,
      "target": {
        "containerPath": "container:GTSD.xcodeproj",
        "identifier": "GTSDIntegrationTests",
        "name": "GTSDIntegrationTests"
      }
    }
  ],
  "version": 1
}
```

#### UITests.xctestplan

```json
{
  "configurations": [
    {
      "id": "UI_TESTS",
      "name": "UI Tests",
      "options": {
        "commandLineArgumentEntries": [
          {
            "argument": "--uitest-disable-animations"
          }
        ],
        "environmentVariableEntries": [
          {
            "key": "IS_UI_TEST",
            "value": "YES"
          }
        ],
        "uiTestingScreenshotsLifetime": "keepAlways"
      }
    }
  ],
  "defaultOptions": {
    "testTimeoutsEnabled": true,
    "defaultTestExecutionTimeAllowance": 180,
    "maximumTestExecutionTimeAllowance": 600
  },
  "testTargets": [
    {
      "parallelizable": false,
      "target": {
        "containerPath": "container:GTSD.xcodeproj",
        "identifier": "GTSDUITests",
        "name": "GTSDUITests"
      }
    }
  ],
  "version": 1
}
```

---

## Testing Pipeline

### 7. SwiftLint Configuration

Create `apps/ios/GTSD/.swiftlint.yml`:

```yaml
# SwiftLint Configuration for GTSD iOS App

# Rules
disabled_rules:
  - trailing_whitespace
  - todo

opt_in_rules:
  - array_init
  - attributes
  - closure_end_indentation
  - closure_spacing
  - collection_alignment
  - contains_over_filter_count
  - contains_over_filter_is_empty
  - contains_over_first_not_nil
  - contains_over_range_nil_comparison
  - discouraged_object_literal
  - empty_collection_literal
  - empty_count
  - empty_string
  - enum_case_associated_values_count
  - explicit_init
  - extension_access_modifier
  - fallthrough
  - fatal_error_message
  - file_header
  - first_where
  - flatmap_over_map_reduce
  - identical_operands
  - joined_default_parameter
  - last_where
  - legacy_multiple
  - legacy_random
  - literal_expression_end_indentation
  - lower_acl_than_parent
  - modifier_order
  - multiline_arguments
  - multiline_function_chains
  - multiline_literal_brackets
  - multiline_parameters
  - multiline_parameters_brackets
  - operator_usage_whitespace
  - overridden_super_call
  - pattern_matching_keywords
  - prefer_self_type_over_type_of_self
  - prefer_zero_over_explicit_init
  - prohibited_super_call
  - redundant_nil_coalescing
  - redundant_type_annotation
  - sorted_first_last
  - static_operator
  - strong_iboutlet
  - toggle_bool
  - unavailable_function
  - unneeded_parentheses_in_closure_argument
  - untyped_error_in_catch
  - vertical_parameter_alignment_on_call
  - vertical_whitespace_closing_braces
  - vertical_whitespace_opening_braces
  - yoda_condition

# Paths
included:
  - GTSD
  - GTSDTests
  - GTSDIntegrationTests
  - GTSDUITests

excluded:
  - Pods
  - DerivedData
  - build
  - .build

# Rules Configuration
file_length:
  warning: 500
  error: 1000

function_body_length:
  warning: 50
  error: 100

function_parameter_count:
  warning: 5
  error: 8

type_body_length:
  warning: 300
  error: 500

line_length:
  warning: 120
  error: 200
  ignores_urls: true
  ignores_function_declarations: true
  ignores_comments: true

cyclomatic_complexity:
  warning: 10
  error: 20

nesting:
  type_level:
    warning: 2
    error: 3

identifier_name:
  min_length:
    warning: 2
    error: 1
  max_length:
    warning: 60
    error: 80
  excluded:
    - id
    - URL
    - url

file_header:
  required_pattern: |
    \/\/
    \/\/ .*?\.swift
    \/\/ GTSD
    \/\/
    \/\/ Created by .* on \d{1,2}\/\d{1,2}\/\d{2}\.
    \/\/

# Custom Rules
custom_rules:
  no_print:
    name: 'No Print Statements'
    regex: "print\\("
    message: 'Use logger instead of print()'
    severity: warning

  no_force_unwrap:
    name: 'No Force Unwrapping'
    regex: "\\!(?!\\s*(as|is))"
    message: 'Avoid force unwrapping. Use optional binding instead.'
    severity: error

  no_force_try:
    name: 'No Force Try'
    regex: 'try!'
    message: 'Avoid force try. Handle errors properly.'
    severity: error

# Reporter
reporter: 'github-actions-logging'
```

### 8. Code Coverage Configuration

Create `apps/ios/GTSD/.xcovrc`:

```yaml
# xcov Configuration for Code Coverage

# Minimum coverage percentage
minimum_coverage_percentage: 80.0

# Exclude files
exclude_targets:
  - GTSDUITests.xctest
  - GTSDTests.xctest
  - GTSDIntegrationTests.xctest
  - Pods

# Include only app target
include_targets:
  - GTSD.app

# Output options
output_directory: coverage
markdown_report: true
json_report: true
html_report: true

# Coverage report options
ignore_file_path: .xcovignore
```

Create `apps/ios/GTSD/.xcovignore`:

```
# xcov ignore file

# Generated files
*.generated.swift
*+Generated.swift

# Third-party
Pods/*

# Test files
*Tests/*
*Mock*.swift
*Stub*.swift

# SwiftUI Previews
*_Previews.swift
```

---

## Deployment Pipeline

### 9. App Store Connect API Configuration

Create `apps/ios/GTSD/fastlane/AuthKey.p8.example`:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(This is an example - use your actual key from App Store Connect)
-----END PRIVATE KEY-----
```

---

## Monitoring & Reporting

### 10. Codecov Configuration

Create `apps/ios/.codecov.yml`:

```yaml
# Codecov Configuration for iOS

codecov:
  require_ci_to_pass: yes
  notify:
    wait_for_ci: yes

coverage:
  precision: 2
  round: down
  range: '70...100'

  status:
    project:
      default:
        target: 80%
        threshold: 2%
        base: auto
        if_ci_failed: error

    patch:
      default:
        target: 80%
        threshold: 2%

    changes:
      default:
        if_ci_failed: error

comment:
  layout: 'reach, diff, flags, files'
  behavior: default
  require_changes: no
  require_base: no
  require_head: yes

ignore:
  - '**/*Tests.swift'
  - '**/*Mock*.swift'
  - '**/*Stub*.swift'
  - '**/*_Previews.swift'
  - '**/Generated/**'

flags:
  ios:
    paths:
      - apps/ios/GTSD/
    carryforward: true
```

### 11. Slack Notification Template

Create `apps/ios/GTSD/fastlane/Slackfile`:

```ruby
# Slack notification configuration

module Fastlane
  module Actions
    class SlackAction
      def self.build_success_message(options)
        {
          text: "iOS Build Successful! :rocket:",
          attachments: [
            {
              color: "good",
              fields: [
                {
                  title: "Version",
                  value: options[:version],
                  short: true
                },
                {
                  title: "Build Number",
                  value: options[:build_number],
                  short: true
                },
                {
                  title: "Branch",
                  value: options[:git_branch],
                  short: true
                },
                {
                  title: "Author",
                  value: options[:git_author],
                  short: true
                },
                {
                  title: "TestFlight Link",
                  value: options[:testflight_link],
                  short: false
                }
              ]
            }
          ]
        }
      end

      def self.build_failure_message(options)
        {
          text: "iOS Build Failed :x:",
          attachments: [
            {
              color: "danger",
              fields: [
                {
                  title: "Lane",
                  value: options[:lane],
                  short: true
                },
                {
                  title: "Error",
                  value: options[:error_message],
                  short: false
                },
                {
                  title: "Build Log",
                  value: options[:build_log_url],
                  short: false
                }
              ]
            }
          ]
        }
      end

      def self.test_results_message(options)
        {
          text: "iOS Test Results",
          attachments: [
            {
              color: options[:all_tests_passed] ? "good" : "warning",
              fields: [
                {
                  title: "Total Tests",
                  value: options[:total_tests],
                  short: true
                },
                {
                  title: "Passed",
                  value: options[:passed_tests],
                  short: true
                },
                {
                  title: "Failed",
                  value: options[:failed_tests],
                  short: true
                },
                {
                  title: "Code Coverage",
                  value: "#{options[:coverage_percentage]}%",
                  short: true
                }
              ]
            }
          ]
        }
      end
    end
  end
end
```

---

## Security & Secrets Management

### 12. Required Secrets

Add these secrets to GitHub repository settings (Settings → Secrets and variables → Actions):

#### Code Signing Secrets

```bash
# Apple Certificate (Base64 encoded .p12 file)
APPLE_CERTIFICATE_BASE64
# Certificate password
APPLE_CERTIFICATE_PASSWORD
# Provisioning profile (Base64 encoded .mobileprovision)
PROVISIONING_PROFILE_BASE64

# Keychain password for CI
KEYCHAIN_PASSWORD
```

#### App Store Connect Secrets

```bash
# Apple ID for Fastlane
APPLE_ID
# App-specific password
APPLE_APP_SPECIFIC_PASSWORD

# App Store Connect API
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_API_ISSUER_ID
APP_STORE_CONNECT_API_KEY_CONTENT

# Match (code signing)
MATCH_PASSWORD
MATCH_GIT_URL
```

#### Notification Secrets

```bash
# Slack webhook
SLACK_WEBHOOK_URL

# Codecov
CODECOV_TOKEN
```

### 13. Encoding Secrets

```bash
# Encode certificate
base64 -i Certificates.p12 | pbcopy

# Encode provisioning profile
base64 -i profile.mobileprovision | pbcopy

# Encode App Store Connect API key
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

---

## Developer Workflow

### 14. Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# Run SwiftLint
if which swiftlint >/dev/null; then
  cd apps/ios/GTSD
  swiftlint lint --strict --quiet

  if [ $? -ne 0 ]; then
    echo "SwiftLint failed. Please fix the issues and try again."
    echo "Run 'swiftlint --fix' to auto-fix some issues."
    exit 1
  fi
else
  echo "SwiftLint not installed. Skipping SwiftLint check."
fi

echo "Pre-commit checks passed!"
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

### 15. PR Template

Create `.github/pull_request_template.md`:

```markdown
## Description

<!-- Describe your changes in detail -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## iOS Specific Checklist

- [ ] Code follows SwiftLint style guidelines
- [ ] Unit tests added/updated (80%+ coverage)
- [ ] Integration tests added/updated
- [ ] UI tests added/updated (if applicable)
- [ ] All tests pass locally
- [ ] No new warnings in Xcode
- [ ] Performance impact considered
- [ ] Accessibility tested with VoiceOver
- [ ] Dark mode tested
- [ ] iPhone and iPad tested (if applicable)
- [ ] Documentation updated

## Screenshots/Videos

<!-- If UI changes, add screenshots or videos -->

## Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] UI tests pass
- [ ] Manual testing completed
- [ ] Tested on iPhone SE (min device)
- [ ] Tested on iPhone 15 Pro (latest device)
- [ ] No memory leaks detected
- [ ] No performance regressions

## Code Coverage

<!-- Paste code coverage report or link -->

Current Coverage: \_\_\_%

## Reviewer Notes

<!-- Any specific areas you want reviewers to focus on -->
```

### 16. Branch Protection Rules

Configure in GitHub Settings → Branches → Add rule:

```yaml
Branch name pattern: main

Require pull request reviews before merging: ✓
  Required approving reviews: 1
  Dismiss stale pull request approvals: ✓
  Require review from Code Owners: ✓

Require status checks to pass before merging: ✓
  Required status checks:
    - SwiftLint
    - Unit Tests (iPhone 15 Pro)
    - Unit Tests (iPhone SE)
    - Integration Tests
    - UI Tests
    - Code Coverage (80%+)
    - Build for Testing

Require branches to be up to date before merging: ✓

Require linear history: ✓

Include administrators: ✓
```

---

## Setup Instructions

### 17. Initial Setup

#### Step 1: Install Dependencies

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Xcode Command Line Tools
xcode-select --install

# Install Fastlane
brew install fastlane

# Install SwiftLint
brew install swiftlint

# Install xcov (code coverage)
gem install xcov

# Install Bundler
gem install bundler
```

#### Step 2: Setup Fastlane

```bash
cd apps/ios/GTSD

# Create Gemfile
cat > Gemfile << EOF
source "https://rubygems.org"

gem "fastlane"
gem "xcov"
gem "cocoapods"
EOF

# Install gems
bundle install
```

#### Step 3: Initialize Match (Code Signing)

```bash
# Initialize match
fastlane match init

# Follow prompts:
# - Choose git storage
# - Enter git repo URL for certificates
# - Enter passphrase for encryption

# Generate certificates (development)
fastlane match development

# Generate certificates (app store)
fastlane match appstore
```

#### Step 4: Configure App Store Connect API

```bash
# Download API key from App Store Connect
# App Store Connect → Users and Access → Keys → Generate Key

# Save as AuthKey_XXXXXXXXXX.p8
# Place in fastlane/ directory

# Add to .gitignore
echo "fastlane/AuthKey_*.p8" >> .gitignore
```

#### Step 5: Setup GitHub Secrets

```bash
# Encode certificate
base64 -i Certificates.p12 > certificate.txt

# Encode provisioning profile
base64 -i profile.mobileprovision > profile.txt

# Encode API key
base64 -i AuthKey_XXXXXXXXXX.p8 > api_key.txt

# Add to GitHub Secrets (manually in GitHub UI)
# Use the contents of these .txt files
```

#### Step 6: Test CI/CD Locally

```bash
# Run tests
fastlane test_all

# Generate coverage
fastlane coverage

# Build for testing
fastlane build_for_testing

# Test beta deployment (requires valid signing)
fastlane beta --verbose
```

---

## Best Practices & Recommendations

### 18. CI/CD Best Practices

#### Performance Optimization

```yaml
# Use caching effectively
- Cache SPM packages
- Cache DerivedData
- Cache build artifacts
- Use incremental builds

# Parallelize tests
- Run unit tests in parallel
- Split UI tests across devices
- Use test sharding for large suites

# Optimize build times
- Use ccache for C/C++ code
- Enable whole module optimization
- Use build-for-testing + test-without-building
```

#### Test Quality

```yaml
# Maintain high coverage
- Aim for 80%+ code coverage
- Focus on business logic coverage
- Don't chase 100% coverage blindly

# Prevent flaky tests
- Use XCTestExpectation properly
- Disable animations in UI tests
- Use fixed dates in tests
- Mock network calls
- Avoid Thread.sleep

# Performance testing
- Measure app launch time
- Track memory usage
- Monitor API response times
- Set performance baselines
```

#### Security

```yaml
# Secret management
- Never commit secrets to git
- Rotate secrets regularly
- Use environment variables
- Encrypt sensitive files

# Code signing
- Use match for team sharing
- Store certificates in private repo
- Automate certificate renewal
- Use App Store Connect API

# API keys
- Use .xcconfig files
- Different keys per environment
- Obfuscate keys in code
- Rotate keys regularly
```

#### Version Management

```yaml
# Semantic versioning
MAJOR.MINOR.PATCH

# Build number
- Auto-increment on each build
- Use commit count or timestamp
- Keep it unique

# Version bumping
- Manual for major/minor
- Auto for patch/build
- Tag releases in git
```

#### Monitoring

```yaml
# Track metrics
- Build duration
- Test execution time
- App size
- Code coverage trends
- Crash rate (post-release)

# Alerts
- Failed builds
- Coverage drops
- Performance regressions
- Security vulnerabilities
```

### 19. Common Issues & Solutions

#### Issue: Code Signing Errors

```bash
# Solution: Refresh provisioning profiles
fastlane match nuke development
fastlane match nuke distribution
fastlane match development
fastlane match appstore
```

#### Issue: SPM Package Resolution Failures

```bash
# Solution: Clear package cache
rm -rf ~/Library/Caches/org.swift.swiftpm
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild -resolvePackageDependencies
```

#### Issue: Test Timeouts

```yaml
# Solution: Increase timeouts in test plan
'defaultTestExecutionTimeAllowance': 300,
'maximumTestExecutionTimeAllowance': 600
```

#### Issue: Build Size Too Large

```bash
# Solutions:
- Enable app thinning
- Compress assets
- Remove unused resources
- Use on-demand resources
- Optimize images
```

### 20. Maintenance Schedule

```yaml
Daily:
  - Monitor CI/CD pipelines
  - Review test results
  - Check coverage reports

Weekly:
  - Review failed builds
  - Update dependencies
  - Check security advisories
  - Review performance metrics

Monthly:
  - Rotate API keys
  - Update certificates (if needed)
  - Review and optimize build times
  - Update CI/CD configurations

Quarterly:
  - Audit security practices
  - Review and update workflows
  - Optimize test suite
  - Update documentation
```

---

## Conclusion

This comprehensive CI/CD pipeline provides:

- Automated testing on every PR
- Code quality enforcement with SwiftLint
- Code coverage tracking with Codecov
- Automated TestFlight deployments
- Slack notifications for team awareness
- Security best practices for secrets management
- Performance monitoring and benchmarking

### Key Metrics to Track

- Build success rate: > 95%
- Test execution time: < 5 minutes
- Code coverage: > 80%
- App size: < 50MB
- Deployment frequency: Daily to TestFlight

### Next Steps

1. Set up GitHub Actions workflows
2. Configure Fastlane
3. Set up code signing with Match
4. Add GitHub secrets
5. Create first PR to test pipeline
6. Monitor and optimize

The pipeline is designed to scale with your team and maintain high code quality throughout development.

---

**Generated**: 2025-10-26
**Document Version**: 1.0
**Maintained By**: iOS Development Team
