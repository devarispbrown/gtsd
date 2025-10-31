# GTSD iOS CI/CD - Quick Setup Guide

## Overview

This guide will help you set up the complete CI/CD pipeline for the GTSD iOS app in under 30 minutes.

---

## Prerequisites Checklist

- [ ] macOS with Xcode 15.2+ installed
- [ ] GitHub account with repository access
- [ ] Apple Developer account (paid)
- [ ] App Store Connect access
- [ ] Slack workspace (optional, for notifications)

---

## Part 1: Local Development Setup (10 minutes)

### Step 1: Install Required Tools

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install development tools
brew install fastlane swiftlint cocoapods

# Install Ruby gems
sudo gem install bundler xcov
```

### Step 2: Create iOS Project Structure

```bash
# Navigate to project root
cd apps

# Create iOS project directory
mkdir -p ios/GTSD

# Create Fastlane directory
mkdir -p ios/GTSD/fastlane
```

### Step 3: Create Gemfile

Create `apps/ios/GTSD/Gemfile`:

```ruby
source "https://rubygems.org"

gem "fastlane"
gem "xcov"
gem "cocoapods"
```

Install gems:

```bash
cd apps/ios/GTSD
bundle install
```

### Step 4: Create SwiftLint Configuration

Create `apps/ios/GTSD/.swiftlint.yml`:

```yaml
disabled_rules:
  - trailing_whitespace

opt_in_rules:
  - empty_count
  - empty_string

included:
  - GTSD

excluded:
  - Pods
  - DerivedData

line_length:
  warning: 120
  error: 200

file_length:
  warning: 500
  error: 1000

function_body_length:
  warning: 50
  error: 100

reporter: 'github-actions-logging'
```

---

## Part 2: Code Signing Setup (15 minutes)

### Step 1: Create Apple Certificates

1. Log in to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create certificates:
   - **Development**: iOS App Development
   - **Distribution**: iOS Distribution

### Step 2: Create App Identifier

1. In Apple Developer Portal, go to **Identifiers**
2. Click **+** to create new App ID
3. Configure:
   - **Description**: GTSD iOS App
   - **Bundle ID**: `com.gtsd.app` (explicit)
   - **Capabilities**: Push Notifications, Sign in with Apple

### Step 3: Create Provisioning Profiles

1. Go to **Profiles** in Apple Developer Portal
2. Create profiles:
   - **Development**: iOS App Development
   - **App Store**: App Store Distribution

### Step 4: Setup Match (Recommended)

```bash
cd apps/ios/GTSD

# Initialize match
fastlane match init

# Choose "git" as storage mode
# Enter private Git repository URL (create one first)
# Example: git@github.com:your-org/ios-certificates.git
```

Create `.env` file for match passphrase:

```bash
# apps/ios/GTSD/.env
MATCH_PASSWORD=YourSecurePassphraseHere
```

Generate certificates:

```bash
# Development certificates
fastlane match development

# App Store certificates
fastlane match appstore
```

---

## Part 3: App Store Connect API Setup (5 minutes)

### Step 1: Create API Key

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **Users and Access** → **Keys**
3. Click **+** to generate new API key
4. Configure:
   - **Name**: GitHub Actions CI/CD
   - **Access**: Admin or App Manager
5. Download the `.p8` file (save as `AuthKey_XXXXXXXXXX.p8`)
6. Note the **Key ID** and **Issuer ID**

### Step 2: Save API Key

```bash
# Save in fastlane directory (DO NOT COMMIT)
mv ~/Downloads/AuthKey_*.p8 apps/ios/GTSD/fastlane/

# Add to .gitignore
echo "fastlane/AuthKey_*.p8" >> apps/ios/GTSD/.gitignore
echo "fastlane/.env" >> apps/ios/GTSD/.gitignore
```

---

## Part 4: GitHub Setup (15 minutes)

### Step 1: Encode Secrets

```bash
# Navigate to where you saved certificates
cd /path/to/certificates

# Encode development certificate
base64 -i development.p12 | pbcopy
# Save this output for APPLE_CERTIFICATE_BASE64

# Encode provisioning profile
base64 -i development.mobileprovision | pbcopy
# Save this output for PROVISIONING_PROFILE_BASE64

# Encode App Store Connect API key
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
# Save this output for APP_STORE_CONNECT_API_KEY_CONTENT
```

### Step 2: Add GitHub Secrets

1. Go to GitHub repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

#### Required Secrets

| Secret Name                         | Description                     | How to Get                          |
| ----------------------------------- | ------------------------------- | ----------------------------------- |
| `APPLE_CERTIFICATE_BASE64`          | Base64 encoded .p12 certificate | Encode your development certificate |
| `APPLE_CERTIFICATE_PASSWORD`        | Certificate password            | Password used when creating .p12    |
| `PROVISIONING_PROFILE_BASE64`       | Base64 encoded .mobileprovision | Encode your provisioning profile    |
| `KEYCHAIN_PASSWORD`                 | Temporary keychain password     | Generate a secure random password   |
| `APPLE_ID`                          | Your Apple ID email             | Your Apple Developer account email  |
| `APPLE_APP_SPECIFIC_PASSWORD`       | App-specific password           | Generate at appleid.apple.com       |
| `APP_STORE_CONNECT_API_KEY_ID`      | API Key ID                      | From App Store Connect              |
| `APP_STORE_CONNECT_API_ISSUER_ID`   | Issuer ID                       | From App Store Connect              |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | Base64 encoded .p8 key          | Encode your API key file            |

#### Optional Secrets

| Secret Name         | Description                        |
| ------------------- | ---------------------------------- |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications    |
| `CODECOV_TOKEN`     | Codecov token for coverage reports |
| `MATCH_PASSWORD`    | Match encryption password          |

### Step 3: Generate App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Navigate to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Label it "GitHub Actions CI/CD"
6. Save the generated password as `APPLE_APP_SPECIFIC_PASSWORD`

### Step 4: Setup Branch Protection

1. Go to **Settings** → **Branches**
2. Add branch protection rule for `main`:
   - ✅ Require pull request reviews (1 approval)
   - ✅ Require status checks to pass before merging
   - ✅ Required status checks:
     - `SwiftLint`
     - `Unit Tests`
     - `Integration Tests`
     - `UI Tests`
     - `Code Coverage`
     - `Build for Testing`
   - ✅ Require branches to be up to date

---

## Part 5: Codecov Setup (Optional, 5 minutes)

### Step 1: Sign Up for Codecov

1. Go to [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add your repository

### Step 2: Get Codecov Token

1. In Codecov dashboard, select your repository
2. Go to **Settings** → **General**
3. Copy the **Upload Token**
4. Add to GitHub Secrets as `CODECOV_TOKEN`

### Step 3: Create Codecov Configuration

Create `apps/ios/.codecov.yml`:

```yaml
codecov:
  require_ci_to_pass: yes

coverage:
  precision: 2
  round: down
  range: '70...100'

  status:
    project:
      default:
        target: 80%
        threshold: 2%

ignore:
  - '**/*Tests.swift'
  - '**/*Mock*.swift'
  - '**/*_Previews.swift'

flags:
  ios:
    paths:
      - apps/ios/GTSD/
```

---

## Part 6: Slack Notifications Setup (Optional, 5 minutes)

### Step 1: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name: "GitHub CI/CD Bot"
4. Select your workspace

### Step 2: Enable Incoming Webhooks

1. In app settings, go to **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to **On**
3. Click **Add New Webhook to Workspace**
4. Select channel (e.g., `#ios-builds`)
5. Copy the webhook URL

### Step 3: Add to GitHub Secrets

Add webhook URL as `SLACK_WEBHOOK_URL`

---

## Part 7: Create Fastlane Configuration

### Create Fastfile

Create `apps/ios/GTSD/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Run all tests"
  lane :test_all do
    run_tests(
      workspace: "GTSD.xcworkspace",
      scheme: "GTSD",
      devices: ["iPhone 15 Pro"],
      code_coverage: true
    )
  end

  desc "Deploy to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "GTSD.xcodeproj")

    build_app(
      workspace: "GTSD.xcworkspace",
      scheme: "GTSD",
      export_method: "app-store"
    )

    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      distribute_external: false
    )
  end
end
```

### Create Appfile

Create `apps/ios/GTSD/fastlane/Appfile`:

```ruby
app_identifier("com.gtsd.app")
apple_id(ENV["APPLE_ID"])
team_id(ENV["FASTLANE_TEAM_ID"])
```

---

## Part 8: Test the Pipeline

### Step 1: Create Test PR

```bash
# Create feature branch
git checkout -b feature/setup-ci-cd

# Make a small change
echo "# CI/CD Setup Complete" >> apps/ios/README.md

# Commit and push
git add .
git commit -m "Setup iOS CI/CD pipeline"
git push origin feature/setup-ci-cd
```

### Step 2: Monitor Pipeline

1. Go to GitHub repository
2. Navigate to **Actions** tab
3. Watch the workflow run
4. Verify all checks pass

### Step 3: Test Locally

```bash
cd apps/ios/GTSD

# Test SwiftLint
swiftlint lint

# Test unit tests
fastlane test_unit

# Test coverage
fastlane coverage
```

---

## Troubleshooting

### Common Issues

#### Issue: "No such module" errors

**Solution:**

```bash
# Clean and rebuild
cd apps/ios/GTSD
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild -resolvePackageDependencies
```

#### Issue: Code signing errors

**Solution:**

```bash
# Re-sync certificates
fastlane match nuke development
fastlane match nuke distribution
fastlane match development
fastlane match appstore
```

#### Issue: Tests timeout

**Solution:** Increase timeout in test plans:

```json
{
  "defaultTestExecutionTimeAllowance": 300,
  "maximumTestExecutionTimeAllowance": 600
}
```

#### Issue: GitHub Actions stuck

**Solution:** Check runner logs and secrets are correctly set:

```bash
# Verify secret encoding
echo "YOUR_SECRET" | base64
```

---

## Verification Checklist

After setup, verify everything works:

- [ ] Local SwiftLint runs without errors
- [ ] Unit tests pass locally
- [ ] Integration tests pass locally
- [ ] UI tests pass locally
- [ ] GitHub Actions workflow runs successfully
- [ ] All status checks pass on PR
- [ ] Code coverage reports are generated
- [ ] Slack notifications work (if configured)
- [ ] TestFlight deployment works (on main branch)

---

## Next Steps

1. **Create Test Plans**
   - Create `UnitTests.xctestplan`
   - Create `IntegrationTests.xctestplan`
   - Create `UITests.xctestplan`
   - Create `PerformanceTests.xctestplan`

2. **Write First Tests**
   - Add unit tests for core functionality
   - Add integration tests for API calls
   - Add UI tests for critical flows

3. **Configure Performance Monitoring**
   - Set performance baselines
   - Track app launch time
   - Monitor memory usage

4. **Setup Analytics**
   - Integrate crash reporting
   - Add analytics tracking
   - Monitor key metrics

---

## Maintenance

### Weekly Tasks

- [ ] Review failed builds
- [ ] Update dependencies
- [ ] Check security advisories
- [ ] Review code coverage trends

### Monthly Tasks

- [ ] Rotate API keys (if needed)
- [ ] Update certificates (if expiring)
- [ ] Review and optimize build times
- [ ] Update documentation

### Quarterly Tasks

- [ ] Audit security practices
- [ ] Review and update workflows
- [ ] Optimize test suite
- [ ] Update CI/CD tools

---

## Support

For issues or questions:

1. Check the [CI/CD Pipeline Documentation](/apps/IOS_CICD_PIPELINE.md)
2. Review GitHub Actions logs
3. Check Fastlane logs: `fastlane/logs`
4. Contact the iOS team

---

## Additional Resources

- [Fastlane Documentation](https://docs.fastlane.tools)
- [GitHub Actions for iOS](https://docs.github.com/en/actions/guides/building-and-testing-xamarin-applications)
- [Apple Developer Documentation](https://developer.apple.com/documentation)
- [SwiftLint Documentation](https://github.com/realm/SwiftLint)
- [Codecov Documentation](https://docs.codecov.com)

---

**Setup Time**: ~45 minutes
**Difficulty**: Intermediate
**Maintained By**: iOS Development Team
**Last Updated**: 2025-10-26
