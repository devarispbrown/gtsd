# React Native 0.76 Migration Checklist

**Quick reference for executing the migration plan**
**See REACT_NATIVE_MIGRATION_PLAN.md for detailed instructions**

---

## Pre-Migration ☑️

- [ ] Read full migration plan
- [ ] Backup existing projects (rename with -backup suffix)
- [ ] Ensure API backend is available for testing
- [ ] Have test accounts ready
- [ ] Block out 5-8 hours for migration

---

## Phase 1: Fresh Project ☑️

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps
mv mobile mobile-broken-0.76-backup
mv mobile-old mobile-old-0.73-backup
npx @react-native-community/cli@latest init mobile --version 0.76.9
```

- [ ] Fresh RN 0.76 project created
- [ ] iOS/Android directories generated
- [ ] Default app builds and runs

---

## Phase 2: Monorepo Setup ☑️

```bash
cd mobile
rm -rf node_modules package-lock.json
# Edit package.json: change name to "@gtsd/mobile"
```

- [ ] package.json name updated to `@gtsd/mobile`
- [ ] node_modules removed
- [ ] Ready for pnpm install

---

## Phase 3: Dependencies ☑️

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile

# Navigation
pnpm add @react-navigation/native @react-navigation/native-stack @react-navigation/stack
pnpm add react-native-screens react-native-safe-area-context react-native-gesture-handler

# State
pnpm add zustand immer @react-native-async-storage/async-storage

# Forms
pnpm add react-hook-form @hookform/resolvers zod

# API
pnpm add axios @tanstack/react-query

# Native modules
pnpm add react-native-config react-native-keychain @react-native-community/netinfo
pnpm add react-native-haptic-feedback react-native-date-picker
pnpm add @react-native-picker/picker react-native-image-picker

# Animations
pnpm add react-native-reanimated@~3.16.7

# Workspace
pnpm add @gtsd/shared-types@workspace:*

# Dev deps
pnpm add -D @babel/plugin-transform-export-namespace-from babel-plugin-module-resolver
pnpm add -D @testing-library/react-native @testing-library/jest-native
pnpm add -D eslint-config-prettier prettier
```

- [ ] All dependencies installed
- [ ] No peer dependency errors
- [ ] pnpm install successful

---

## Phase 4: Build Configuration ☑️

- [ ] Update `babel.config.js` (copy from plan)
- [ ] Update `tsconfig.json` (copy from plan)
- [ ] Update `metro.config.js` (copy from plan)
- [ ] Create `.env.example` (copy from mobile-old)
- [ ] Create `.env` (copy from .env.example)
- [ ] Update `app.json` (set scheme to "gtsd")

---

## Phase 5: Source Code ☑️

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/mobile
rm -rf src
cp -R ../mobile-old-0.73-backup/src ./src
cp ../mobile-old-0.73-backup/App.tsx ./App.tsx
cp ../mobile-old-0.73-backup/index.js ./index.js
cp ../mobile-old-0.73-backup/.eslintrc.js ./.eslintrc.js
cp ../mobile-old-0.73-backup/.prettierrc ./.prettierrc
cp ../mobile-old-0.73-backup/jest.config.js ./jest.config.js
cp ../mobile-old-0.73-backup/jest.setup.js ./jest.setup.js 2>/dev/null || true
```

- [ ] src/ directory copied
- [ ] App.tsx copied
- [ ] Config files copied
- [ ] TypeScript compiles (`pnpm typecheck`)

---

## Phase 6: Native Module Configuration ☑️

### iOS

```bash
# Create ios/.xcode.env.local
echo 'export ENVFILE=../.env' > ios/.xcode.env.local

# Update Podfile (add react-native-config pod)
# Update AppDelegate.mm (import RNCConfig)
cd ios && pod install && cd ..
```

- [ ] `.xcode.env.local` created
- [ ] Podfile updated for pnpm symlinks
- [ ] AppDelegate.mm imports RNCConfig
- [ ] `pod install` successful

### Android

- [ ] `android/app/build.gradle` has dotenv.gradle
- [ ] `android/settings.gradle` has react-native-config
- [ ] Gradle sync successful

---

## Phase 7: Breaking Changes ☑️

- [ ] Check React Navigation v7 changes
- [ ] Check Reanimated v3 compatibility in:
  - [ ] `src/components/ConfettiAnimation.tsx`
  - [ ] `src/components/StreakBar.tsx`
- [ ] Verify AsyncStorage v2 in stores
- [ ] Test all animations work

---

## Phase 8: Verification ☑️

```bash
pnpm typecheck  # TypeScript check
pnpm start      # Metro bundler
pnpm ios        # iOS build
pnpm android    # Android build
```

- [ ] TypeScript compiles with no errors
- [ ] Metro bundler starts
- [ ] iOS builds successfully
- [ ] Android builds successfully
- [ ] Hot reload works

---

## Testing Checkpoints ☑️

### ✓ Checkpoint 1: Fresh Build

- [ ] Default app launches on iOS
- [ ] Default app launches on Android
- [ ] No build errors

### ✓ Checkpoint 2: Dependencies

- [ ] `pnpm install` completes
- [ ] `pnpm typecheck` passes
- [ ] No peer dependency warnings (or acceptable)

### ✓ Checkpoint 3: Source Code

- [ ] TypeScript compiles
- [ ] Metro bundles without errors
- [ ] App launches (may crash, that's OK)

### ✓ Checkpoint 4: Native Modules

Test each module in the app:

- [ ] react-native-config loads .env values
- [ ] AsyncStorage saves/retrieves
- [ ] Keychain saves/retrieves
- [ ] NetInfo detects connection
- [ ] Haptic feedback works

### ✓ Checkpoint 5: Backend Down - Auth Resilience 🔴 CRITICAL

**Stop API backend before this test**

```bash
# Kill backend
# Restart app from fresh launch
# Time how long until Welcome screen appears
```

- [ ] Welcome screen appears within 5 seconds
- [ ] No infinite loading spinner
- [ ] Console shows timeout message
- [ ] App remains usable

**Critical code verified:**

- [ ] `authStore.ts` has 5-second timeout (lines 195-197)
- [ ] `RootNavigator.tsx` has non-blocking hydration (lines 64-79)

### ✓ Checkpoint 6: Backend Up - Full Auth Flow

**Start API backend**

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps/api
pnpm dev
```

**Test flow:**

1. [ ] Signup creates account
2. [ ] Login authenticates
3. [ ] Navigate to onboarding
4. [ ] Complete onboarding
5. [ ] Reach Today screen
6. [ ] Kill app
7. [ ] Restart app
8. [ ] Auto-login works
9. [ ] Logout
10. [ ] Redirect to Welcome

### ✓ Checkpoint 7: Navigation

- [ ] All onboarding screens accessible
- [ ] Today screen loads
- [ ] Badges screen loads
- [ ] Deep link `gtsd://today` works
- [ ] Deep link `gtsd://task/123` works
- [ ] Back button works correctly

### ✓ Checkpoint 8: State Management

- [ ] Auth store persists user
- [ ] Today store loads tasks
- [ ] Streaks store loads streak
- [ ] State survives app restart
- [ ] Logout clears persisted state

### ✓ Checkpoint 9: Full Integration

**Complete user flow:**

1. [ ] Fresh install (clear app data)
2. [ ] Sign up
3. [ ] Complete onboarding
4. [ ] View Today screen
5. [ ] Complete a task
6. [ ] View streak
7. [ ] Upload photo evidence
8. [ ] Kill app
9. [ ] Restart app
10. [ ] Verify data persists

---

## Post-Migration ☑️

- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Update documentation
- [ ] Notify team
- [ ] Run for 1 week
- [ ] Delete backup projects (after 1 week of stability)

---

## Issues Log

**Document any issues encountered during migration:**

| Issue | Phase | Resolution | Time Lost |
| ----- | ----- | ---------- | --------- |
|       |       |            |           |

---

## Rollback Plan (If Needed)

### Quick Rollback

```bash
cd /Users/devarisbrown/Code/projects/gtsd/apps
rm -rf mobile
mv mobile-broken-0.76-backup mobile
# OR
mv mobile-old-0.73-backup mobile-old
# Then try to fix the project.pbxproj issue
```

---

## Success Criteria

**Migration is successful when:**

- ✅ App builds on both iOS and Android
- ✅ Auth flow works (login, signup, logout, session persistence)
- ✅ App handles backend downtime gracefully (no hanging)
- ✅ Navigation works (all screens accessible)
- ✅ State persists correctly
- ✅ No critical console errors
- ✅ All tests pass
- ✅ Team can continue development

---

**Status**: Not Started
**Started**: ****\_\_\_****
**Completed**: ****\_\_\_****
**Total Time**: ****\_\_\_****
