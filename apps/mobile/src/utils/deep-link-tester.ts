/**
 * Deep Link Testing Utilities
 * Helper functions for testing and debugging deep links in development
 */

import { Linking, Alert } from 'react-native';

/**
 * Test deep link patterns in development
 */
export class DeepLinkTester {
  /**
   * Open a deep link for testing
   * @param url The deep link URL to test
   */
  static async openDeepLink(url: string): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Deep Link Test', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      Alert.alert('Deep Link Test Failed', String(error));
    }
  }

  /**
   * Test common deep link scenarios
   */
  static testScenarios = {
    // Basic navigation
    today: async () => await DeepLinkTester.openDeepLink('gtsd://today'),
    todayWithPending: async () => await DeepLinkTester.openDeepLink('gtsd://today?reminder=pending'),
    todayWithScroll: async () => await DeepLinkTester.openDeepLink('gtsd://today?reminder=pending&scrollToTask=true'),
    todayOverdue: async () => await DeepLinkTester.openDeepLink('gtsd://today?reminder=overdue'),

    // Task specific
    taskDetail: async (taskId = 1) => await DeepLinkTester.openDeepLink(`gtsd://task/${taskId}`),

    // Settings
    settings: async () => await DeepLinkTester.openDeepLink('gtsd://settings'),

    // Onboarding
    welcome: async () => await DeepLinkTester.openDeepLink('gtsd://welcome'),
    onboardingGoals: async () => await DeepLinkTester.openDeepLink('gtsd://onboarding/goals'),

    // Invalid links (for error testing)
    invalidPath: async () => await DeepLinkTester.openDeepLink('gtsd://nonexistent'),
    malformedUrl: async () => await DeepLinkTester.openDeepLink('gtsd:/today'), // missing slash
  };

  /**
   * Get all available deep link patterns
   */
  static getAvailableLinks(): string[] {
    return [
      'gtsd://today - Opens Today screen',
      'gtsd://today?reminder=pending - Opens Today with pending reminder',
      'gtsd://today?reminder=overdue - Opens Today with overdue reminder',
      'gtsd://today?scrollToTask=true - Opens Today and scrolls to first task',
      'gtsd://task/:id - Opens specific task detail',
      'gtsd://settings - Opens Settings screen',
      'gtsd://welcome - Opens Welcome screen',
      'gtsd://onboarding/goals - Opens Goals onboarding',
    ];
  }

  /**
   * Create a development menu for testing deep links
   */
  static showTestMenu(): void {
    Alert.alert(
      'Deep Link Test Menu',
      'Choose a deep link to test',
      [
        { text: 'Today Screen', onPress: () => void DeepLinkTester.testScenarios.today() },
        { text: 'Today (Pending)', onPress: () => void DeepLinkTester.testScenarios.todayWithPending() },
        { text: 'Today (Scroll)', onPress: () => void DeepLinkTester.testScenarios.todayWithScroll() },
        { text: 'Task Detail', onPress: () => void DeepLinkTester.testScenarios.taskDetail(1) },
        { text: 'Settings', onPress: () => void DeepLinkTester.testScenarios.settings() },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }

  /**
   * Simulate receiving a deep link (for testing without leaving the app)
   */
  static simulateDeepLink(url: string): void {
    // Emit the URL event as if it came from outside
    // This triggers the linking listener in the app
    Linking.emit('url', { url });
  }

  /**
   * Monitor deep link events
   */
  static startMonitoring(): () => void {
    const subscription = Linking.addEventListener('url', (event) => {
      if (__DEV__) {
        // In development, show an alert with the received URL
        Alert.alert(
          'Deep Link Received',
          event.url,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    });

    // Check for initial URL
    void Linking.getInitialURL();

    // Return cleanup function
    return () => {
      subscription.remove();
    };
  }
}

/**
 * CLI testing instructions
 */
export const CLI_TEST_COMMANDS = {
  ios: {
    simulator: 'npx uri-scheme open "gtsd://today" --ios',
    device: 'npx uri-scheme open "gtsd://today" --ios',
    withParams: 'npx uri-scheme open "gtsd://today?reminder=pending" --ios',
  },
  android: {
    emulator: 'npx uri-scheme open "gtsd://today" --android',
    device: 'npx uri-scheme open "gtsd://today" --android',
    adb: 'adb shell am start -W -a android.intent.action.VIEW -d "gtsd://today" com.gtsd',
  },
  expo: {
    dev: 'npx expo start --deeplink gtsd://today',
  },
};

// Export for use in development
if (__DEV__) {
  (global as { DeepLinkTester?: typeof DeepLinkTester; testDeepLink?: (url: string) => Promise<void> }).DeepLinkTester = DeepLinkTester;
  (global as { DeepLinkTester?: typeof DeepLinkTester; testDeepLink?: (url: string) => Promise<void> }).testDeepLink = (url: string) => DeepLinkTester.openDeepLink(url);
}