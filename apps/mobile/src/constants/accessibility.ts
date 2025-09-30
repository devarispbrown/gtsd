/**
 * Accessibility constants and helpers
 * Following iOS and Android accessibility guidelines
 */

export const accessibility = {
  // Minimum tap target sizes (in points/dp)
  minTapSize: {
    width: 44,
    height: 44,
  },

  // Hit slop for increasing touch target without visual changes
  defaultHitSlop: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  },

  // Contrast ratios (WCAG AA standard)
  contrastRatios: {
    normalText: 4.5,
    largeText: 3,
    nonText: 3,
  },

  // Font sizes for readability
  fontSize: {
    minimum: 12,
    body: 16,
    large: 18,
    title: 24,
    largeTitle: 34,
  },

  // Animation durations for users who prefer reduced motion
  animationDuration: {
    normal: 300,
    reduced: 0,
  },
};

/**
 * Helper to create accessible touchable props
 */
export const getAccessibleTouchableProps = (
  label: string,
  role: 'button' | 'link' | 'tab' | 'none' = 'button',
  hint?: string
) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityRole: role,
  accessibilityHint: hint,
  accessibilityState: {},
  hitSlop: accessibility.defaultHitSlop,
});

/**
 * Helper to announce screen reader messages
 */
export const announceForAccessibility = (message: string) => {
  // This would use react-native's AccessibilityInfo.announceForAccessibility
  // Placeholder for the actual implementation
  console.log(`Screen reader announcement: ${message}`);
};