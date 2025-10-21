# TypeScript Fixes - Remaining Issues

## Summary
Fixed **major** type issues. API and shared-types compile successfully. Mobile app has ~143 remaining errors, mostly in:
- Component prop types (onboarding forms)
- Haptic feedback API usage
- Optional metadata null checks
- API response structure mismatches

## Completed Fixes ✅

1. **UserProfile.onboardingCompleted** - Added to interface in shared-types
2. **Photo type structure** - Added fileSize, mimeType, uploadedAt fields
3. **PhotoEvidenceType enum** - Fixed test usage to use PhotoEvidenceType.Before
4. **PhotoUploadStatus** - Added 'idle' state to union type
5. **Task/TaskGroup exports** - Added mobile-specific types wrapping shared-types
6. **Navigation import** - Fixed App.tsx to use correct path
7. **Unused imports** - Removed AsyncStorage, Platform, etc from multiple files
8. **WeightMetrics** - Changed to WeightLogMetrics in EvidenceForm

## Critical Remaining Issues

### 1. HapticFeedbackTypes Property Access (10 errors)
**Problem**: Code tries to access `ReactNativeHaptic.HapticFeedbackTypes.impactLight` but the type definition only exports the trigger function.

**Locations**:
- `src/components/PhotoGallery.tsx` (lines 66, 96, 108)
- `src/components/PhotoIntegration.tsx` (lines 76, 108)
- `src/components/PhotoPicker.tsx` (lines 60, 62, 63)
- `src/components/UploadProgressModal.tsx` (lines 56, 71)

**Fix**: Use string literals instead:
```typescript
// BEFORE
ReactNativeHaptic.trigger(ReactNativeHaptic.HapticFeedbackTypes.impactLight);

// AFTER
ReactNativeHaptic.trigger('impactLight');
```

### 2. Metadata Possibly Undefined (9 errors)
**Problem**: Photo.metadata is optional but code accesses it without null checks.

**Locations**:
- `src/components/PhotoGallery.tsx` (lines 135, 143, 146-148, 151, 240, 242, 244)
- `src/components/PhotoIntegration.tsx` (line 125)

**Fix**: Add optional chaining:
```typescript
// BEFORE
item.metadata.fileName

// AFTER
item.metadata?.fileName || 'Unknown'
```

### 3. FieldError Type Mismatch (11 errors)
**Problem**: React Hook Form v7+ uses nested FieldErrors type that doesn't match simple FieldError.

**Locations**: All onboarding form components:
- `FormInput.tsx`, `DatePicker.tsx`, `MultiSelect.tsx`, `Picker.tsx`, `PartnerForm.tsx`

**Fix**: Update prop types:
```typescript
// BEFORE
import { FieldError } from 'react-hook-form';
error?: FieldError;

// AFTER
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
```

### 4. GetTodayTasksResponse Structure Mismatch (6 errors)
**Problem**: todayStore expects `tasks`, `streaks`, `completionRate` properties but GetTodayTasksResponse from shared-types has different structure:
- Has: `tasksByType`, `streak`, `completionPercentage`
- Expects: `tasks`, `streaks`, `completionRate`

**Locations**:
- `src/stores/todayStore.ts` (lines 110-114, 145-149)

**Fix Options**:
A. Transform API response in the store
B. Create adapter/mapper function
C. Update mobile TodayTasksResponse type (already done, but store needs to use it)

**Recommended**: Update todayStore.ts to use the mobile TodayTasksResponse type and transform the API response:
```typescript
const result = await taskApi.getTodayTasks(queryParams);
if (result.data) {
  // Transform API response to mobile format
  const mobileResponse: TodayTasksResponse = transformApiResponse(result.data);
  set({
    taskGroups: mobileResponse.tasks,
    streaks: mobileResponse.streaks,
    // etc
  });
}
```

### 5. TaskWithEvidence Missing timeEstimate (4 errors)
**Problem**: TaskTile component expects `task.timeEstimate` but it doesn't exist on DailyTask or TaskWithEvidence.

**Locations**:
- `src/components/today/TaskTile.tsx` (lines 236, 240, 249, 255)

**Fix**: Either add timeEstimate to DailyTask in shared-types, or remove from UI:
```typescript
// Option A: Add to shared-types DailyTask interface
export interface DailyTask {
  // ... existing fields
  timeEstimate?: number; // minutes
}

// Option B: Remove from TaskTile component
// Delete lines referencing task.timeEstimate
```

### 6. Screen Component Type Issues (14 errors)
**Problem**: Onboarding screen components typed as `FC<Props>` don't match React Navigation's `ScreenComponentType`.

**Locations**: All onboarding screens in `RootNavigator.tsx`

**Fix**: Use proper navigation prop types:
```typescript
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation, route }) => {
  // component code
};
```

### 7. Missing Dependencies (2 errors)
**Problem**: Modules not installed or configured.

**Files**:
- `src/config/index.ts` - Cannot find 'react-native-config'
- `src/hooks/useAuth.ts` - Cannot find '@react-native-community/netinfo'

**Fix**:
```bash
pnpm add react-native-config @react-native-community/netinfo
# Then run pod install for iOS
cd ios && pod install
```

### 8. Date Type Issues (2 errors)
**Problem**: Code calls `.toISOString()` on value that could be string or Date.

**Fix**: Add type guard:
```typescript
const dateStr = typeof date === 'string' ? date : date.toISOString();
```

### 9. Component Prop Issues
**DatePicker.tsx**:
- `textColor` prop doesn't exist on DatePicker component - remove it
- `theme` value can be 'system' but DatePicker only accepts 'auto'/'light'/'dark' - map 'system' to 'auto'

**FormInput.tsx**:
- Empty string in style array - filter out falsy values
- `required` property on AccessibilityState doesn't exist - remove it

**MultiSelect.tsx**:
- `disabled={items.length === 0}` - React Native TouchableOpacity.disabled expects boolean, but comparing array length to 0 can give boolean OR number. Cast explicitly: `disabled={items.length === 0 ? true : false}`

### 10. Minor Issues
- Unused imports throughout (useEffect, interpolate, taskId, etc.) - remove them
- testID prop on PhotoGallery component - add to component props interface

## Next Steps

### Priority 1 (Breaking Changes)
1. Fix HapticFeedbackTypes usage (find & replace)
2. Add metadata null checks throughout
3. Fix GetTodayTasksResponse structure mismatch

### Priority 2 (Type Definitions)
4. Fix FieldError types in form components
5. Add timeEstimate to DailyTask or remove from UI
6. Fix navigation screen component types

### Priority 3 (Dependencies)
7. Install missing dependencies
8. Configure react-native-config

### Priority 4 (Cleanup)
9. Remove unused imports
10. Fix minor component prop issues

## Command to Verify

```bash
# Check mobile app only
pnpm --filter @gtsd/mobile typecheck

# Check all packages
pnpm typecheck
```

## Files Modified

### shared-types
- `/packages/shared-types/src/auth-types.ts` - Added onboardingCompleted
- `/packages/shared-types/src/photos.ts` - Added 'idle' to PhotoUploadStatus

### mobile/src
- `/apps/mobile/App.tsx` - Fixed navigation import
- `/apps/mobile/src/types/tasks.ts` - Added Task, TaskGroup, TodayTasksResponse types
- `/apps/mobile/src/api/client.ts` - Removed unused imports
- `/apps/mobile/src/components/today/EvidenceForm.tsx` - Fixed WeightLogMetrics import
- `/apps/mobile/src/components/onboarding/Picker.tsx` - Removed Platform import
- `/apps/mobile/src/components/onboarding/StepIndicator.tsx` - Removed unused imports
- `/apps/mobile/src/__tests__/photoUpload.test.tsx` - Fixed Photo mocks, added PhotoEvidenceType, removed unused params

## Estimated Time to Complete
- Priority 1: ~30 minutes
- Priority 2: ~45 minutes
- Priority 3: ~15 minutes
- Priority 4: ~15 minutes

**Total**: ~2 hours to fully resolve all errors
