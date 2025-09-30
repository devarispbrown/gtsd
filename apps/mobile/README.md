# GTSD Mobile App

A production-ready React Native + TypeScript mobile application with accessibility-first design, state management, and comprehensive testing.

## Features

- ✅ **TypeScript** with strict mode enabled
- ✅ **React Navigation** for navigation
- ✅ **Zustand** for state management with persistence
- ✅ **Accessibility** best practices (WCAG AA compliant)
- ✅ **Jest** testing setup with React Native Testing Library
- ✅ **Dark mode** support with system preference detection
- ✅ **Production-ready** architecture and patterns

## Project Structure

```
apps/mobile/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── store/           # Zustand stores
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # App constants (colors, themes, etc.)
│   └── utils/           # Utility functions
├── __tests__/           # Test files
├── android/             # Android-specific code
├── ios/                 # iOS-specific code
├── App.tsx              # Main app component
├── index.js             # App entry point
└── package.json         # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js >= 18
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Install iOS pods:

```bash
cd ios && pod install
```

### Running the App

**iOS:**

```bash
npm run ios
# or
yarn ios
```

**Android:**

```bash
npm run android
# or
yarn android
```

**Metro Bundler:**

```bash
npm start
# or
yarn start
```

## Development

### Type Checking

```bash
npm run type-check
# or
yarn type-check
```

### Linting

```bash
npm run lint
# or
yarn lint
```

### Testing

```bash
# Run tests
npm test
# or
yarn test

# Run tests in watch mode
npm run test:watch
# or
yarn test:watch

# Generate coverage report
npm run test:coverage
# or
yarn test:coverage
```

## Accessibility Features

The app follows WCAG AA standards and includes:

- **Minimum tap targets**: 44x44 points for all interactive elements
- **Color contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Screen reader support**: Comprehensive accessibility labels and hints
- **Keyboard navigation**: Full keyboard support for all features
- **Reduced motion**: Respects system preferences for animations
- **Dark mode**: System-aware theme switching

### Testing Accessibility

**iOS (VoiceOver):**

- Settings > Accessibility > VoiceOver

**Android (TalkBack):**

- Settings > Accessibility > TalkBack

## Architecture

### State Management

The app uses Zustand for state management with the following stores:

- **taskStore**: Manages task data and operations
- **themeStore**: Handles theme preferences and dark mode

### Navigation

React Navigation with a native stack navigator provides smooth, native navigation transitions.

### Components

All components follow these principles:

- TypeScript for type safety
- Accessibility-first design
- Responsive to system theme
- Minimum tap target sizes
- Proper color contrast ratios

## Scripts

- `start`: Start Metro bundler
- `ios`: Run on iOS simulator
- `android`: Run on Android emulator
- `test`: Run Jest tests
- `test:watch`: Run tests in watch mode
- `test:coverage`: Generate test coverage report
- `lint`: Run ESLint
- `type-check`: Run TypeScript compiler checks
- `clean`: Clean build artifacts
- `reset-cache`: Clear Metro bundler cache

## Contributing

1. Follow the TypeScript strict mode guidelines
2. Ensure all components have proper accessibility attributes
3. Write tests for new features
4. Maintain minimum 80% test coverage
5. Follow the existing code style and patterns

## Performance Optimization

- Lazy loading for screens
- Memoization for expensive computations
- FlatList for efficient list rendering
- Image optimization and caching
- Bundle size optimization

## Security Considerations

- Secure storage for sensitive data
- Input validation and sanitization
- Network request security
- Certificate pinning (for production)
- Code obfuscation (for production builds)

## License

Private - All rights reserved
