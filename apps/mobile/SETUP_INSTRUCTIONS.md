# GTSD Mobile App - Dependency Setup Instructions

## Overview
This document provides setup instructions for the React Native dependencies that were just installed for the GTSD mobile app.

## Dependencies Installed

### 1. react-native-config (v1.5.9)
**Purpose:** Environment variable management for React Native apps
**Used in:** `src/config/index.ts`

#### iOS Setup
After installing the npm package, you need to:

```bash
cd ios && pod install
```

Additional iOS configuration:
1. Add a new Run Script Phase in your Xcode project:
   - Select your project in Xcode
   - Go to Build Phases > + > New Run Script Phase
   - Add the following script:
   ```bash
   "${SRCROOT}/../node_modules/react-native-config/ios/ReactNativeConfig/BuildXCConfig.rb" "${SRCROOT}/.." "${SRCROOT}/tmp.xcconfig"
   ```
   - Make sure this script runs BEFORE "Compile Sources"

2. For Info.plist configuration, you can access variables using:
   ```xml
   <key>CFBundleDisplayName</key>
   <string>$(APP_DISPLAY_NAME)</string>
   ```

#### Android Setup
The package should auto-link with React Native 0.60+, but if you need manual configuration:

1. Add to `android/settings.gradle`:
   ```gradle
   include ':react-native-config'
   project(':react-native-config').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-config/android')
   ```

2. Add to `android/app/build.gradle`:
   ```gradle
   apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
   ```

### 2. @react-native-community/netinfo (v11.4.1)
**Purpose:** Network status detection and monitoring
**Used in:** `src/hooks/useAuth.ts`

#### iOS Setup
```bash
cd ios && pod install
```

No additional configuration needed for iOS.

#### Android Setup
The package should auto-link. If you need specific network permissions, add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 3. react-native-keychain (v10.0.0)
**Purpose:** Secure storage for authentication tokens using iOS Keychain and Android Keystore
**Used in:** `src/utils/secureStorage.ts`

#### iOS Setup
```bash
cd ios && pod install
```

Optional: Configure Keychain Sharing (if needed for app extensions):
1. Open your project in Xcode
2. Select your app target
3. Go to Capabilities tab
4. Enable "Keychain Sharing"
5. Add keychain group (e.g., "group.com.yourcompany.gtsd")

#### Android Setup
The package should auto-link. For additional security configurations:

1. (Optional) Enable Proguard/R8 minification in `android/app/build.gradle`:
   ```gradle
   buildTypes {
       release {
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```

2. Add to `android/app/proguard-rules.pro`:
   ```
   -keep class com.oblador.keychain.** { *; }
   ```

## Environment Configuration

A `.env` file has been created in the mobile app directory. Update it with your environment-specific values:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api  # Update for your environment

# For Android Emulator use:
# REACT_APP_API_URL=http://10.0.2.2:3000/api

# For iOS Simulator use:
# REACT_APP_API_URL=http://localhost:3000/api

# For production:
# REACT_APP_API_URL=https://api.gtsd.app/api
```

## Platform-Specific Setup Commands

### iOS Development
```bash
# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Clean build
cd ios && xcodebuild clean && cd ..

# Run iOS app
pnpm ios
# or
npx react-native run-ios
```

### Android Development
```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Run Android app
pnpm android
# or
npx react-native run-android

# For Android release builds
cd android && ./gradlew assembleRelease
```

## Verification Steps

1. **Verify react-native-config is working:**
   ```typescript
   import Config from 'react-native-config';
   console.log('API URL:', Config.REACT_APP_API_URL);
   ```

2. **Verify netinfo is working:**
   ```typescript
   import NetInfo from '@react-native-community/netinfo';

   NetInfo.fetch().then(state => {
     console.log("Connection type:", state.type);
     console.log("Is connected?", state.isConnected);
   });
   ```

3. **Verify keychain is working:**
   ```typescript
   import * as Keychain from 'react-native-keychain';

   // Store credentials
   await Keychain.setInternetCredentials(
     'com.gtsd.app',
     'username',
     'password'
   );

   // Retrieve credentials
   const credentials = await Keychain.getInternetCredentials('com.gtsd.app');
   console.log('Credentials:', credentials);
   ```

## Troubleshooting

### iOS Issues
- **Pod install fails:** Try `cd ios && pod deintegrate && pod install`
- **Build fails after installation:** Clean build folder in Xcode (Cmd+Shift+K)
- **react-native-config not working:** Ensure the Build Script Phase is added and runs before "Compile Sources"

### Android Issues
- **Build fails:** Try `cd android && ./gradlew clean && cd .. && pnpm android`
- **Auto-linking issues:** Try `npx react-native unlink <package-name>` then `npx react-native link <package-name>`
- **Keychain crashes on older Android:** The library requires Android 6.0+ (API 23+)

### General Issues
- **Metro bundler cache:** Run `pnpm reset-cache` or `npx react-native start --reset-cache`
- **Node modules issues:** Delete `node_modules` and reinstall with `pnpm install`

## Security Considerations

1. **Never commit `.env` files** - The `.env` file has been created but should not be committed to version control
2. **Use different keys for different environments** - Separate development, staging, and production credentials
3. **Enable certificate pinning in production** - Already configured in `src/config/index.ts` for production builds
4. **Test biometric authentication** - The keychain library supports biometric authentication when available

## Next Steps

After completing the platform-specific setup:

1. Run `pnpm ios` or `pnpm android` to build and run the app
2. Verify all imports resolve correctly in your IDE
3. Test authentication flow with secure storage
4. Test network status detection during auth token refresh
5. Ensure environment variables load correctly from `.env`

## Additional Resources

- [react-native-config Documentation](https://github.com/luggit/react-native-config)
- [NetInfo Documentation](https://github.com/react-native-netinfo/react-native-netinfo)
- [Keychain Documentation](https://github.com/oblador/react-native-keychain)
- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)