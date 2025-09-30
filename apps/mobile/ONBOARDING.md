# GTSD Mobile Onboarding Flow

## Overview
A comprehensive multi-step onboarding wizard for React Native with progressive validation, state persistence, and accessibility support.

## Features

### 8-Step Onboarding Process
1. **Welcome** - Introduction to GTSD with feature highlights
2. **Account Basics** - Date of birth and gender collection
3. **Goals** - Primary health goal, target weight, and target date
4. **Health Metrics** - Current weight and height with BMI calculation
5. **Activity Level** - Current activity level selection with tips
6. **Preferences** - Dietary preferences, allergies, and meal frequency
7. **Partners** - Add up to 5 accountability partners
8. **Review** - Review and edit all information before submission

### Technical Implementation

#### State Management
- **react-hook-form** for form management with real-time validation
- **zod** schemas for type-safe validation
- **AsyncStorage** for progress persistence
- Resume capability from any step

#### Accessibility (WCAG AA Compliant)
- Proper ARIA roles and labels
- Screen reader announcements
- High contrast color ratios (4.5:1 minimum)
- Keyboard navigation support
- Focus management

#### UI Components
- **StepIndicator** - Visual progress with dots and percentage
- **FormInput** - Accessible text input with validation
- **DatePicker** - Native date selection with platform-specific UI
- **Picker** - Single select dropdown with descriptions
- **MultiSelect** - Multiple selection with chip display
- **PartnerCard** - Display and manage accountability partners

#### Animations
- React Native Reanimated for smooth transitions
- Spring animations for progress indicators
- Slide animations between screens

## File Structure

```
apps/mobile/src/
├── screens/onboarding/
│   ├── WelcomeScreen.tsx
│   ├── AccountBasicsScreen.tsx
│   ├── GoalsScreen.tsx
│   ├── HealthMetricsScreen.tsx
│   ├── ActivityLevelScreen.tsx
│   ├── PreferencesScreen.tsx
│   ├── PartnersScreen.tsx
│   ├── ReviewScreen.tsx
│   └── HowItWorksScreen.tsx
├── components/onboarding/
│   ├── StepIndicator.tsx
│   ├── FormInput.tsx
│   ├── DatePicker.tsx
│   ├── Picker.tsx
│   ├── MultiSelect.tsx
│   ├── PartnerCard.tsx
│   └── index.ts
├── hooks/
│   └── useOnboarding.ts
├── types/
│   └── onboarding.ts
└── utils/
    └── onboardingValidation.ts
```

## Usage

### Starting the Onboarding
The app currently starts with the Welcome screen. To change this:

```typescript
// In RootNavigator.tsx
const initialRouteName = 'Welcome'; // Change to 'Today' for main app
```

### Accessing Onboarding Data
```typescript
import { useOnboarding } from '@hooks/useOnboarding';

const MyComponent = () => {
  const {
    data,           // Current form data
    currentStep,    // Current step
    progress,       // Percentage complete
    submitOnboarding // Submit to API
  } = useOnboarding();
};
```

### API Integration
Update the API endpoint in `useOnboarding.ts`:

```typescript
// Replace with your actual API endpoint
const response = await fetch('http://localhost:3000/v1/onboarding', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Add auth token if needed
  },
  body: JSON.stringify(apiData),
});
```

## Validation Rules

### Account Basics
- **Age**: 13-120 years
- **Gender**: Required selection

### Goals
- **Primary Goal**: 3-200 characters
- **Target Weight**: 30-300 kg
- **Target Date**: Future date within 2 years

### Health Metrics
- **Current Weight**: 30-300 kg
- **Height**: 100-250 cm
- **BMI**: Automatically calculated and categorized

### Activity Level
- 5 levels from sedentary to extremely active
- Each level includes personalized tips

### Preferences
- **Dietary**: At least 1, maximum 5 selections
- **Allergies**: Free text, comma-separated
- **Meals**: 1-6 meals per day

### Partners
- Maximum 5 partners
- Name required
- Either email or phone required
- Relationship type required

## Testing

### Run TypeScript checks
```bash
pnpm run typecheck
```

### Run tests
```bash
pnpm run test
```

### Check accessibility
The app includes built-in accessibility features. Test with:
- iOS: VoiceOver
- Android: TalkBack

## Future Enhancements

1. **Biometric Integration** - Use device biometrics for secure storage
2. **Photo Upload** - Allow profile picture and progress photos
3. **Social Login** - OAuth integration for faster signup
4. **Localization** - Multi-language support
5. **Analytics** - Track drop-off points and optimize flow
6. **A/B Testing** - Test different onboarding variations
7. **Coach Matching** - AI-powered coach recommendations
8. **Community Features** - Connect with similar users

## Dependencies

- react-hook-form: ^7.63.0
- zod: ^3.25.76
- @hookform/resolvers: ^5.2.2
- react-native-reanimated: ^4.1.2
- react-native-date-picker: ^5.0.13
- @react-native-picker/picker: ^2.11.2
- @react-native-async-storage/async-storage: ^1.21.0

## Notes for Production

1. **API Endpoint**: Update the hardcoded localhost URL
2. **Error Handling**: Implement retry logic for network failures
3. **Analytics**: Add tracking for user behavior
4. **Performance**: Consider lazy loading for heavy screens
5. **Security**: Implement encryption for sensitive data
6. **Offline Support**: Queue API calls when offline
7. **Deep Linking**: Support resuming from email/push notifications