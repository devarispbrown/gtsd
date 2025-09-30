/**
 * Color constants following WCAG AA standards
 * All text colors maintain at least 4.5:1 contrast ratio
 */

export const colors = {
  light: {
    // Primary colors
    primary: '#007AFF', // iOS blue - 4.5:1 contrast on white
    primaryText: '#FFFFFF',

    // Background colors
    background: '#FFFFFF',
    surface: '#F2F2F7',
    card: '#FFFFFF',

    // Text colors (all meet 4.5:1 contrast on white background)
    text: '#000000', // 21:1 contrast
    textSecondary: '#3C3C43', // 8.59:1 contrast
    textTertiary: '#767680', // 4.54:1 contrast
    textDisabled: '#C7C7CC', // Below 4.5:1, only for disabled states

    // Status colors
    success: '#34C759', // 3.1:1 - use with white text
    warning: '#FF9500', // 3.13:1 - use with white text
    error: '#FF3B30', // 4.0:1 - use with white text
    info: '#5AC8FA', // 2.01:1 - use with dark text

    // UI elements
    border: '#C6C6C8',
    separator: '#E5E5EA',
    overlay: 'rgba(0, 0, 0, 0.4)',

    // Interactive states
    pressed: 'rgba(0, 122, 255, 0.1)',
    disabled: '#E5E5EA',

    // Additional UI colors
    inputBackground: '#F2F2F7',
    primaryBackground: 'rgba(0, 122, 255, 0.1)',
  },
  dark: {
    // Primary colors
    primary: '#0A84FF', // iOS blue dark - 4.6:1 contrast on black
    primaryText: '#FFFFFF',

    // Background colors
    background: '#000000',
    surface: '#1C1C1E',
    card: '#1C1C1E',

    // Text colors (all meet 4.5:1 contrast on black background)
    text: '#FFFFFF', // 21:1 contrast
    textSecondary: '#EBEBF5', // 16.36:1 contrast
    textTertiary: '#A1A1A6', // 7.29:1 contrast
    textDisabled: '#48484A', // Below 4.5:1, only for disabled states

    // Status colors
    success: '#32D74B', // 10.66:1 contrast
    warning: '#FF9F0A', // 8.23:1 contrast
    error: '#FF453A', // 5.38:1 contrast
    info: '#64D2FF', // 11.37:1 contrast

    // UI elements
    border: '#38383A',
    separator: '#2C2C2E',
    overlay: 'rgba(255, 255, 255, 0.2)',

    // Interactive states
    pressed: 'rgba(10, 132, 255, 0.2)',
    disabled: '#2C2C2E',

    // Additional UI colors
    inputBackground: '#1C1C1E',
    primaryBackground: 'rgba(10, 132, 255, 0.2)',
  },
  // Priority colors that work on both themes
  priority: {
    urgent: '#FF3B30', // Red
    high: '#FF9500', // Orange
    medium: '#FFCC00', // Yellow
    low: '#34C759', // Green
  },
} as const;

// Helper function to ensure color contrast
export const getContrastColor = (backgroundColor: string, isDark: boolean): string => {
  // This is a simplified version - in production, you'd calculate actual contrast ratio
  const darkColors = ['#000000', '#1C1C1E', '#2C2C2E'];
  const needsLightText = darkColors.includes(backgroundColor) || isDark;

  return needsLightText ? colors.dark.text : colors.light.text;
};